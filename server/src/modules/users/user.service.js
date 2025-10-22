import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import {
  findAllUsers,
  findUserById,
  findUserByUsername,
  insertUser,
  updateUserRole,
} from "./user.repository.js";
import { createHttpError } from "../../utils/http-error.js";
import { ensureProfileForUser, getProfileByUsername } from "../profile/profile.repository.js";
import { DEFAULT_AVATAR_URL, DEFAULT_COVER_URL } from "../../constants/media.js";
import { DEFAULT_USER_ROLE, isValidUserRole, USER_ROLES } from "../../constants/roles.js";
import { env } from "../../config/env.js";

const SALT_ROUNDS = 10;

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

export function toPublicUser(user) {
  const { passwordHash, usernameLower, ...rest } = user;
  return rest;
}

export async function createUser({ username, password, displayName, gender, role = DEFAULT_USER_ROLE }) {
  const usernameLower = normalizeUsername(username);

  const existing = await findUserByUsername(usernameLower);
  if (existing) {
    throw createHttpError(409, "Пользователь с таким логином уже существует.");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const normalizedRole = isValidUserRole(role) ? role : DEFAULT_USER_ROLE;
  const now = new Date().toISOString();
  const user = {
    id: randomUUID(),
    username,
    usernameLower,
    displayName,
    gender,
    passwordHash,
    role: normalizedRole,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const saved = await insertUser(user);
    await ensureProfileForUser(saved.id);
    return toPublicUser(saved);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      throw createHttpError(409, "Пользователь с таким логином уже существует.");
    }
    throw error;
  }
}

export async function verifyUserCredentials(username, password) {
  const user = await findUserByUsername(normalizeUsername(username));
  if (!user) {
    throw createHttpError(401, "Неверный логин или пароль.");
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw createHttpError(401, "Неверный логин или пароль.");
  }

  await ensureProfileForUser(user.id);

  return toPublicUser(user);
}

export async function getUserById(id) {
  const user = await findUserById(id);
  if (!user) {
    throw createHttpError(404, "Пользователь не найден.");
  }
  return toPublicUser(user);
}

export async function getUserWithProfile(usernameLower) {
  const profile = await getProfileByUsername(usernameLower);
  if (!profile) {
    throw createHttpError(404, "Пользователь не найден.");
  }
  return profile;
}

function defaultStats() {
  return {
    followers: 0,
    following: 0,
    posts: 0,
    unreadNotifications: 0,
  };
}

export async function listUsers({ search, limit = 12, offset = 0 } = {}) {
  const allUsers = await findAllUsers();

  const normalizedSearch = typeof search === "string" ? search.trim().toLowerCase() : "";
  const filtered = normalizedSearch
    ? allUsers.filter((user) => {
        const usernameMatch = user.usernameLower?.includes(normalizedSearch);
        const displayNameMatch = user.displayName?.toLowerCase().includes(normalizedSearch);
        return usernameMatch || displayNameMatch;
      })
    : allUsers;

  const parsedLimit = Number.parseInt(String(limit), 10);
  const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 12;
  const parsedOffset = Number.parseInt(String(offset), 10);
  const safeOffset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  const slice = filtered.slice(safeOffset, safeOffset + safeLimit);

  const detailed = await Promise.all(
    slice.map(async (user) => {
      try {
        return await getProfileByUsername(user.usernameLower);
      } catch (error) {
        if (error && typeof error === "object" && "status" in error && error.status === 404) {
          return null;
        }
        throw error;
      }
    }),
  );

  const users = slice.map((user, index) => {
    const profile = detailed[index];
    const profileData = profile?.profile ?? {
      userId: user.id,
      bio: "",
      avatarUrl: DEFAULT_AVATAR_URL,
      coverUrl: DEFAULT_COVER_URL,
      location: "",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const stats = profile?.stats ?? defaultStats();

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role ?? DEFAULT_USER_ROLE,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      avatarUrl: profileData.avatarUrl ?? DEFAULT_AVATAR_URL,
      bio: profileData.bio ?? "",
      location: profileData.location ?? "",
      stats: {
        followers: Number(stats.followers) || 0,
        following: Number(stats.following) || 0,
        posts: Number(stats.posts) || 0,
      },
    };
  });

  const nextOffset = safeOffset + users.length;

  return {
    users,
    total: filtered.length,
    overall: allUsers.length,
    hasMore: nextOffset < filtered.length,
    nextOffset,
  };
}

export async function changeUserRole(actorUserId, targetUserId, nextRole) {
  if (!actorUserId) {
    throw createHttpError(401, "Authorization required.");
  }

  const normalizedRole = typeof nextRole === "string" ? nextRole.trim().toLowerCase() : "";
  if (!isValidUserRole(normalizedRole)) {
    throw createHttpError(400, "Unsupported role value.");
  }

  const actor = await findUserById(actorUserId);
  if (!actor || actor.role !== USER_ROLES.ADMIN) {
    throw createHttpError(403, "Only administrators can change roles.");
  }

  if (actorUserId === targetUserId && normalizedRole !== USER_ROLES.ADMIN) {
    throw createHttpError(400, "Administrators cannot revoke their own admin role.");
  }

  const target = await findUserById(targetUserId);
  if (!target) {
    throw createHttpError(404, "Target user not found.");
  }

  if (target.role === normalizedRole) {
    return toPublicUser(target);
  }

  await updateUserRole(targetUserId, normalizedRole);
  const updated = await findUserById(targetUserId);
  return toPublicUser(updated);
}

export async function forceSetUserRoleByUsername(username, nextRole, providedToken) {
  if (!env.adminBootstrapToken || env.adminBootstrapToken.trim().length === 0) {
    throw createHttpError(403, "Admin bootstrap is disabled.");
  }

  if (providedToken !== env.adminBootstrapToken) {
    throw createHttpError(403, "Invalid bootstrap token.");
  }

  const normalizedRole = typeof nextRole === "string" ? nextRole.trim().toLowerCase() : "";
  if (!isValidUserRole(normalizedRole)) {
    throw createHttpError(400, "Unsupported role value.");
  }

  const targetUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
  if (!targetUsername) {
    throw createHttpError(400, "Username is required.");
  }

  const target = await findUserByUsername(targetUsername);
  if (!target) {
    throw createHttpError(404, "Target user not found.");
  }

  if (target.role === normalizedRole) {
    return toPublicUser(target);
  }

  await updateUserRole(target.id, normalizedRole);
  const updated = await findUserById(target.id);
  return toPublicUser(updated);
}
