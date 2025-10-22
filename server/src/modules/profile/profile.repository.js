import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPool, isDatabaseEnabled } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { DEFAULT_AVATAR_URL, DEFAULT_COVER_URL } from "../../constants/media.js";

const projectRoot = path.dirname(fileURLToPath(new URL("../../..", import.meta.url)));
const serverRoot = path.join(projectRoot, "server");
const dataDir = path.join(serverRoot, "data");
const uploadsDir = path.join(serverRoot, "uploads");
const avatarUploadsDir = path.join(uploadsDir, "avatars");
const LEGACY_DEFAULT_AVATAR_URL = "/design/img/avatar.png";

function normalizeStoredAvatarUrl(value) {
  if (!value) {
    return DEFAULT_AVATAR_URL;
  }
  return value === LEGACY_DEFAULT_AVATAR_URL ? DEFAULT_AVATAR_URL : value;
}
const profilesFilePath = path.join(dataDir, "profiles.json");
const postsFilePath = path.join(dataDir, "profile-posts.json");
const usersFilePath = path.join(dataDir, "users.json");
const notificationsFilePath = path.join(dataDir, "profile-notifications.json");
const followersFilePath = path.join(dataDir, "profile-followers.json");

let tablesInitialized = false;

async function ensureDataFiles() {
  await fs.mkdir(dataDir, { recursive: true });

  const defaults = [
    { path: profilesFilePath, value: "{}" },
    { path: postsFilePath, value: "{}" },
    { path: notificationsFilePath, value: "{}" },
    { path: followersFilePath, value: "{}" },
    { path: usersFilePath, value: "[]" },
  ];

  await Promise.all(
    defaults.map(async ({ path: filePath, value }) => {
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, value, "utf8");
      }
    }),
  );
}

