import { apiRequest } from "./client";
import { resolveMediaUrl } from "@/utils/media";

export type ProfileStats = {
  followers: number;
  following: number;
  posts: number;
  unreadNotifications: number;
};

export type ProfileCore = {
  id: string;
  username: string;
  usernameLower?: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  profile: {
    userId: string;
    bio: string;
    avatarUrl: string;
    coverUrl: string;
    location: string;
    createdAt: string;
    updatedAt: string;
    lastSeenAt: string | null;
  };
  stats: ProfileStats;
};

export type UserRole = "admin" | "user";

export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  gender: "male" | "female";
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  avatarUrl: string;
  coverUrl: string;
  bio: string;
  stats: ProfileStats;
};

type AuthSuccessResponse = {
  status: "ok";
  user: AuthUser;
  profile: ProfileCore | null;
  token: string;
};

type ProfileResponse = {
  status: "ok";
  user: AuthUser;
  profile: ProfileCore | null;
};

export function login(payload: { username: string; password: string }) {
  return apiRequest<AuthSuccessResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(normalizeAuthSuccessResponse);
}

export function register(payload: {
  username: string;
  password: string;
  displayName: string;
  gender: "male" | "female";
}) {
  return apiRequest<AuthSuccessResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(normalizeAuthSuccessResponse);
}

export function getProfile(token: string) {
  return apiRequest<ProfileResponse>("/auth/me", {
    method: "GET",
    token,
  }).then(normalizeProfileResponse);
}

export function updatePassword(payload: { currentPassword: string; newPassword: string }, token: string) {
  return apiRequest<{ status: "ok" }>("/auth/password", {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

function normalizeAuthUser(user: AuthUser): AuthUser {
  return {
    ...user,
    avatarUrl: resolveMediaUrl(user.avatarUrl) ?? user.avatarUrl,
    coverUrl: resolveMediaUrl(user.coverUrl) ?? user.coverUrl,
  };
}

function normalizeProfileCore(core: ProfileCore | null): ProfileCore | null {
  if (!core) return core;
  return {
    ...core,
    profile: {
      ...core.profile,
      avatarUrl: resolveMediaUrl(core.profile.avatarUrl) ?? core.profile.avatarUrl,
      coverUrl: resolveMediaUrl(core.profile.coverUrl) ?? core.profile.coverUrl,
      lastSeenAt: core.profile.lastSeenAt ?? core.profile.updatedAt ?? null,
    },
  };
}

function normalizeAuthSuccessResponse(response: AuthSuccessResponse): AuthSuccessResponse {
  return {
    ...response,
    user: normalizeAuthUser(response.user),
    profile: normalizeProfileCore(response.profile),
  };
}

function normalizeProfileResponse(response: ProfileResponse): ProfileResponse {
  return {
    ...response,
    user: normalizeAuthUser(response.user),
    profile: normalizeProfileCore(response.profile),
  };
}
