import { apiRequest } from "./client";
import { resolveMediaUrl } from "@/utils/media";
import type { ProfileCore, UserRole } from "./auth";

export type UsersListItem = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  avatarUrl: string;
  coverUrl?: string | null;
  bio: string;
  location: string;
  stats: {
    followers: number;
    following: number;
    posts: number;
  };
};

export type UsersListResponse = {
  status: "ok";
  users: UsersListItem[];
  total: number;
  overall: number;
  hasMore: boolean;
  nextOffset: number;
};

export type UsersListParams = {
  search?: string;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
};

export function fetchUsersList({ search, limit, offset, signal }: UsersListParams = {}) {
  const params = new URLSearchParams();

  if (typeof search === "string" && search.trim().length > 0) {
    params.set("search", search.trim());
  }
  if (typeof limit === "number") {
    params.set("limit", String(limit));
  }
  if (typeof offset === "number") {
    params.set("offset", String(offset));
  }

  const query = params.toString();
  const path = `/users${query ? `?${query}` : ""}`;

  return apiRequest<UsersListResponse>(path, {
    method: "GET",
    signal,
  }).then((response) => ({
    ...response,
    users: response.users.map((user) => ({
      ...user,
      avatarUrl: resolveMediaUrl(user.avatarUrl) ?? user.avatarUrl,
      coverUrl: "coverUrl" in user ? resolveMediaUrl((user as { coverUrl?: string | null }).coverUrl) ?? (user as { coverUrl?: string | null }).coverUrl : undefined,
    })),
  }));
}

export function updateUserRole(userId: string, role: UserRole, token: string) {
  return apiRequest<{ status: "ok"; user: { id: string; role: UserRole } }>(`/users/${userId}/role`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ role }),
  });
}

export function updateUserProfileAdmin(
  userId: string,
  payload: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    coverUrl?: string;
    location?: string;
    isOfficial?: boolean;
  },
  token: string,
) {
  return apiRequest<{ status: "ok"; profile: ProfileCore | null }>(`/admin/users/${userId}/profile`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}