async function ensureProfileTables() {
  if (tablesInitialized || !isDatabaseEnabled()) return;

  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      bio TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '${DEFAULT_AVATAR_URL}',
      cover_url TEXT NOT NULL DEFAULT '${DEFAULT_COVER_URL}',
      location TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_official BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS user_posts (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      author_id UUID REFERENCES users(id) ON DELETE SET NULL,
      title TEXT,
      content TEXT NOT NULL,
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      likes_count INTEGER NOT NULL DEFAULT 0,
      comments_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_notifications (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      author_id UUID REFERENCES users(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      title TEXT,
      body TEXT NOT NULL,
      icon_url TEXT,
      link TEXT,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_followers (
      follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (follower_id, following_id)
    );
  `);

  await pool.query(
    `
      ALTER TABLE user_posts
        ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id) ON DELETE SET NULL;

      ALTER TABLE user_notifications
        ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id) ON DELETE SET NULL;

      ALTER TABLE user_profiles
        ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

      ALTER TABLE user_profiles
        ALTER COLUMN avatar_url SET DEFAULT '${DEFAULT_AVATAR_URL}',
        ALTER COLUMN cover_url SET DEFAULT '${DEFAULT_COVER_URL}',
        ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT FALSE;
    `,
  );

  tablesInitialized = true;
  logger.info("Profile tables ready");
}

function isDataImageUri(value) {
  return typeof value === "string" && value.startsWith("data:image");
}

function resolveUploadPath(relativePath) {
  const sanitized = relativePath.replace(/^\/+/, "");
  const absolutePath = path.join(serverRoot, sanitized);
  if (!absolutePath.startsWith(uploadsDir)) {
    throw new Error("Invalid upload path");
  }
  return absolutePath;
}

async function deleteAvatarFile(relativePath) {
  try {
    if (typeof relativePath !== "string" || !relativePath.startsWith("/uploads/avatars/")) {
      return;
    }
    const absolutePath = resolveUploadPath(relativePath);
    await fs.unlink(absolutePath);
  } catch (error) {
    logger.warn("Failed to delete avatar file", { error });
  }
}

async function saveAvatarDataUri(dataUri, userId) {
  const match = dataUri.match(/^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i);
  if (!match) {
    throw new Error("Invalid avatar image data");
  }

  const mimeType = match[1].toLowerCase();
  const base64Data = match[2];

  let extension = "png";
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    extension = "jpg";
  } else if (mimeType === "image/webp") {
    extension = "webp";
  } else if (mimeType === "image/gif") {
    extension = "gif";
  }

  const buffer = Buffer.from(base64Data, "base64");
  await fs.mkdir(avatarUploadsDir, { recursive: true });

  const filename = `${userId}-${Date.now()}.${extension}`;
  const absolutePath = path.join(avatarUploadsDir, filename);
  await fs.writeFile(absolutePath, buffer);

  return `/uploads/avatars/${filename}`;
}

async function normalizeAvatarValue(userId, input, currentAvatarUrl) {
  const current = normalizeStoredAvatarUrl(currentAvatarUrl);

  if (input === undefined) {
    return { value: undefined, remove: null };
  }

  if (typeof input !== "string") {
    return { value: current, remove: null };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return {
      value: DEFAULT_AVATAR_URL,
      remove: currentAvatarUrl && currentAvatarUrl.startsWith("/uploads/avatars/") ? currentAvatarUrl : null,
    };
  }

  if (isDataImageUri(trimmed)) {
    const savedPath = await saveAvatarDataUri(trimmed, userId);
    const shouldRemove = currentAvatarUrl && currentAvatarUrl.startsWith("/uploads/avatars/") ? currentAvatarUrl : null;
    return { value: savedPath, remove: shouldRemove };
  }

  if (currentAvatarUrl === trimmed) {
    return { value: currentAvatarUrl, remove: null };
  }

  if (trimmed === DEFAULT_AVATAR_URL) {
    return {
      value: DEFAULT_AVATAR_URL,
      remove: currentAvatarUrl && currentAvatarUrl.startsWith("/uploads/avatars/") ? currentAvatarUrl : null,
    };
  }

  return { value: trimmed, remove: null };
}

function mapProfileRow(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    bio: row.bio ?? "",
    avatarUrl: normalizeStoredAvatarUrl(row.avatar_url),
    coverUrl: row.cover_url ?? DEFAULT_COVER_URL,
    location: row.location ?? "",
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
    lastSeenAt:
      row.last_seen_at?.toISOString?.() ??
      row.last_seen_at ??
      row.updated_at?.toISOString?.() ??
      row.updated_at ??
      null,
    isOfficial: Boolean(row.is_official ?? row.isOfficial ?? false),
  };
}

function mapPostRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    authorId: row.authorId ?? row.post_author_id ?? row.author_id ?? row.user_id,
    title: row.title,
    content: row.content,
    imageUrl: row.image_url ?? null,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
    likesCount: Number(row.likes_count) || 0,
    commentsCount: Number(row.comments_count) || 0,
    author: {
      id: row.post_author_id ?? row.author_id ?? row.user_id,
      username: row.author_username ?? "",
      displayName: row.author_display_name ?? row.author_username ?? "",
      avatarUrl: normalizeStoredAvatarUrl(row.author_avatar_url),
    },
  };
}

function mapNotificationRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    authorId: row.authorId ?? row.post_author_id ?? row.author_id ?? row.user_id,
    type: row.type,
    title: row.title ?? "",
    body: row.body ?? "",
    iconUrl: row.icon_url ?? "",
    link: row.link ?? "",
    isRead: row.is_read ?? false,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

function mapFollowerRow(row) {
  return {
    followerId: row.follower_id,
    followingId: row.following_id,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    username: row.username ?? null,
    displayName: row.display_name ?? null,
    avatarUrl: normalizeStoredAvatarUrl(row.avatar_url),
  };
}

export async function ensureProfileForUser(userId) {
  if (isDatabaseEnabled()) {
    await ensureProfileTables();
    const pool = getPool();
    await pool.query(
      `
        INSERT INTO user_profiles (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `,
      [userId],
    );
    return;
  }

  await ensureDataFiles();
  const text = await fs.readFile(profilesFilePath, "utf8");
  const profiles = JSON.parse(text);
  if (!profiles[userId]) {
    profiles[userId] = {
      bio: "",
      avatarUrl: DEFAULT_AVATAR_URL,
      coverUrl: DEFAULT_COVER_URL,
      location: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      isOfficial: false,
    };
    await fs.writeFile(profilesFilePath, JSON.stringify(profiles, null, 2), "utf8");
  }
}

export async function updateProfileLastSeen(userId) {
  const isoNow = new Date().toISOString();

  if (isDatabaseEnabled()) {
    await ensureProfileTables();
    const pool = getPool();
    await pool.query(
      `
        UPDATE user_profiles
        SET last_seen_at = NOW()
        WHERE user_id = $1
      `,
      [userId],
    );
    return isoNow;
  }

  await ensureDataFiles();
  const text = await fs.readFile(profilesFilePath, "utf8");
  const profiles = JSON.parse(text);
  const profile = profiles[userId];
  if (profile) {
    profile.lastSeenAt = isoNow;
    profiles[userId] = profile;
    await fs.writeFile(profilesFilePath, JSON.stringify(profiles, null, 2), "utf8");
  }
  return isoNow;
}

export async function getProfileByUsername(usernameLower) {
  if (isDatabaseEnabled()) {
    await ensureProfileTables();
    const pool = getPool();
    const result = await pool.query(
      `
        SELECT
          u.id,
          u.username,
          u.username_lower,
          u.display_name,
          u.created_at,
          u.updated_at,
          p.user_id,
          p.bio,
          p.avatar_url,
          p.cover_url,
          p.location,
          p.created_at AS profile_created_at,
          p.updated_at AS profile_updated_at,
          p.last_seen_at,
          p.is_official,
          (SELECT COUNT(*)::int FROM user_followers WHERE following_id = u.id) AS followers_count,
          (SELECT COUNT(*)::int FROM user_followers WHERE follower_id = u.id) AS following_count,
          (SELECT COUNT(*)::int FROM user_posts WHERE user_id = u.id) AS posts_count,
          (SELECT COUNT(*)::int FROM user_notifications WHERE user_id = u.id AND is_read = false AND type <> 'messages.direct') AS unread_notifications
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        WHERE u.username_lower = $1
        LIMIT 1
      `,
      [usernameLower],
    );

    if (!result.rows.length) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      usernameLower: row.username_lower,
      displayName: row.display_name,
      createdAt: row.created_at?.toISOString?.() ?? row.created_at,
      updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
      profile: mapProfileRow({
        user_id: row.user_id ?? row.id,
        bio: row.bio,
        avatar_url: row.avatar_url,
        cover_url: row.cover_url,
        location: row.location,
        created_at: row.profile_created_at,
        updated_at: row.profile_updated_at,
        last_seen_at: row.last_seen_at,
        is_official: row.is_official,
      }),
      stats: {
        followers: Number(row.followers_count) || 0,
        following: Number(row.following_count) || 0,
        posts: Number(row.posts_count) || 0,
        unreadNotifications: Number(row.unread_notifications) || 0,
      },
    };
  }

  await ensureDataFiles();
  const [usersText, profilesText, postsText, followersText, notificationsText] = await Promise.all([
    fs.readFile(usersFilePath, "utf8"),
    fs.readFile(profilesFilePath, "utf8"),
    fs.readFile(postsFilePath, "utf8"),
    fs.readFile(followersFilePath, "utf8"),
    fs.readFile(notificationsFilePath, "utf8"),
  ]);

  const users = JSON.parse(usersText);
  const profiles = JSON.parse(profilesText);
  const posts = JSON.parse(postsText);
  const followers = JSON.parse(followersText);
  const notifications = JSON.parse(notificationsText);

  const user = Object.values(users).find((item) => item.usernameLower === usernameLower);
  if (!user) {
    return null;
  }

  const profile = profiles[user.id] ?? {
    bio: "",
    avatarUrl: DEFAULT_AVATAR_URL,
    coverUrl: DEFAULT_COVER_URL,
    location: "",
    lastSeenAt: new Date().toISOString(),
    isOfficial: false,
  };

  profile.isOfficial = Boolean(profile.isOfficial);

  const userPosts = Object.values(posts)
    .flat()
    .filter((post) => post.userId === user.id);

  const followersCount = Object.values(followers)
    .flat()
    .filter((relation) => relation.followingId === user.id).length;

  const followingCount = Object.values(followers)
    .flat()
    .filter((relation) => relation.followerId === user.id).length;

  const unreadNotifications = Object.values(notifications)
    .flat()
    .filter((item) => item.userId === user.id && !item.isRead && item.type !== "messages.direct").length;

  return {
    id: user.id,
    username: user.username,
    usernameLower: user.usernameLower,
    displayName: user.displayName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: {
      userId: user.id,
      bio: profile.bio ?? "",
      avatarUrl: normalizeStoredAvatarUrl(profile.avatarUrl),
      coverUrl: profile.coverUrl ?? "",
      location: profile.location ?? "",
      createdAt: profile.createdAt ?? user.createdAt,
      updatedAt: profile.updatedAt ?? user.updatedAt,
      lastSeenAt: profile.lastSeenAt ?? profile.updatedAt ?? user.updatedAt ?? null,
    },
    stats: {
      followers: followersCount,
      following: followingCount,
      posts: userPosts.length,
      unreadNotifications,
    },
  };
}

export async function updateProfile(userId, { displayName, bio, avatarUrl, coverUrl, location, isOfficial }) {
  const normalizedIsOfficial = typeof isOfficial === "boolean" ? isOfficial : undefined;
  if (isDatabaseEnabled()) {
    await ensureProfileTables();
    const pool = getPool();

    let normalizedAvatar = avatarUrl;
    let avatarToRemove = null;
    if (avatarUrl !== undefined) {
      const existing = await pool.query(
        `
          SELECT avatar_url
          FROM user_profiles
          WHERE user_id = $1
          LIMIT 1
        `,
        [userId],
      );
      const currentAvatarUrl = normalizeStoredAvatarUrl(existing.rows[0]?.avatar_url);
      const result = await normalizeAvatarValue(userId, avatarUrl, currentAvatarUrl);
      normalizedAvatar = normalizeStoredAvatarUrl(result.value);
      avatarToRemove = result.remove;
    }

    if (displayName !== undefined) {
      await pool.query(
        `
          UPDATE users
          SET display_name = $1, updated_at = NOW()
          WHERE id = $2
        `,
        [displayName, userId],
      );
    }

    await pool.query(
      `
        INSERT INTO user_profiles (user_id, bio, avatar_url, cover_url, location, is_official)
        VALUES ($1, COALESCE($2, ''), COALESCE($3, $7), COALESCE($4, $8), COALESCE($5, ''), COALESCE($6, false))
        ON CONFLICT (user_id)
        DO UPDATE SET
          bio = COALESCE(EXCLUDED.bio, user_profiles.bio),
          avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
          cover_url = COALESCE(EXCLUDED.cover_url, user_profiles.cover_url),
          location = COALESCE(EXCLUDED.location, user_profiles.location),
          is_official = COALESCE(EXCLUDED.is_official, user_profiles.is_official),
          updated_at = NOW()
      `,
      [userId, bio ?? null, normalizedAvatar ?? null, coverUrl ?? null, location ?? null, normalizedIsOfficial ?? null, DEFAULT_AVATAR_URL, DEFAULT_COVER_URL],
    );

    if (avatarToRemove) {
      await deleteAvatarFile(avatarToRemove);
    }

    return;
  }

  await ensureDataFiles();
  const [usersText, profilesText] = await Promise.all([fs.readFile(usersFilePath, "utf8"), fs.readFile(profilesFilePath, "utf8")]);
  const usersData = JSON.parse(usersText);
  const profiles = JSON.parse(profilesText);

  const user = Object.values(usersData).find((entry) => entry.id === userId);
  if (!user) {
    return;
  }

  if (displayName !== undefined) {
    user.displayName = displayName;
    user.updatedAt = new Date().toISOString();
  }

  const profile = profiles[userId] ?? {
    bio: "",
    avatarUrl: DEFAULT_AVATAR_URL,
    coverUrl: DEFAULT_COVER_URL,
    location: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  profile.avatarUrl = normalizeStoredAvatarUrl(profile.avatarUrl);

  if (avatarUrl !== undefined) {
    const { value, remove } = await normalizeAvatarValue(userId, avatarUrl, profile.avatarUrl);
    profile.avatarUrl = normalizeStoredAvatarUrl(value ?? profile.avatarUrl);
    if (remove) {
      await deleteAvatarFile(remove);
    }
  }

  if (bio !== undefined) profile.bio = bio;
  if (coverUrl !== undefined) profile.coverUrl = coverUrl;
  if (location !== undefined) profile.location = location;
  profile.updatedAt = new Date().toISOString();

  profiles[userId] = profile;

  await Promise.all([
    fs.writeFile(usersFilePath, JSON.stringify(usersData, null, 2), "utf8"),
    fs.writeFile(profilesFilePath, JSON.stringify(profiles, null, 2), "utf8"),
  ]);
}

export async function getPostsByUser(userId, { limit = 10, offset = 0 } = {}) {
  if (isDatabaseEnabled()) {
    await ensureProfileTables();
    const pool = getPool();
    const result = await pool.query(
      `
        SELECT
          p.id,
          p.user_id,
          p.author_id AS post_author_id,
          p.title,
          p.content,
          p.image_url,
          p.created_at,
          p.updated_at,
          p.likes_count,
          p.comments_count,
          author.id AS author_id,
          author.username AS author_username,
          author.display_name AS author_display_name,
          COALESCE(author_profile.avatar_url, '${DEFAULT_AVATAR_URL}') AS author_avatar_url
        FROM user_posts p
        LEFT JOIN users author ON author.id = COALESCE(p.author_id, p.user_id)
        LEFT JOIN user_profiles author_profile ON author_profile.user_id = author.id
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [userId, limit, offset],
    );
    return result.rows.map(mapPostRow);
  }

  await ensureDataFiles();
  const [postsText, usersText, profilesText] = await Promise.all([
    fs.readFile(postsFilePath, "utf8"),
    fs.readFile(usersFilePath, "utf8"),
    fs.readFile(profilesFilePath, "utf8"),
  ]);
  const posts = JSON.parse(postsText);
  const users = JSON.parse(usersText);
  const profiles = JSON.parse(profilesText);

  const list = (posts[userId] ?? []).slice(offset, offset + limit);

  return list.map((post) => {
    const userRecord = Array.isArray(users)
      ? users.find((item) => item.id === post.userId)
      : Object.values(users).find((item) => item.id === post.userId);

    const profile = profiles[post.userId] ?? {
      avatarUrl: DEFAULT_AVATAR_URL,
    };

    return {
      ...post,
      author: {
        id: post.userId,
        username: userRecord?.username ?? "",
        displayName: userRecord?.displayName ?? userRecord?.username ?? "",
        avatarUrl: normalizeStoredAvatarUrl(profile.avatarUrl),
      },
    };
  });
}

