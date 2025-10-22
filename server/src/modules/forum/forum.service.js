import { randomUUID } from "crypto";
import { createHttpError } from "../../utils/http-error.js";
import { DEFAULT_AVATAR_URL } from "../../constants/media.js";
import { readForumData, readForumTopics, writeForumData, writeForumTopics } from "./forum.repository.js";
import { findUserById } from "../users/user.repository.js";

const MAX_TOPIC_TITLE_LENGTH = 150;
const MIN_TOPIC_TITLE_LENGTH = 3;
const MIN_POST_LENGTH = 1;
const MAX_POST_LENGTH = 20000;

function slugify(value) {
  if (!value) {
    return null;
  }
  const normalized = value
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!normalized) {
    return null;
  }
  return normalized.slice(0, 80);
}

function sanitizeContent(content) {
  if (typeof content !== "string") {
    return "";
  }
  return content.trim();
}

function sanitizeTitle(title) {
  if (typeof title !== "string") {
    return "";
  }
  return title.trim();
}

function createPostExcerpt(content, limit = 140) {
  if (typeof content !== "string") {
    return "";
  }
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "";
  }
  if (cleaned.length <= limit) {
    return cleaned;
  }
  return `${cleaned.slice(0, limit - 1)}...`;
}

function sortByOrder(items) {
  return [...items].sort((a, b) => {
    const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : 0;
    const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : 0;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.title.localeCompare(b.title, "ru", { sensitivity: "base" });
  });
}

async function buildUserLookup(userIds) {
  const unique = Array.from(
    new Set(
      userIds
        .filter((id) => typeof id === "string" && id.length > 0)
        .map((id) => id.trim()),
    ),
  );

  const entries = await Promise.all(
    unique.map(async (id) => {
      try {
        const user = await findUserById(id);
        if (!user) {
          return [
            id,
            {
              id,
              username: null,
              displayName: "???????? ????????????",
              avatarUrl: DEFAULT_AVATAR_URL,
            },
          ];
        }
        return [
          id,
          {
            id: user.id,
            username: user.username ?? null,
            displayName: user.displayName ?? user.username ?? "????????????",
            avatarUrl: DEFAULT_AVATAR_URL,
          },
        ];
      } catch {
        return [
          id,
          {
            id,
            username: null,
            displayName: "???????? ????????????",
            avatarUrl: DEFAULT_AVATAR_URL,
          },
        ];
      }
    }),
  );

  const map = new Map(entries);

  return function resolveUser(userId) {
    if (!userId) {
      return {
        id: null,
        username: null,
        displayName: "???????",
        avatarUrl: DEFAULT_AVATAR_URL,
      };
    }
    if (!map.has(userId)) {
      return {
        id: userId,
        username: null,
        displayName: "????????????",
        avatarUrl: DEFAULT_AVATAR_URL,
      };
    }
    return map.get(userId);
  };
}

function getTopicPostIds(topic, posts) {
  if (Array.isArray(topic.postIds) && topic.postIds.length > 0) {
    const seen = new Set();
    const ordered = [];
    for (const postId of topic.postIds) {
      if (seen.has(postId)) {
        continue;
      }
      const post = posts[postId];
      if (post && post.topicId === topic.id) {
        ordered.push(postId);
        seen.add(postId);
      }
    }
    if (ordered.length > 0) {
      return ordered;
    }
  }

  const fallback = Object.values(posts)
    .filter((post) => post.topicId === topic.id)
    .sort((a, b) => {
      const createdA = new Date(a.createdAt ?? 0).getTime();
      const createdB = new Date(b.createdAt ?? 0).getTime();
      return createdA - createdB;
    })
    .map((post) => post.id);

  return fallback;
}

function getOrderedPosts(topic, posts) {
  const ids = getTopicPostIds(topic, posts);
  const orderedPosts = [];
  const seen = new Set();

  for (const postId of ids) {
    if (seen.has(postId)) {
      continue;
    }
    const post = posts[postId];
    if (post && post.topicId === topic.id) {
      orderedPosts.push(post);
      seen.add(postId);
    }
  }

  const leftovers = Object.values(posts).filter(
    (post) => post.topicId === topic.id && !seen.has(post.id),
  );

  const combined = [...orderedPosts, ...leftovers];
  combined.sort((a, b) => {
    const createdA = new Date(a.createdAt ?? 0).getTime();
    const createdB = new Date(b.createdAt ?? 0).getTime();
    return createdA - createdB;
  });

  return combined;
}

