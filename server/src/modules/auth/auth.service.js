import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import { createHttpError } from "../../utils/http-error.js";
import { createUser, verifyUserCredentials, toPublicUser } from "../users/user.service.js";
import { getProfileByUsername } from "../profile/profile.repository.js";
import { DEFAULT_AVATAR_URL, DEFAULT_COVER_URL } from "../../constants/media.js";
import { findUserById, updateUserPasswordHash } from "../users/user.repository.js";

function issueToken(userId) {
  return jwt.sign({ sub: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

async function composeAuthPayload(user) {
  const profile = await getProfileByUsername(user.username.toLowerCase());
  return {
    user: {
      ...user,
      avatarUrl: profile?.profile?.avatarUrl ?? DEFAULT_AVATAR_URL,
      coverUrl: profile?.profile?.coverUrl ?? DEFAULT_COVER_URL,
      bio: profile?.profile?.bio ?? "",
      stats: profile?.stats ?? { followers: 0, following: 0, posts: 0, unreadNotifications: 0 },
    },
    profile,
  };
}

export async function registerUser(payload) {
  const user = await createUser(payload);
  const token = issueToken(user.id);
  const result = await composeAuthPayload(user);
  return { ...result, token };
}

export async function loginUser({ username, password }) {
  const user = await verifyUserCredentials(username, password);
  const token = issueToken(user.id);
  const result = await composeAuthPayload(user);
  return { ...result, token };
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    throw createHttpError(401, "Требуется авторизация.");
  }
}

export async function getProfileFromToken(token) {
  const decoded = verifyToken(token);
  const user = await findUserById(decoded.sub);
  const publicUser = toPublicUser(user);
  return composeAuthPayload(publicUser);
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await findUserById(userId);
  if (!user) {
    throw createHttpError(404, "Пользователь не найден.");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw createHttpError(400, "Текущий пароль указан неверно.");
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await updateUserPasswordHash(userId, newHash);
  return true;
}