export async function getNotificationsByUser(userId, { limit = 10, offset = 0 } = {}) {
  if (isDatabaseEnabled()) {
    await ensureProfileTables();
    const pool = getPool();
    const result = await pool.query(
      `
        SELECT id, user_id, type, title, body, icon_url, link, is_read, created_at, author_id
        FROM user_notifications
        WHERE user_id = $1 AND type <> 'messages.direct'
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [userId, limit, offset],
    );
    return result.rows.map(mapNotificationRow);
  }

  await ensureDataFiles();
  const text = await fs.readFile(notificationsFilePath, "utf8");
  const data = JSON.parse(text);
  return (data[userId] ?? [])
    .filter((item) => item.type !== "messages.direct")
    .slice(offset, offset + limit);
}

export async function getFollowersByUser(userId, { limit = 12, offset = 0 } = {}) {
  if (isDatabaseEnabled()) {
    await ensureProfileTables();
    const pool = getPool();
    const result = await pool.query(
      `
        SELECT
          f.follower_id,
          f.following_id,
          f.created_at,
          u.username,
          u.display_name,
          COALESCE(p.avatar_url, '${DEFAULT_AVATAR_URL}') AS avatar_url
        FROM user_followers f
        JOIN users u ON u.id = f.follower_id
        LEFT JOIN user_profiles p ON p.user_id = u.id
        WHERE f.following_id = $1
        ORDER BY f.created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [userId, limit, offset],
    );
    return result.rows.map(mapFollowerRow);
  }

  await ensureDataFiles();
  const text = await fs.readFile(followersFilePath, "utf8");
  const data = JSON.parse(text);
  return (data[userId] ?? []).slice(offset, offset + limit);
}