function mapSection(section) {
  return {
    id: section.id,
    slug: section.slug ?? null,
    title: section.title,
    description: section.description ?? "",
    icon: section.icon ?? null,
    order: section.order ?? 0,
    isLocked: Boolean(section.isLocked),
    createdAt: section.createdAt ?? null,
    updatedAt: section.updatedAt ?? null,
  };
}

function mapTopicSummary(topic, resolveUser, postsCount) {
  const repliesCount = Math.max((postsCount ?? 0) - 1, 0);
  const lastPostAuthorId = topic.lastPostUserId ?? topic.authorId ?? null;
  const lastActivity =
    topic.lastPostAt ??
    topic.updatedAt ??
    topic.createdAt ??
    null;

  return {
    id: topic.id,
    sectionId: topic.sectionId,
    slug: topic.slug ?? null,
    title: topic.title,
    author: resolveUser(topic.authorId),
    createdAt: topic.createdAt ?? null,
    updatedAt: topic.updatedAt ?? null,
    isLocked: Boolean(topic.isLocked),
    isPinned: Boolean(topic.isPinned),
    viewCount: Number(topic.viewCount ?? 0),
    repliesCount,
    lastPostAt: lastActivity,
    lastPostAuthor: resolveUser(lastPostAuthorId),
  };
}

function mapTopicDetail(topic, resolveUser, postsCount, viewer) {
  const summary = mapTopicSummary(topic, resolveUser, postsCount);
  const viewerId = viewer?.id ?? null;
  const viewerRole = viewer?.role ?? "user";
  const isTopicAuthor = viewerId && viewerId === topic.authorId;
  const isAdmin = viewerRole === "admin";

  return {
    ...summary,
    permissions: {
      canEdit: Boolean(viewerId) && (isTopicAuthor || isAdmin),
      canDelete: Boolean(viewerId) && (isTopicAuthor || isAdmin),
      canLock: isAdmin,
      canPin: isAdmin,
      canReply: Boolean(viewerId) && (isAdmin || !topic.isLocked),
    },
  };
}

function normalizeVotesMap(rawVotes) {
  if (!rawVotes || typeof rawVotes !== "object") {
    return {};
  }
  const entries = Object.entries(rawVotes).filter(([userId, value]) => {
    if (typeof userId !== "string" || userId.trim().length === 0) {
      return false;
    }
    const numeric = Number(value);
    return numeric === 1 || numeric === -1;
  });
  if (entries.length === 0) {
    return {};
  }
  const normalized = {};
  for (const [userId, value] of entries) {
    normalized[userId] = Number(value) === 1 ? 1 : -1;
  }
  return normalized;
}

function summarizeVotes(votesMap) {
  let upvotes = 0;
  let downvotes = 0;
  for (const value of Object.values(votesMap)) {
    if (value === 1) {
      upvotes += 1;
    } else if (value === -1) {
      downvotes += 1;
    }
  }
  return {
    upvotes,
    downvotes,
    score: upvotes - downvotes,
  };
}

function mapPost(post, resolveUser, viewer, postsMap = {}) {
  const viewerId = viewer?.id ?? null;
  const viewerRole = viewer?.role ?? "user";
  const isAuthor = viewerId && viewerId === post.authorId;
  const isAdmin = viewerRole === "admin";
  const replyToPostId = post.replyToPostId ?? null;

  let replyTo = null;
  if (replyToPostId && typeof postsMap === "object" && postsMap !== null) {
    const targetPost = postsMap[replyToPostId];
    if (targetPost && targetPost.topicId === post.topicId && !targetPost.isDeleted && !targetPost.deletedAt) {
      replyTo = {
        postId: replyToPostId,
        author: resolveUser(targetPost.authorId),
        excerpt: createPostExcerpt(targetPost.content ?? ""),
      };
    }
  }

  const votesMap = normalizeVotesMap(post.votes);
  const { upvotes, downvotes, score } = summarizeVotes(votesMap);
  const viewerVote =
    viewerId && Object.prototype.hasOwnProperty.call(votesMap, viewerId) ? votesMap[viewerId] : 0;

  return {
    id: post.id,
    topicId: post.topicId,
    author: resolveUser(post.authorId),
    content: post.isDeleted ? "" : post.content,
    replyTo,
    isDeleted: Boolean(post.isDeleted),
    createdAt: post.createdAt ?? null,
    updatedAt: post.updatedAt ?? null,
    deletedAt: post.deletedAt ?? null,
    votes: {
      upvotes,
      downvotes,
      score,
      user: viewerVote || 0,
    },
    permissions: {
      canEdit: !post.isDeleted && Boolean(viewerId) && (isAuthor || isAdmin),
      canDelete: !post.isDeleted && Boolean(viewerId) && (isAuthor || isAdmin),
    },
  };
}

