import { createHttpError } from "../../utils/http-error.js";
import { logger } from "../../utils/logger.js";
import { DEFAULT_AVATAR_URL } from "../../constants/media.js";
import {
  ensureProfileForUser,
  getProfileByUsername,
  getPostsByUser,
  getNotificationsByUser,
  getFollowersByUser,
  getFollowingByUser,
  updateProfile,
  updateProfileLastSeen,
  setFollowStatus,
  createPost,
  createNotification,
  markNotificationsAsRead,
} from "./profile.repository.js";
import { findUserById, findUserByUsername } from "../users/user.repository.js";

export async function getProfile(username, currentUserId) {
  const profile = await getProfileByUsername(username.toLowerCase());
  if (!profile) {
    throw createHttpError(404, "Пользователь не найден.");
  }

  const [posts, notifications, followers, following] = await Promise.all([
    getPostsByUser(profile.id, { limit: 10, offset: 0 }),
    getNotificationsByUser(profile.id, { limit: 10, offset: 0 }),
    getFollowersByUser(profile.id, { limit: 12, offset: 0 }),
    getFollowingByUser(profile.id, { limit: 12, offset: 0 }),
  ]);

  let isFollowing = false;
  if (currentUserId) {
    isFollowing = followers.some((item) => item.followerId === currentUserId);
  }

  return {
    profile,
    posts,
    notifications,
    followers,
    following,
    isFollowing,
  };
}

export async function getProfilePosts(username, { limit = 10, offset = 0 } = {}) {
  const profile = await getProfileByUsername(username.toLowerCase());
  if (!profile) {
    throw createHttpError(404, "Пользователь не найден.");
  }

  const parsedLimit = Number.parseInt(String(limit), 10);
  const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 10;

  const parsedOffset = Number.parseInt(String(offset), 10);
  const safeOffset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  const posts = await getPostsByUser(profile.id, { limit: safeLimit + 1, offset: safeOffset });
  const hasMore = posts.length > safeLimit;
  const visiblePosts = hasMore ? posts.slice(0, safeLimit) : posts;

  return {
    profileId: profile.id,
    posts: visiblePosts,
    hasMore,
    nextOffset: safeOffset + visiblePosts.length,
    total: profile.stats?.posts ?? undefined,
  };
}

export async function updateProfileInfo(userId, payload) {
  await ensureProfileForUser(userId);
  await updateProfile(userId, payload);
  const user = await findUserById(userId);
  if (!user) {
    throw createHttpError(404, "Пользователь не найден.");
  }
  const profile = await getProfileByUsername(user.usernameLower);
  return profile;
}

export async function updateProfilePresence(userId) {
  await ensureProfileForUser(userId);
  const lastSeenAt = await updateProfileLastSeen(userId);
  return { success: true, lastSeenAt };
}

export async function followUser(followerId, targetUsername) {

  const normalizedUsername = targetUsername.toLowerCase();

  const target = await findUserByUsername(normalizedUsername);

  if (!target) {

    throw createHttpError(404, "�?�?�>�?���?�?���'��>�? �?�� �?�����?��?.");

  }



  const follower = await findUserById(followerId);

  if (!follower) {

    throw createHttpError(404, "�?�?�>�?���?�?���'��>�? �?�� �?�����?��?.");

  }



  const changed = await setFollowStatus(followerId, target.id, true);



  if (changed && follower.id !== target.id) {

    await ensureProfileForUser(follower.id);

    let avatarUrl = DEFAULT_AVATAR_URL;

    try {

      const followerProfile = await getProfileByUsername(follower.usernameLower ?? follower.username.toLowerCase());

      if (followerProfile?.profile?.avatarUrl) {

        avatarUrl = followerProfile.profile.avatarUrl;

      }

    } catch (error) {

      logger.warn("Failed to load follower profile for notification", {

        error: error instanceof Error ? error.message : error,

        followerId,

      });

    }



    const followerName = follower.displayName ?? follower.username;

    try {

            await createNotification(target.id, {
        type: "profile.follow",
        title: "Username",
        body: `${followerName} followed you`,
        iconUrl: avatarUrl,
        link: `/profile?user=${encodeURIComponent(follower.username)}`,
        authorId: follower.id,
      });


    } catch (error) {

      logger.warn("Failed to create follow notification", {

        error: error instanceof Error ? error.message : error,

        followerId,

        targetId: target.id,

      });

    }

  }



  return { success: true, alreadyFollowing: !changed };

}



