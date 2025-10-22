import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPool, isDatabaseEnabled } from "../../config/database.js";
import { USER_ROLES } from "../../constants/roles.js";
import { findAllUsers } from "../users/user.repository.js";

const projectRoot = path.dirname(fileURLToPath(new URL("../../..", import.meta.url)));
const serverRoot = path.join(projectRoot, "server");
const dataDir = path.join(serverRoot, "data");

const usersFilePath = path.join(dataDir, "users.json");
const profilesFilePath = path.join(dataDir, "profiles.json");
const postsFilePath = path.join(dataDir, "profile-posts.json");
const followersFilePath = path.join(dataDir, "profile-followers.json");
const notificationsFilePath = path.join(dataDir, "profile-notifications.json");
const conversationsFilePath = path.join(dataDir, "messages-conversations.json");
const participantsFilePath = path.join(dataDir, "messages-participants.json");
const messagesFilePath = path.join(dataDir, "messages.json");

async function readJsonSafe(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    try {
      return JSON.parse(content);
    } catch {
      return fallback;
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

function normalizeUsers(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "object") return Object.values(data);
  return [];
}

function sumArrayLengths(record) {
  if (!record || typeof record !== "object") return 0;
  return Object.values(record).reduce((acc, value) => {
    if (Array.isArray(value)) {
      return acc + value.length;
    }
    return acc;
  }, 0);
}

async function getFileBasedStatistics() {
  const [usersRaw, profiles, posts, followers, notifications, conversations, participants, messages] = await Promise.all([
    readJsonSafe(usersFilePath, []),
    readJsonSafe(profilesFilePath, {}),
    readJsonSafe(postsFilePath, {}),
    readJsonSafe(followersFilePath, {}),
    readJsonSafe(notificationsFilePath, {}),
    readJsonSafe(conversationsFilePath, {}),
    readJsonSafe(participantsFilePath, {}),
    readJsonSafe(messagesFilePath, {}),
  ]);

  const users = normalizeUsers(usersRaw);
  const totalUsers = users.length;
  const adminUsers = users.filter((user) => user?.role === USER_ROLES.ADMIN).length;

  const profileCount = profiles && typeof profiles === "object" ? Object.keys(profiles).length : 0;
  const postsCount = sumArrayLengths(posts);
  const followerRelations = sumArrayLengths(followers);

  const uniqueFollowerIds = new Set();
  const uniqueFollowingIds = new Set();
  if (followers && typeof followers === "object") {
    Object.values(followers).forEach((list) => {
      if (Array.isArray(list)) {
        list.forEach((relation) => {
          if (relation && typeof relation === "object") {
            if (relation.followerId) {
              uniqueFollowerIds.add(relation.followerId);
            }
            if (relation.followingId) {
              uniqueFollowingIds.add(relation.followingId);
            }
          }
        });
      }
    });
  }

  let notificationsCount = 0;
  let unreadNotificationsCount = 0;
  if (notifications && typeof notifications === "object") {
    Object.values(notifications).forEach((list) => {
      if (!Array.isArray(list)) return;
      const visibleNotifications = list.filter(
        (item) => item && typeof item === "object" && item.type !== "messages.direct",
      );
      notificationsCount += visibleNotifications.length;
      unreadNotificationsCount += visibleNotifications.filter((item) => item.isRead === false).length;
    });
  }

  const conversationCount = conversations && typeof conversations === "object" ? Object.keys(conversations).length : 0;
  const participantsCount = sumArrayLengths(participants);
  const messagesCount = sumArrayLengths(messages);

  return {
    source: "files",
    generatedAt: new Date().toISOString(),
    users: {
      total: totalUsers,
      admins: adminUsers,
    },
    profiles: {
      total: profileCount,
    },
    posts: {
      total: postsCount,
    },
    followers: {
      relations: followerRelations,
      uniqueFollowers: uniqueFollowerIds.size,
      uniqueFollowing: uniqueFollowingIds.size,
    },
    notifications: {
      total: notificationsCount,
      unread: unreadNotificationsCount,
    },
    messages: {
      conversations: conversationCount,
      messages: messagesCount,
      participants: participantsCount,
    },
  };
}

async function getDatabaseStatistics() {
  const pool = getPool();

  const [
    totalUsersResult,
    adminUsersResult,
    profilesResult,
    postsResult,
    followersResult,
    notificationsResult,
    unreadNotificationsResult,
    uniqueFollowersResult,
    uniqueFollowingResult,
    conversationsResult,
    messagesResult,
    participantsResult,
  ] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM users"),
    pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = $1", [USER_ROLES.ADMIN]),
    pool.query("SELECT COUNT(*)::int AS count FROM user_profiles"),
    pool.query("SELECT COUNT(*)::int AS count FROM user_posts"),
    pool.query("SELECT COUNT(*)::int AS count FROM user_followers"),
    pool.query("SELECT COUNT(*)::int AS count FROM user_notifications WHERE type <> 'messages.direct'"),
    pool.query("SELECT COUNT(*)::int AS count FROM user_notifications WHERE type <> 'messages.direct' AND is_read = false"),
    pool.query("SELECT COUNT(DISTINCT follower_id)::int AS count FROM user_followers"),
    pool.query("SELECT COUNT(DISTINCT following_id)::int AS count FROM user_followers"),
    pool.query("SELECT COUNT(*)::int AS count FROM messages_conversations"),
    pool.query("SELECT COUNT(*)::int AS count FROM messages"),
    pool.query("SELECT COUNT(*)::int AS count FROM messages_participants"),
  ]);

  return {
    source: "database",
    generatedAt: new Date().toISOString(),
    users: {
      total: totalUsersResult.rows[0]?.count ?? 0,
      admins: adminUsersResult.rows[0]?.count ?? 0,
    },
    profiles: {
      total: profilesResult.rows[0]?.count ?? 0,
    },
    posts: {
      total: postsResult.rows[0]?.count ?? 0,
    },
    followers: {
      relations: followersResult.rows[0]?.count ?? 0,
      uniqueFollowers: uniqueFollowersResult.rows[0]?.count ?? 0,
      uniqueFollowing: uniqueFollowingResult.rows[0]?.count ?? 0,
    },
    notifications: {
      total: notificationsResult.rows[0]?.count ?? 0,
      unread: unreadNotificationsResult.rows[0]?.count ?? 0,
    },
    messages: {
      conversations: conversationsResult.rows[0]?.count ?? 0,
      messages: messagesResult.rows[0]?.count ?? 0,
      participants: participantsResult.rows[0]?.count ?? 0,
    },
  };
}

export async function getAdminStatistics() {
  if (isDatabaseEnabled()) {
    return getDatabaseStatistics();
  }

  const fallbackStats = await getFileBasedStatistics();

  if (fallbackStats.users.total === 0) {
    const users = await findAllUsers();
    return {
      ...fallbackStats,
      users: {
        total: users.length,
        admins: users.filter((user) => user.role === USER_ROLES.ADMIN).length,
      },
    };
  }

  return fallbackStats;
}