function summarizeSectionStats(sectionTopics, posts) {
  let topicsCount = 0;
  let postsCount = 0;
  let lastActivityAt = null;
  let lastActivityUserId = null;

  for (const topic of sectionTopics) {
    if (topic.deletedAt) {
      continue;
    }

    topicsCount += 1;
    const topicPosts = getOrderedPosts(topic, posts).filter((post) => !post.isDeleted && !post.deletedAt);
    postsCount += topicPosts.length;

    const latestTimestamp =
      topic.lastPostAt ??
      (topicPosts.length ? topicPosts[topicPosts.length - 1].updatedAt ?? topicPosts[topicPosts.length - 1].createdAt : null) ??
      topic.updatedAt ??
      topic.createdAt ??
      null;

    if (!latestTimestamp) {
      continue;
    }

    if (!lastActivityAt || new Date(latestTimestamp).getTime() > new Date(lastActivityAt).getTime()) {
      lastActivityAt = latestTimestamp;
      lastActivityUserId = topic.lastPostUserId ?? (topicPosts.length ? topicPosts[topicPosts.length - 1].authorId : topic.authorId);
    }
  }

  return {
    topicsCount,
    postsCount,
    lastActivityAt,
    lastActivityUserId,
  };
}

export async function listForumCategories(viewer) {
  const { categories, sections, topics, posts } = await readForumData();

  const categoryList = sortByOrder(
    Object.values(categories ?? {}).filter((item) => item && !item.deletedAt),
  );

  const sectionMap = sections ?? {};
  const topicList = Object.values(topics ?? {}).filter((item) => item && !item.deletedAt);

  const categoriesPayload = [];

  for (const category of categoryList) {
    const sectionIds = Array.isArray(category.sectionIds) && category.sectionIds.length
      ? category.sectionIds
      : Object.values(sectionMap)
          .filter((section) => section.categoryId === category.id)
          .map((section) => section.id);

    const categorySections = sectionIds
      .map((sectionId) => sectionMap[sectionId])
      .filter((section) => section && !section.deletedAt);

    const orderedSections = sortByOrder(categorySections);

    let categoryTopicsCount = 0;
    let categoryPostsCount = 0;
    let categoryLastActivityAt = null;
    let categoryLastActivityUserId = null;

    const sectionPayload = orderedSections.map((section) => {
      const sectionTopics = topicList.filter((topic) => topic.sectionId === section.id);
      const stats = summarizeSectionStats(sectionTopics, posts);

      categoryTopicsCount += stats.topicsCount;
      categoryPostsCount += stats.postsCount;

      if (stats.lastActivityAt) {
        if (!categoryLastActivityAt || new Date(stats.lastActivityAt).getTime() > new Date(categoryLastActivityAt).getTime()) {
          categoryLastActivityAt = stats.lastActivityAt;
          categoryLastActivityUserId = stats.lastActivityUserId;
        }
      }

      const pinned = sectionTopics
        .filter((topic) => topic.isPinned && !topic.deletedAt)
        .sort((a, b) => {
          const aTime = new Date(a.lastPostAt ?? a.updatedAt ?? a.createdAt ?? 0).getTime();
          const bTime = new Date(b.lastPostAt ?? b.updatedAt ?? b.createdAt ?? 0).getTime();
          return bTime - aTime;
        });

      return {
        ...mapSection(section),
        stats,
        pinnedCount: pinned.length,
      };
    });

    const resolveUser = await buildUserLookup(
      [categoryLastActivityUserId].filter((id) => id),
    );

    categoriesPayload.push({
      id: category.id,
      slug: category.slug ?? null,
      title: category.title,
      description: category.description ?? "",
      icon: category.icon ?? null,
      order: category.order ?? 0,
      isLocked: Boolean(category.isLocked),
      createdAt: category.createdAt ?? null,
      updatedAt: category.updatedAt ?? null,
      stats: {
        topicsCount: categoryTopicsCount,
        postsCount: categoryPostsCount,
        lastActivityAt: categoryLastActivityAt,
        lastActivityUser: resolveUser(categoryLastActivityUserId),
      },
      sections: sectionPayload,
    });
  }

  return categoriesPayload;
}