export async function getFollowingByUser(userId, { limit = 12, offset = 0 } = {}) {
  if (isDatabaseEnabled()) {
    await ensureProfileTables();
    const pool = getPool();
    const result = await pool.query(
      `
        SELECT
          f.follower_id,
          f.following_id,
          f.created_at,
          u.username,
          u.display_name,
          COALESCE(p.avatar_url, '${DEFAULT_AVATAR_URL}') AS avatar_url
        FROM user_followers f
        JOIN users u ON u.id = f.following_id
        LEFT JOIN user_profiles p ON p.user_id = u.id
        WHERE f.follower_id = $1
        ORDER BY f.created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [userId, limit, offset],
    );
    return result.rows.map(mapFollowerRow);
  }

  await ensureDataFiles();
  const text = await fs.readFile(followersFilePath, "utf8");
  const data = JSON.parse(text);

  const followingRelations = Object.values(data)
    .flat()
    .filter((relation) => relation.followerId === userId);

  return followingRelations.slice(offset, offset + limit);
}

export async function setFollowStatus(followerId, followingId, shouldFollow) {
  if (followerId === followingId) {
    return false;
  }

  if (isDatabaseEnabled()) {
    await ensureProfileTables();
    const pool = getPool();

    if (shouldFollow) {
      const result = await pool.query(
        `
          INSERT INTO user_followers (follower_id, following_id)
          VALUES ($1, $2)
          ON CONFLICT (follower_id, following_id) DO NOTHING
        `,
        [followerId, followingId],
      );
      return result.rowCount > 0;
    }

    const result = await pool.query(
      `
        DELETE FROM user_followers
        WHERE follower_id = $1 AND following_id = $2
      `,
      [followerId, followingId],
    );
    return result.rowCount > 0;
  }

  await ensureDataFiles();
  const text = await fs.readFile(followersFilePath, "utf8");
  const data = JSON.parse(text);
  const list = Array.isArray(data[followingId]) ? data[followingId] : [];

  let changed = false;

  if (shouldFollow) {
    const exists = list.some((relation) => relation.followerId === followerId);
    if (!exists) {
      const [usersText, profilesText] = await Promise.all([
        fs.readFile(usersFilePath, "utf8"),
        fs.readFile(profilesFilePath, "utf8"),
      ]);

      let users;
      try {
        users = JSON.parse(usersText);
      } catch {
        users = [];
      }

      let profiles;
      try {
        profiles = JSON.parse(profilesText);
      } catch {
        profiles = {};
      }

      const allUsers = Array.isArray(users) ? users : Object.values(users);
      const followerUser = allUsers.find((user) => user.id === followerId) ?? null;
      const followerProfile = profiles[followerId] ?? {};

      list.push({
        followerId,
        followingId,
        createdAt: new Date().toISOString(),
        username: followerUser?.username ?? null,
        displayName: followerUser?.displayName ?? followerUser?.username ?? null,
        avatarUrl: normalizeStoredAvatarUrl(followerProfile.avatarUrl),
      });
      data[followingId] = list;
      changed = true;
    }
  } else {
    const next = list.filter((relation) => relation.followerId !== followerId);
    if (next.length !== list.length) {
      data[followingId] = next;
      changed = true;
    }
  }

  if (changed) {
    await fs.writeFile(followersFilePath, JSON.stringify(data, null, 2), "utf8");
  }

  return changed;
}

export async function createPost(userId, authorId, { title, content, imageUrl }) {
  const post = {
    id: randomUUID(),
    userId,
    authorId,
    title: title ?? null,
    content,
    imageUrl: imageUrl ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    likesCount: 0,
    commentsCount: 0,
  };

  if (isDatabaseEnabled()) {
    await ensureProfileTables();
    const pool = getPool();
    await pool.query(
        `
          INSERT INTO user_posts (id, user_id, author_id, title, content, image_url, created_at, updated_at, likes_count, comments_count)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
      [
        post.id,
        userId,
        authorId,
        post.title,
        post.content,
        post.imageUrl,
        post.createdAt,
        post.updatedAt,
        post.likesCount,
        post.commentsCount,
      ],
    );
    if (authorId) {
      await pool.query(
        `
          UPDATE user_posts
          SET author_id = $1
          WHERE id = $2
        `,
        [authorId, post.id],
      );
    }

    const result = await pool.query(
      `
        SELECT
          p.id,
          p.user_id,
          p.author_id AS post_author_id,
          p.title,
          p.content,
          p.image_url,
          p.created_at,
          p.updated_at,
          p.likes_count,
          p.comments_count,
          author.id AS author_id,
          author.username AS author_username,
          author.display_name AS author_display_name,
          COALESCE(author_profile.avatar_url, '${DEFAULT_AVATAR_URL}') AS author_avatar_url
        FROM user_posts p
        LEFT JOIN users author ON author.id = COALESCE(p.author_id, p.user_id)
        LEFT JOIN user_profiles author_profile ON author_profile.user_id = author.id
        WHERE p.id = $1
        LIMIT 1
      `,
      [post.id],
    );

    return mapPostRow(result.rows[0]);
  }

  await ensureDataFiles();
  const [postsText, usersText, profilesText] = await Promise.all([
    fs.readFile(postsFilePath, "utf8"),
    fs.readFile(usersFilePath, "utf8"),
    fs.readFile(profilesFilePath, "utf8"),
  ]);

  const posts = JSON.parse(postsText);
  const users = JSON.parse(usersText);
  const profiles = JSON.parse(profilesText);

  const list = posts[userId] ?? [];
  list.unshift({ ...post });
  posts[userId] = list;
  await fs.writeFile(postsFilePath, JSON.stringify(posts, null, 2), "utf8");

  const authorRecord = Array.isArray(users)
    ? users.find((item) => item.id === (authorId ?? userId))
    : Object.values(users).find((item) => item.id === (authorId ?? userId));

  const authorProfile = profiles[authorId ?? userId] ?? {
    avatarUrl: DEFAULT_AVATAR_URL,
  };

  return {
    ...post,
    author: {
      id: authorRecord?.id ?? authorId ?? userId,
      username: authorRecord?.username ?? "",
      displayName: authorRecord?.displayName ?? authorRecord?.username ?? "",
      avatarUrl: authorProfile.avatarUrl ?? DEFAULT_AVATAR_URL,
    },
  };
}

