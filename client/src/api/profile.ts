import { apiRequest } from "./client";
import type { ProfileCore } from "./auth";
import { resolveMediaUrl } from "@/utils/media";

export type ProfilePost = {
  id: string;
  userId: string;
  authorId?: string;
  title: string | null;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  author?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  } | null;
};

export type ProfileNotification = {
  id: string;
  userId: string;
  authorId?: string | null;
  type: string;
  title: string;
  body: string;
  iconUrl: string;
  link: string;
  isRead: boolean;
  createdAt: string;
};

export type ProfileFollower = {
  followerId: string;
  followingId: string;
  createdAt: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string;
};

export type ProfileResponse = {
  status: "ok";
  profile: ProfileCore;
  posts: ProfilePost[];
  notifications: ProfileNotification[];
  followers: ProfileFollower[];
  following: ProfileFollower[];
  isFollowing: boolean;
};

export function fetchProfile(username: string, token?: string | null) {
  return apiRequest<ProfileResponse>(`/profile/${encodeURIComponent(username)}`, {
    method: "GET",
    token: token ?? undefined,
  }).then(normalizeProfileResponse);
}

export type ProfilePostsResponse = {
  status: "ok";
  posts: ProfilePost[];
  hasMore: boolean;
  nextOffset: number;
  offset: number;
  total: number | null;
};

export function fetchProfilePosts(
  username: string,
  options: { limit?: number; offset?: number } = {},
  token?: string | null,
) {
  const params = new URLSearchParams();
  if (typeof options.limit === "number") {
    params.set("limit", String(options.limit));
  }
  if (typeof options.offset === "number") {
    params.set("offset", String(options.offset));
  }

  const query = params.toString();
  const path = `/profile/${encodeURIComponent(username)}/posts${query ? `?${query}` : ""}`;

  return apiRequest<ProfilePostsResponse>(path, {
    method: "GET",
    token: token ?? undefined,
  }).then(normalizePostsResponse);
}

export function updateProfile(payload: {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  location?: string;
}, token: string) {
  return apiRequest<{ status: "ok"; profile: ProfileCore | null }>("/profile", {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function followUser(username: string, token: string) {
  return apiRequest<{ status: "ok"; alreadyFollowing?: boolean }>(`/profile/${encodeURIComponent(username)}/follow`, {
    method: "POST",
    token,
  });
}

export function unfollowUser(username: string, token: string) {
  return apiRequest<{ status: "ok"; wasFollowing?: boolean }>(`/profile/${encodeURIComponent(username)}/follow`, {
    method: "DELETE",
    token,
  });
}

export function createProfilePost(
  username: string,
  payload: { title?: string | null; content: string; imageUrl?: string | null },
  token: string,
) {
  const encoded = encodeURIComponent(username);
  return apiRequest<{ status: "ok"; post: ProfilePost }>(`/profile/${encoded}/posts`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  }).then((response) => normalizePost(response.post));
}

export function fetchNotifications(
  token: string,
  options: { limit?: number; offset?: number } = {},
) {
  const params = new URLSearchParams();
  if (typeof options.limit === "number") {
    params.set("limit", String(options.limit));
  }
  if (typeof options.offset === "number") {
    params.set("offset", String(options.offset));
  }

  const query = params.toString();
  const path = `/profile/notifications${query ? `?${query}` : ""}`;

  return apiRequest<{ status: "ok"; notifications: ProfileNotification[] }>(path, {
    method: "GET",
    token,
  }).then((response) => response.notifications.map(normalizeNotification));
}

export function markNotificationsAsRead(token: string) {
  return apiRequest<{ status: "ok" }>("/profile/notifications/read", {
    method: "POST",
    token,
  });
}

export function pingPresence(token: string) {
  return apiRequest<{ status: "ok"; lastSeenAt?: string }>("/profile/presence", {
    method: "POST",
    token,
  });
}

function normalizeProfileCore(core: ProfileCore): ProfileCore {
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

function normalizePost(post: ProfilePost): ProfilePost {
  const imageUrl = post.imageUrl ? resolveMediaUrl(post.imageUrl) ?? post.imageUrl : post.imageUrl;
  const author = post.author
    ? {
        ...post.author,
        avatarUrl: resolveMediaUrl(post.author.avatarUrl) ?? post.author.avatarUrl,
      }
    : post.author;

  return {
    ...post,
    imageUrl,
    author,
  };
}

function normalizeNotification(notification: ProfileNotification): ProfileNotification {
  return {
    ...notification,
    iconUrl: resolveMediaUrl(notification.iconUrl) ?? notification.iconUrl,
  };
}

function normalizeFollower(follower: ProfileFollower): ProfileFollower {
  return {
    ...follower,
    avatarUrl: resolveMediaUrl(follower.avatarUrl) ?? follower.avatarUrl,
  };
}

function normalizeProfileResponse(response: ProfileResponse): ProfileResponse {
  return {
    ...response,
    profile: normalizeProfileCore(response.profile),
    posts: response.posts.map(normalizePost),
    notifications: response.notifications.map(normalizeNotification),
    followers: response.followers.map(normalizeFollower),
    following: response.following.map(normalizeFollower),
  };
}

function normalizePostsResponse(response: ProfilePostsResponse): ProfilePostsResponse {
  return {
    ...response,
    posts: response.posts.map(normalizePost),
  };
}