export async function getForumSection(sectionId, viewer, { page = 1, limit = 20 } = {}) {
  const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.min(Number(limit), 50) : 20;

  const { categories, sections, topics, posts } = await readForumData();
  const section = sections?.[sectionId];

  if (!section || section.deletedAt) {
    throw createHttpError(404, "?????? ?? ??????.");
  }

  const sectionTopics = Object.values(topics ?? {}).filter(
    (topic) => topic.sectionId === sectionId && !topic.deletedAt,
  );

  const pinnedTopics = sectionTopics
    .filter((topic) => topic.isPinned)
    .sort((a, b) => {
      const aTime = new Date(a.lastPostAt ?? a.updatedAt ?? a.createdAt ?? 0).getTime();
      const bTime = new Date(b.lastPostAt ?? b.updatedAt ?? b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });

  const regularTopics = sectionTopics
    .filter((topic) => !topic.isPinned)
    .sort((a, b) => {
      const aTime = new Date(a.lastPostAt ?? a.updatedAt ?? a.createdAt ?? 0).getTime();
      const bTime = new Date(b.lastPostAt ?? b.updatedAt ?? b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });

  const total = regularTopics.length;
  const totalPages = Math.max(Math.ceil(total / safeLimit), 1);
  const start = (safePage - 1) * safeLimit;
  const paginatedTopics = regularTopics.slice(start, start + safeLimit);

  const userIds = new Set();
  for (const topic of sectionTopics) {
    userIds.add(topic.authorId);
    if (topic.lastPostUserId) {
      userIds.add(topic.lastPostUserId);
    }
  }

  const resolveUser = await buildUserLookup(Array.from(userIds));

  const mapWithPostsCount = (topic) => {
    const orderedPosts = getOrderedPosts(topic, posts).filter((post) => !post.isDeleted && !post.deletedAt);
    return mapTopicSummary(topic, resolveUser, orderedPosts.length);
  };

  const pinnedPayload = pinnedTopics.map((topic) => mapWithPostsCount(topic));
  const topicsPayload = paginatedTopics.map((topic) => mapWithPostsCount(topic));

  const category = Object.values(categories ?? {}).find((item) => item.id === section.categoryId) ?? null;
  const isAdmin = viewer?.role === "admin";

  return {
    section: {
      ...mapSection(section),
      category: category
        ? {
            id: category.id,
            title: category.title,
            slug: category.slug ?? null,
          }
        : null,
    },
    pinnedTopics: pinnedPayload,
    topics: topicsPayload,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
    permissions: {
      canCreateTopic: Boolean(viewer?.id) && (isAdmin || !section.isLocked),
      isLocked: Boolean(section.isLocked),
    },
  };
}

export async function getForumTopic(topicId, viewer, { page = 1, limit = 20 } = {}) {
  const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.min(Number(limit), 50) : 20;

  const { sections, topics, posts } = await readForumData();
  const topic = topics?.[topicId];

  if (!topic || topic.deletedAt) {
    throw createHttpError(404, "???? ?? ???????.");
  }

  const section = sections?.[topic.sectionId] ?? null;
  if (!section || section.deletedAt) {
    throw createHttpError(404, "?????? ??? ???? ?? ??????.");
  }

  const orderedPosts = getOrderedPosts(topic, posts).filter((post) => !post.isDeleted && !post.deletedAt);
  const total = orderedPosts.length;
  const totalPages = Math.max(Math.ceil(total / safeLimit), 1);
  const start = (safePage - 1) * safeLimit;
  const paginatedPosts = orderedPosts.slice(start, start + safeLimit);

  const userIds = new Set();
  if (topic.authorId) {
    userIds.add(topic.authorId);
  }
  if (topic.lastPostUserId) {
    userIds.add(topic.lastPostUserId);
  }
  for (const post of paginatedPosts) {
    if (post.authorId) {
      userIds.add(post.authorId);
    }
    if (post.replyToPostId) {
      const target = posts?.[post.replyToPostId];
      if (target?.authorId) {
        userIds.add(target.authorId);
      }
    }
  }

  const resolveUser = await buildUserLookup(Array.from(userIds));

  return {
    topic: mapTopicDetail(topic, resolveUser, orderedPosts.length, viewer),
    section: mapSection(section),
    posts: paginatedPosts.map((post) => mapPost(post, resolveUser, viewer, posts)),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

export async function createForumTopic(sectionId, actor, { title, content }) {
  if (!actor?.id) {
    throw createHttpError(401, "????????? ???????????.");
  }

  const rawTitle = sanitizeTitle(title);
  const rawContent = sanitizeContent(content);

  if (rawTitle.length < MIN_TOPIC_TITLE_LENGTH) {
    throw createHttpError(400, "????????? ??????? ????????.");
  }
  if (rawTitle.length > MAX_TOPIC_TITLE_LENGTH) {
    throw createHttpError(400, "????????? ??????? ???????.");
  }
  if (rawContent.length < MIN_POST_LENGTH) {
    throw createHttpError(400, "????????? ??????? ????????.");
  }
  if (rawContent.length > MAX_POST_LENGTH) {
    throw createHttpError(400, "????????? ??????? ???????.");
  }

  const { categories, sections, topics, posts } = await readForumData();
  const section = sections?.[sectionId];

  if (!section || section.deletedAt) {
    throw createHttpError(404, "?????? ?? ??????.");
  }

  const isAdmin = actor.role === "admin";
  if (section.isLocked && !isAdmin) {
    throw createHttpError(403, "?????? ?????? ??? ????? ???.");
  }

  const topicId = randomUUID();
  const postId = randomUUID();
  const now = new Date().toISOString();
  const normalizedSlug = slugify(rawTitle) ?? topicId;

  const topic = {
    id: topicId,
    sectionId,
    slug: normalizedSlug,
    title: rawTitle,
    authorId: actor.id,
    isLocked: false,
    isPinned: false,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
    lastPostAt: now,
    lastPostUserId: actor.id,
    postIds: [postId],
    deletedAt: null,
  };

  const post = {
    id: postId,
    topicId,
    authorId: actor.id,
    content: rawContent,
    replyToPostId: null,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    deletedAt: null,
    votes: {},
  };

  const updatedTopics = {
    ...topics,
    [topicId]: topic,
  };

  const updatedPosts = {
    ...posts,
    [postId]: post,
  };

  const updatedSections = {
    ...sections,
    [sectionId]: {
      ...section,
      updatedAt: now,
    },
  };

  await writeForumData({
    categories,
    sections: updatedSections,
    topics: updatedTopics,
    posts: updatedPosts,
  });

  const resolveUser = await buildUserLookup([actor.id]);

  return {
    topic: mapTopicDetail(topic, resolveUser, 1, actor),
    post: mapPost(post, resolveUser, actor, updatedPosts),
  };
}

export async function updateForumTopic(topicId, actor, { title, content }) {
  if (!actor?.id) {
    throw createHttpError(401, "????????? ???????????.");
  }

  const { categories, sections, topics, posts } = await readForumData();
  const topic = topics?.[topicId];

  if (!topic || topic.deletedAt) {
    throw createHttpError(404, "???? ?? ???????.");
  }

  const isAdmin = actor.role === "admin";
  const isAuthor = actor.id === topic.authorId;
  if (!isAdmin && !isAuthor) {
    throw createHttpError(403, "???????????? ???? ??? ?????????????? ????.");
  }

  let changed = false;
  const now = new Date().toISOString();
  let updatedTopic = { ...topic };
  const updatedPosts = { ...posts };

  if (typeof title === "string") {
    const normalizedTitle = sanitizeTitle(title);
    if (normalizedTitle.length < MIN_TOPIC_TITLE_LENGTH) {
      throw createHttpError(400, "????????? ??????? ????????.");
    }
    if (normalizedTitle.length > MAX_TOPIC_TITLE_LENGTH) {
      throw createHttpError(400, "????????? ??????? ???????.");
    }
    updatedTopic = {
      ...updatedTopic,
      title: normalizedTitle,
      slug: slugify(normalizedTitle) ?? updatedTopic.slug ?? updatedTopic.id,
      updatedAt: now,
    };
    changed = true;
  }

  if (typeof content === "string") {
    const normalizedContent = sanitizeContent(content);
    if (normalizedContent.length < MIN_POST_LENGTH) {
      throw createHttpError(400, "????????? ??????? ????????.");
    }
    if (normalizedContent.length > MAX_POST_LENGTH) {
      throw createHttpError(400, "????????? ??????? ???????.");
    }

    const postIds = getTopicPostIds(updatedTopic, posts);
    const firstPostId = postIds[0];
    if (!firstPostId) {
      throw createHttpError(409, "????????? ????????? ??????????? ? ?? ????? ???? ?????????.");
    }

    const firstPost = posts[firstPostId];
    if (!firstPost || firstPost.deletedAt || firstPost.isDeleted) {
      throw createHttpError(409, "????????? ????????? ???? ??????? ? ?? ????? ???? ?????????.");
    }

    updatedPosts[firstPostId] = {
      ...firstPost,
      content: normalizedContent,
      updatedAt: now,
    };
    updatedTopic = {
      ...updatedTopic,
      updatedAt: now,
    };
    changed = true;
  }

  if (!changed) {
    return getForumTopic(topicId, actor, { page: 1, limit: 20 });
  }

  const updatedTopics = {
    ...topics,
    [topicId]: updatedTopic,
  };

  await writeForumData({
    categories,
    sections,
    topics: updatedTopics,
    posts: updatedPosts,
  });

  return getForumTopic(topicId, actor, { page: 1, limit: 20 });
}

export async function updateTopicState(topicId, actor, { isLocked, isPinned }) {
  if (!actor?.id) {
    throw createHttpError(401, "????????? ???????????.");
  }

  if (actor.role !== "admin") {
    throw createHttpError(403, "???????????? ???? ??? ????????? ????????? ????.");
  }

  const topics = await readForumTopics();
  const topic = topics?.[topicId];

  if (!topic || topic.deletedAt) {
    throw createHttpError(404, "???? ?? ???????.");
  }

  let changed = false;
  const updatedTopic = { ...topic };

  if (typeof isLocked === "boolean" && isLocked !== topic.isLocked) {
    updatedTopic.isLocked = isLocked;
    changed = true;
  }

  if (typeof isPinned === "boolean" && isPinned !== topic.isPinned) {
    updatedTopic.isPinned = isPinned;
    changed = true;
  }

  if (!changed) {
    return updatedTopic;
  }

  updatedTopic.updatedAt = new Date().toISOString();

  await writeForumTopics({
    ...topics,
    [topicId]: updatedTopic,
  });

  return updatedTopic;
}

export async function incrementTopicView(topicId) {
  const topics = await readForumTopics();
  const topic = topics?.[topicId];

  if (!topic || topic.deletedAt) {
    throw createHttpError(404, "???? ?? ???????.");
  }

  const current = Number(topic.viewCount ?? 0);
  const updatedTopic = {
    ...topic,
    viewCount: current + 1,
  };

  await writeForumTopics({
    ...topics,
    [topicId]: updatedTopic,
  });

  return {
    topicId,
    viewCount: updatedTopic.viewCount,
  };
}

export async function createForumPost(topicId, actor, { content, replyToPostId = null }) {
  if (!actor?.id) {
    throw createHttpError(401, "????????? ???????????.");
  }

  const normalizedContent = sanitizeContent(content);
  const replyTargetId = typeof replyToPostId === "string" && replyToPostId.trim().length > 0 ? replyToPostId.trim() : null;
  if (normalizedContent.length < MIN_POST_LENGTH) {
    throw createHttpError(400, "????????? ??????? ????????.");
  }
  if (normalizedContent.length > MAX_POST_LENGTH) {
    throw createHttpError(400, "????????? ??????? ???????.");
  }

  const { categories, sections, topics, posts } = await readForumData();
  const topic = topics?.[topicId];

  if (!topic || topic.deletedAt) {
    throw createHttpError(404, "???? ?? ???????.");
  }

  if (topic.isLocked && actor.role !== "admin") {
    throw createHttpError(403, "???? ??????? ??? ????? ?????????.");
  }

  let resolvedReplyTarget = null;
  if (replyTargetId) {
    const candidate = posts?.[replyTargetId];
    if (!candidate || candidate.topicId !== topicId || candidate.isDeleted || candidate.deletedAt) {
      throw createHttpError(400, "????????? ???????? ?? ??????.");
    }
    resolvedReplyTarget = candidate;
  }

  const now = new Date().toISOString();
  const postId = randomUUID();

  const post = {
    id: postId,
    topicId,
    authorId: actor.id,
    content: normalizedContent,
    replyToPostId: resolvedReplyTarget ? resolvedReplyTarget.id : null,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    deletedAt: null,
    votes: {},
  };

  const postIds = getTopicPostIds(topic, posts);
  const updatedTopic = {
    ...topic,
    postIds: [...postIds, postId],
    updatedAt: now,
    lastPostAt: now,
    lastPostUserId: actor.id,
  };

  const updatedPosts = {
    ...posts,
    [postId]: post,
  };

  const section = sections?.[topic.sectionId];
  const updatedSections = section
    ? {
        ...sections,
        [section.id]: {
          ...section,
          updatedAt: now,
        },
      }
    : sections;

  await writeForumData({
    categories,
    sections: updatedSections,
    topics: {
      ...topics,
      [topicId]: updatedTopic,
    },
    posts: updatedPosts,
  });

  const userLookupIds = [actor.id];
  if (resolvedReplyTarget?.authorId) {
    userLookupIds.push(resolvedReplyTarget.authorId);
  }
  const resolveUser = await buildUserLookup(userLookupIds);

  return mapPost(post, resolveUser, actor, updatedPosts);
}

function recalculateTopicAfterPostRemoval(topic, posts) {
  const orderedPosts = getOrderedPosts(topic, posts).filter((post) => !post.isDeleted && !post.deletedAt);
  const lastPost = orderedPosts[orderedPosts.length - 1] ?? null;

  return {
    ...topic,
    postIds: orderedPosts.map((post) => post.id),
    lastPostAt: lastPost ? lastPost.updatedAt ?? lastPost.createdAt : topic.createdAt,
    lastPostUserId: lastPost ? lastPost.authorId : topic.authorId,
    updatedAt: new Date().toISOString(),
  };
}

export async function updateForumPost(postId, actor, { content }) {
  if (!actor?.id) {
    throw createHttpError(401, "????????? ???????????.");
  }

  const normalizedContent = sanitizeContent(content);
  if (normalizedContent.length < MIN_POST_LENGTH) {
    throw createHttpError(400, "????????? ??????? ????????.");
  }
  if (normalizedContent.length > MAX_POST_LENGTH) {
    throw createHttpError(400, "????????? ??????? ???????.");
  }

  const { categories, sections, topics, posts } = await readForumData();
  const post = posts?.[postId];

  if (!post || post.isDeleted || post.deletedAt) {
    throw createHttpError(404, "????????? ?? ???????.");
  }

  const topic = topics?.[post.topicId];
  if (!topic || topic.deletedAt) {
    throw createHttpError(404, "???? ?? ???????.");
  }

  const isAdmin = actor.role === "admin";
  const isAuthor = actor.id === post.authorId;
  if (!isAdmin && !isAuthor) {
    throw createHttpError(403, "???????????? ???? ??? ?????????????? ?????????.");
  }

  const now = new Date().toISOString();

  const updatedPosts = {
    ...posts,
    [postId]: {
      ...post,
      content: normalizedContent,
      updatedAt: now,
    },
  };

  const updatedTopic =
    topic.postIds?.[topic.postIds.length - 1] === postId
      ? {
          ...topic,
          lastPostAt: now,
          lastPostUserId: post.authorId,
          updatedAt: now,
        }
      : { ...topic, updatedAt: now };

  await writeForumData({
    categories,
    sections,
    topics: {
      ...topics,
      [topic.id]: updatedTopic,
    },
    posts: updatedPosts,
  });

  const userIdsForLookup = [post.authorId];
  if (post.replyToPostId) {
    const target = updatedPosts[post.replyToPostId];
    if (target?.authorId) {
      userIdsForLookup.push(target.authorId);
    }
  }
  const resolveUser = await buildUserLookup(userIdsForLookup);
  return mapPost(updatedPosts[postId], resolveUser, actor, updatedPosts);
}

export async function voteForumPost(postId, actor, { value }) {
  if (!actor?.id) {
    throw createHttpError(401, "????????? ???????????.");
  }

  const numericValue = Number(value);
  let normalizedValue = 0;
  if (numericValue === 1) {
    normalizedValue = 1;
  } else if (numericValue === -1) {
    normalizedValue = -1;
  } else if (numericValue === 0) {
    normalizedValue = 0;
  } else {
    throw createHttpError(400, "????????? ????? ???????? ????.");
  }

  const { categories, sections, topics, posts } = await readForumData();
  const post = posts?.[postId];

  if (!post || post.isDeleted || post.deletedAt) {
    throw createHttpError(404, "????????? ?? ???????.");
  }

  const topic = topics?.[post.topicId];
  if (!topic || topic.deletedAt) {
    throw createHttpError(404, "???? ?? ???????.");
  }

  const votesMap = normalizeVotesMap(post.votes);
  if (normalizedValue === 0) {
    delete votesMap[actor.id];
  } else {
    votesMap[actor.id] = normalizedValue;
  }

  const updatedPost = {
    ...post,
    votes: votesMap,
  };

  const updatedPosts = {
    ...posts,
    [postId]: updatedPost,
  };

  await writeForumData({
    categories,
    sections,
    topics,
    posts: updatedPosts,
  });

  const lookupIds = [post.authorId, actor.id];
  if (post.replyToPostId) {
    const target = posts?.[post.replyToPostId];
    if (target?.authorId) {
      lookupIds.push(target.authorId);
    }
  }
  const resolveUser = await buildUserLookup(lookupIds);

  return mapPost(updatedPosts[postId], resolveUser, actor, updatedPosts);
}

export async function deleteForumPost(postId, actor) {
  if (!actor?.id) {
    throw createHttpError(401, "????????? ???????????.");
  }

  const { categories, sections, topics, posts } = await readForumData();
  const post = posts?.[postId];

  if (!post || post.isDeleted || post.deletedAt) {
    throw createHttpError(404, "????????? ?? ???????.");
  }

  const topic = topics?.[post.topicId];
  if (!topic || topic.deletedAt) {
    throw createHttpError(404, "???? ?? ???????.");
  }

  const isAdmin = actor.role === "admin";
  const isAuthor = actor.id === post.authorId;
  const isFirstPost = topic.postIds && topic.postIds[0] === postId;

  if (isFirstPost && !isAdmin) {
    throw createHttpError(403, "???????? ??????? ????????? ???????? ?????? ???????????????.");
  }

  if (!isAdmin && !isAuthor) {
    throw createHttpError(403, "???????????? ???? ??? ???????? ?????????.");
  }

  const now = new Date().toISOString();
  const updatedPosts = { ...posts };
  delete updatedPosts[postId];

  if (isFirstPost) {
    const updatedTopics = { ...topics };
    delete updatedTopics[topic.id];

    await writeForumData({
      categories,
      sections,
      topics: updatedTopics,
      posts: Object.fromEntries(
        Object.entries(updatedPosts).filter(([, value]) => value.topicId !== topic.id),
      ),
    });

    return { topicDeleted: true };
  }

  const updatedTopic = recalculateTopicAfterPostRemoval(topic, updatedPosts);
  updatedTopic.updatedAt = now;

  await writeForumData({
    categories,
    sections,
    topics: {
      ...topics,
      [topic.id]: updatedTopic,
    },
    posts: updatedPosts,
  });

  return { postDeleted: true };
}

export async function deleteForumTopic(topicId, actor) {
  if (!actor?.id) {
    throw createHttpError(401, "????????? ???????????.");
  }

  const { categories, sections, topics, posts } = await readForumData();
  const topic = topics?.[topicId];

  if (!topic || topic.deletedAt) {
    throw createHttpError(404, "???? ?? ???????.");
  }

  const isAdmin = actor.role === "admin";
  const isAuthor = actor.id === topic.authorId;
  if (!isAdmin && !isAuthor) {
    throw createHttpError(403, "???????????? ???? ??? ???????? ????.");
  }

  const updatedTopics = { ...topics };
  delete updatedTopics[topicId];

  const updatedPosts = Object.fromEntries(
    Object.entries(posts).filter(([, value]) => value.topicId !== topicId),
  );

  await writeForumData({
    categories,
    sections,
    topics: updatedTopics,
    posts: updatedPosts,
  });

  return { topicDeleted: true };
}