export async function createNotification(userId, { type, title, body, iconUrl, link, authorId }) {
  if (type === "messages.direct") {
    return null;
  }
  const notification = {
    id: randomUUID(),
    userId,
    type,
    title: title ?? "",
    body: body ?? "",
    iconUrl: iconUrl ?? "",
    link: link ?? "",
    isRead: false,
    createdAt: new Date().toISOString(),
    authorId: authorId ?? null,
  };

  if (isDatabaseEnabled()) {
    await ensureProfileTables();
    const pool = getPool();
    await pool.query(
      `
        INSERT INTO user_notifications (id, user_id, type, title, body, icon_url, link, is_read, created_at, author_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        notification.id,
        userId,
        notification.type,
        notification.title,
        notification.body,
        notification.iconUrl,
        notification.link,
        notification.isRead,
        notification.createdAt,
        notification.authorId,
      ],
    );
    return mapNotificationRow({
      id: notification.id,
      user_id: userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      icon_url: notification.iconUrl,
      link: notification.link,
      is_read: notification.isRead,
      created_at: notification.createdAt,
      author_id: notification.authorId,
    });
  }

  await ensureDataFiles();
  const text = await fs.readFile(notificationsFilePath, "utf8");
  const data = JSON.parse(text);
  const list = data[userId] ?? [];
  list.unshift(notification);
  data[userId] = list;
  await fs.writeFile(notificationsFilePath, JSON.stringify(data, null, 2), "utf8");
  return notification;
}

export async function markNotificationsAsRead(userId) {
  if (isDatabaseEnabled()) {
    await ensureProfileTables();
    const pool = getPool();
    await pool.query(
      `
        UPDATE user_notifications
        SET is_read = TRUE
        WHERE user_id = $1 AND is_read = FALSE
      `,
      [userId],
    );
    return;
  }

  await ensureDataFiles();
  const text = await fs.readFile(notificationsFilePath, "utf8");
  const data = JSON.parse(text);
  const list = data[userId];
  if (!Array.isArray(list) || list.length === 0) {
    return;
  }

  let updated = false;
  const next = list.map((notification) => {
    if (notification && notification.isRead === false) {
      updated = true;
      return { ...notification, isRead: true };
    }
    return notification;
  });

  if (!updated) {
    return;
  }

  data[userId] = next;
  await fs.writeFile(notificationsFilePath, JSON.stringify(data, null, 2), "utf8");
}