export async function unfollowUser(followerId, targetUsername) {
  const normalizedUsername = targetUsername.toLowerCase();

  const target = await findUserByUsername(normalizedUsername);

  if (!target) {

    throw createHttpError(404, "�?�?�>�?���?�?���'��>�? �?�� �?�����?��?.");

  }



  const follower = await findUserById(followerId);

  if (!follower) {

    throw createHttpError(404, "�?�?�>�?���?�?���'��>�? �?�� �?�����?��?.");

  }



  const changed = await setFollowStatus(followerId, target.id, false);



  if (changed && follower.id !== target.id) {

    await ensureProfileForUser(follower.id);

    let avatarUrl = DEFAULT_AVATAR_URL;

    try {

      const followerProfile = await getProfileByUsername(follower.usernameLower ?? follower.username.toLowerCase());

      if (followerProfile?.profile?.avatarUrl) {

        avatarUrl = followerProfile.profile.avatarUrl;

      }

    } catch (error) {

      logger.warn("Failed to load follower profile for unfollow notification", {

        error: error instanceof Error ? error.message : error,

        followerId,

      });

    }



    const followerName = follower.displayName ?? follower.username;

    try {

            await createNotification(target.id, {
        type: "profile.unfollow",
        title: "Username",
        body: `${followerName} unfollowed you`,
        iconUrl: avatarUrl,
        link: `/profile?user=${encodeURIComponent(follower.username)}`,
        authorId: follower.id,
      });


    } catch (error) {

      logger.warn("Failed to create unfollow notification", {

        error: error instanceof Error ? error.message : error,

        followerId,

        targetId: target.id,

      });

    }

  }



  return { success: true, alreadyFollowing: changed };

}



export async function createPostOnProfile(authorId, targetUsername, payload) {
  await ensureProfileForUser(authorId);

  const author = await findUserById(authorId);
  if (!author) {
    throw createHttpError(404, "?????>???????????'??>?? ???? ???????????.");
  }

  let targetUser = author;
  if (typeof targetUsername === "string" && targetUsername.trim().length > 0) {
    const lookup = await findUserByUsername(targetUsername.toLowerCase());
    if (!lookup) {
      throw createHttpError(404, "?????>???????????'??>?? ???? ???????????.");
    }
    targetUser = lookup;
  }

  await ensureProfileForUser(targetUser.id);

  const post = await createPost(targetUser.id, author.id, payload);

  let avatarUrl = post.author?.avatarUrl ?? DEFAULT_AVATAR_URL;
  if (!post.author?.avatarUrl) {
    try {
      const profile = await getProfileByUsername(author.usernameLower ?? author.username.toLowerCase());
      avatarUrl = profile?.profile?.avatarUrl ?? avatarUrl;
    } catch {
      // ignore and fallback to default avatar
    }
  }

  if (author.id !== targetUser.id) {
    const contentPreview = (payload.content ?? "").trim();
    const snippet = contentPreview.length > 160 ? `${contentPreview.slice(0, 157)}...` : contentPreview;

    try {
      await createNotification(targetUser.id, {
        type: "profile.wall.comment",
        title: `${author.username} написал(а) на вашей стене`,
        body: snippet || "Новое сообщение на вашей стене",
        iconUrl: avatarUrl,
        link: `/profile?user=${encodeURIComponent(targetUser.username)}#post-${post.id}`,
        authorId: author.id,
      });
    } catch (error) {
      logger.warn("Failed to create wall post notification", {
        error: error instanceof Error ? error.message : error,
        targetUserId: targetUser.id,
        postId: post.id,
      });
    }
  }

  return {
    ...post,
    authorId: author.id,
    author: {
      id: author.id,
      username: author.username,
      displayName: author.displayName,
      avatarUrl,
    },
  };
}

export async function createDemoNotification(userId, payload) {
  await ensureProfileForUser(userId);
  return createNotification(userId, payload);
}

export function createDemoPost(userId, payload) {
  return createPostOnProfile(userId, null, payload);
}

export function getNotificationsForUser(userId, { limit = 20, offset = 0 } = {}) {
  const parsedLimit = Number.parseInt(String(limit), 10);
  const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 20;

  const parsedOffset = Number.parseInt(String(offset), 10);
  const safeOffset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  return getNotificationsByUser(userId, { limit: safeLimit, offset: safeOffset });
}

export async function markAllNotificationsAsRead(userId) {
  await markNotificationsAsRead(userId);
}



