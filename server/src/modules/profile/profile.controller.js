import {
  getProfile,
  getProfilePosts,
  updateProfileInfo,
  updateProfilePresence,
  followUser,
  unfollowUser,
  createPostOnProfile,
  createDemoNotification,
  getNotificationsForUser,
  markAllNotificationsAsRead,
} from "./profile.service.js";
import { createHttpError } from "../../utils/http-error.js";

export async function showProfile(request, response) {
  const username = request.params.username ?? "";
  if (!username) {
    throw createHttpError(400, "Username is required.");
  }

  const currentUserId = request.user?.id ?? null;
  const data = await getProfile(username, currentUserId);
  response.json({
    status: "ok",
    ...data,
  });
}

export async function listPosts(request, response) {
  const username = request.params.username ?? "";
  if (!username) {
    throw createHttpError(400, "Username is required.");
  }

  const { limit, offset } = request.query ?? {};
  const result = await getProfilePosts(username, { limit, offset });
  const currentOffset = Math.max(0, result.nextOffset - result.posts.length);

  response.json({
    status: "ok",
    posts: result.posts,
    hasMore: result.hasMore,
    nextOffset: result.nextOffset,
    offset: currentOffset,
    total: result.total ?? null,
  });
}

export async function pingPresence(request, response) {
  const userId = request.user?.id;
  if (!userId) {
    throw createHttpError(401, "Authorization required.");
  }

  const result = await updateProfilePresence(userId);

  response.json({
    status: "ok",
    ...result,
  });
}

export async function updateProfile(request, response) {
  const userId = request.user?.id;
  if (!userId) {
    throw createHttpError(401, "Authorization required.");
  }

  const { displayName, bio, avatarUrl, coverUrl, location } = request.body ?? {};
  const updated = await updateProfileInfo(userId, { displayName, bio, avatarUrl, coverUrl, location });

  response.json({
    status: "ok",
    profile: updated,
  });
}

export async function follow(request, response) {
  const followerId = request.user?.id;
  if (!followerId) {
    throw createHttpError(401, "Authorization required.");
  }

  const username = request.params.username ?? "";
  const result = await followUser(followerId, username);

  response.json({
    status: "ok",
    ...result,
  });
}

export async function unfollow(request, response) {
  const followerId = request.user?.id;
  if (!followerId) {
    throw createHttpError(401, "Authorization required.");
  }

  const username = request.params.username ?? "";
  const result = await unfollowUser(followerId, username);

  response.json({
    status: "ok",
    ...result,
  });
}

function normalizeOptionalString(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function handleCreatePost(request, response, targetUsernameParam = null) {
  const userId = request.user?.id;
  if (!userId) {
    throw createHttpError(401, "Authorization required.");
  }

  const { title, content, imageUrl, targetUsername: bodyTargetUsername } = request.body ?? {};
  const normalizedContent = typeof content === "string" ? content.trim() : "";
  if (!normalizedContent) {
    throw createHttpError(400, "Content is required.");
  }

  const normalizedParamUsername =
    typeof targetUsernameParam === "string" && targetUsernameParam.trim().length > 0
      ? targetUsernameParam.trim()
      : null;
  const normalizedBodyUsername =
    typeof bodyTargetUsername === "string" && bodyTargetUsername.trim().length > 0
      ? bodyTargetUsername.trim()
      : null;

  const post = await createPostOnProfile(
    userId,
    normalizedParamUsername ?? normalizedBodyUsername ?? null,
    {
      title: normalizeOptionalString(title),
      content: normalizedContent,
      imageUrl: normalizeOptionalString(imageUrl),
    },
  );

  response.status(201).json({
    status: "ok",
    post,
  });
}

export async function createPost(request, response) {
  await handleCreatePost(request, response, null);
}

export async function createPostForUsername(request, response) {
  const username = request.params.username ?? null;
  await handleCreatePost(request, response, username);
}

export async function demoPost(request, response) {
  await handleCreatePost(request, response, null);
}

export async function demoNotification(request, response) {
  const userId = request.user?.id;
  if (!userId) {
    throw createHttpError(401, "Authorization required.");
  }

  const { type, title, body, iconUrl, link } = request.body ?? {};
  if (!body || typeof body !== "string") {
    throw createHttpError(400, "Notification body is required.");
  }

  const notification = await createDemoNotification(userId, {
    type: type ?? "info",
    title,
    body,
    iconUrl,
    link,
  });

  response.status(201).json({
    status: "ok",
    notification,
  });
}

export async function listNotificationsForCurrentUser(request, response) {
  const userId = request.user?.id;
  if (!userId) {
    throw createHttpError(401, "Authorization required.");
  }

  const { limit, offset } = request.query ?? {};
  const notifications = await getNotificationsForUser(userId, { limit, offset });

  response.json({
    status: "ok",
    notifications,
  });
}

export async function markNotificationsRead(request, response) {
  const userId = request.user?.id;
  if (!userId) {
    throw createHttpError(401, "Authorization required.");
  }

  await markAllNotificationsAsRead(userId);

  response.json({
    status: "ok",
  });
}
