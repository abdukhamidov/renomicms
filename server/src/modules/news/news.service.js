import { randomUUID } from "crypto";
import { Buffer } from "buffer";
import { createHttpError } from "../../utils/http-error.js";
import {
  readNewsItems,
  writeNewsItems,
  saveNewsImageFile,
  deleteNewsImageFile,
  readNewsComments,
  writeNewsComments,
} from "./news.repository.js";
import { findUserById } from "../users/user.repository.js";
import { getProfileByUsername } from "../profile/profile.repository.js";
import { DEFAULT_AVATAR_URL } from "../../constants/media.js";

const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 180;
const MAX_CONTENT_LENGTH = 50000;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const DATA_URL_REGEX = /^data:([^;]+);base64,(.+)$/i;
const MIN_COMMENT_LENGTH = 1;
const MAX_COMMENT_LENGTH = 2000;

const MIME_EXTENSION_OVERRIDES = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

function assertAdmin(actor) {
  if (!actor?.id) {
    throw createHttpError(401, "Authorization required.");
  }
  if (actor.role !== "admin") {
    throw createHttpError(403, "Administrator permissions required.");
  }
  return actor;
}

function assertUser(actor) {
  if (!actor?.id) {
    throw createHttpError(401, "Authorization required.");
  }
  return actor;
}

function sanitizeTitle(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function sanitizeContent(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function sanitizeCommentContent(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function slugify(value) {
  if (!value) {
    return null;
  }
  const normalized = value
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

function ensureUniqueSlug(baseSlug, items, excludeId) {
  const existingSlugs = new Set(
    items
      .filter((item) => item.id !== excludeId)
      .map((item) => item.slug)
      .filter((slug) => typeof slug === "string" && slug.length > 0),
  );

  let candidate = baseSlug;
  let suffix = 2;

  while (candidate && existingSlugs.has(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
    if (candidate.length > 80) {
      candidate = candidate.slice(0, 80);
    }
  }

  return candidate ?? null;
}

function buildExcerpt(content, limit = 220) {
  if (!content) {
    return "";
  }
  const plain = content.replace(/<[^>]*>/g, " ");
  const cleaned = plain.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "";
  }
  if (cleaned.length <= limit) {
    return cleaned;
  }
  return `${cleaned.slice(0, Math.max(0, limit - 1)).trim()}…`;
}

function resolveExtensionFromMime(mimeType) {
  if (!mimeType) {
    return ".bin";
  }
  const normalized = mimeType.toLowerCase();
  if (MIME_EXTENSION_OVERRIDES[normalized]) {
    return MIME_EXTENSION_OVERRIDES[normalized];
  }
  const match = normalized.match(/^[a-z0-9.+-]+\/([a-z0-9.+-]+)/);
  if (match) {
    const sub = match[1].replace(/[^a-z0-9]+/g, "-").slice(0, 16);
    if (sub) {
      return `.${sub}`;
    }
  }
  return ".bin";
}

async function resolveCoverImage(coverImage, previousImage) {
  if (typeof coverImage !== "string") {
    return previousImage ?? null;
  }

  const trimmed = coverImage.trim();
  if (!trimmed) {
    if (previousImage && previousImage.startsWith("/uploads/news/")) {
      await deleteNewsImageFile(previousImage);
    }
    return null;
  }

  const dataUrlMatch = trimmed.match(DATA_URL_REGEX);
  if (dataUrlMatch) {
    const mimeType = dataUrlMatch[1] ?? "application/octet-stream";
    const base64 = dataUrlMatch[2] ?? "";
    let buffer;
    try {
      buffer = Buffer.from(base64, "base64");
    } catch {
      throw createHttpError(400, "News image data is invalid.");
    }
    if (!buffer || buffer.length === 0) {
      throw createHttpError(400, "News image data is empty.");
    }
    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw createHttpError(413, "News image exceeds the maximum allowed size.");
    }

    if (previousImage && previousImage.startsWith("/uploads/news/")) {
      await deleteNewsImageFile(previousImage).catch(() => {});
    }

    return await saveNewsImageFile({
      buffer,
      extension: resolveExtensionFromMime(mimeType),
    });
  }

  if (trimmed.startsWith("/uploads/news/")) {
    if (previousImage && previousImage !== trimmed && previousImage.startsWith("/uploads/news/")) {
      await deleteNewsImageFile(previousImage).catch(() => {});
    }
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    if (previousImage && previousImage.startsWith("/uploads/news/")) {
      await deleteNewsImageFile(previousImage).catch(() => {});
    }
    return trimmed;
  }

  throw createHttpError(400, "Unsupported news image format.");
}

function mapStoredNewsItem(item, metadata = {}) {
  if (!item || typeof item !== "object") {
    return null;
  }

  return {
    id: String(item.id ?? ""),
    slug: typeof item.slug === "string" ? item.slug : null,
    title: typeof item.title === "string" ? item.title : "",
    content: typeof item.content === "string" ? item.content : "",
    excerpt: typeof item.excerpt === "string" ? item.excerpt : "",
    coverImageUrl: typeof item.coverImageUrl === "string" ? item.coverImageUrl : null,
    authorId: typeof item.authorId === "string" ? item.authorId : null,
    authorDisplayName: typeof item.authorDisplayName === "string" ? item.authorDisplayName : null,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : null,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : null,
    publishedAt: typeof item.publishedAt === "string" ? item.publishedAt : null,
    commentsCount: Number(metadata.commentsCount ?? item.commentsCount ?? 0) || 0,
  };
}

function mapStoredNewsComment(comment) {
  if (!comment || typeof comment !== "object") {
    return null;
  }

  return {
    id: String(comment.id ?? ""),
    newsId: typeof comment.newsId === "string" ? comment.newsId : "",
    authorId: typeof comment.authorId === "string" ? comment.authorId : null,
    authorUsername: typeof comment.authorUsername === "string" ? comment.authorUsername : null,
    authorDisplayName: typeof comment.authorDisplayName === "string" ? comment.authorDisplayName : "",
    authorAvatarUrl: typeof comment.authorAvatarUrl === "string" ? comment.authorAvatarUrl : DEFAULT_AVATAR_URL,
    content: typeof comment.content === "string" ? comment.content : "",
    createdAt: typeof comment.createdAt === "string" ? comment.createdAt : null,
    updatedAt: typeof comment.updatedAt === "string" ? comment.updatedAt : null,
  };
}

function sortNews(items) {
  return [...items].sort((a, b) => {
    const left = a.publishedAt ?? a.createdAt ?? "";
    const right = b.publishedAt ?? b.createdAt ?? "";
    return right.localeCompare(left);
  });
}

function sortNewsComments(comments) {
  return [...comments].sort((a, b) => {
    const left = a.createdAt ?? "";
    const right = b.createdAt ?? "";
    return left.localeCompare(right);
  });
}

export async function listNews(options = {}) {
  const [rawItems, rawComments] = await Promise.all([readNewsItems(), readNewsComments()]);
  const commentsCountMap = new Map();
  for (const comment of rawComments) {
    if (!comment || typeof comment.newsId !== "string") {
      continue;
    }
    const key = comment.newsId;
    const current = commentsCountMap.get(key) ?? 0;
    commentsCountMap.set(key, current + 1);
  }
  const normalized = rawItems
    .map((item) => {
      const key = typeof item?.id === "string" ? item.id : String(item?.id ?? "");
      const commentsCount = key ? commentsCountMap.get(key) ?? 0 : 0;
      return mapStoredNewsItem(item, { commentsCount });
    })
    .filter((item) => item !== null);

  const sorted = sortNews(normalized);
  const limit = typeof options.limit === "number" && options.limit > 0 ? Math.floor(options.limit) : null;
  const page = typeof options.page === "number" && options.page > 0 ? Math.floor(options.page) : 1;
  const start = limit ? (page - 1) * limit : 0;
  const end = limit ? start + limit : sorted.length;

  const items = sorted.slice(start, end);
  return {
    items,
    total: sorted.length,
    page,
    pageSize: limit ?? sorted.length,
  };
}

export async function getNews(newsId) {
  if (!newsId || typeof newsId !== "string") {
    throw createHttpError(400, "News identifier is required.");
  }
  const [rawItems, rawComments] = await Promise.all([readNewsItems(), readNewsComments()]);
  const target = rawItems.find((item) => item && item.id === newsId);
  if (!target) {
    throw createHttpError(404, "News item not found.");
  }
  const commentCount = rawComments.reduce((total, comment) => {
    if (comment && typeof comment.newsId === "string" && comment.newsId === newsId) {
      return total + 1;
    }
    return total;
  }, 0);
  const mapped = mapStoredNewsItem(target, { commentsCount: commentCount });
  if (!mapped) {
    throw createHttpError(404, "News item is corrupted.");
  }
  return mapped;
}

export async function createNews(actor, payload) {
  assertAdmin(actor);

  const title = sanitizeTitle(payload?.title);
  if (!title) {
    throw createHttpError(400, "News title is required.");
  }
  if (title.length < MIN_TITLE_LENGTH) {
    throw createHttpError(400, "News title is too short.");
  }
  if (title.length > MAX_TITLE_LENGTH) {
    throw createHttpError(400, "News title is too long.");
  }

  const content = sanitizeContent(payload?.content);
  if (!content) {
    throw createHttpError(400, "News content is required.");
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    throw createHttpError(400, "News content is too long.");
  }

  const existing = await readNewsItems();
  const id = randomUUID();
  const baseSlug = slugify(title) ?? `news-${id.slice(0, 8)}`;
  const slug = ensureUniqueSlug(baseSlug, existing);
  const coverImageUrl = await resolveCoverImage(payload?.coverImage ?? null, null);
  const now = new Date().toISOString();

  const author = actor?.id ? await findUserById(actor.id) : null;
  const authorDisplayName =
    (author && typeof author.displayName === "string" && author.displayName) ||
    (author && typeof author.username === "string" && author.username) ||
    null;

  const newsItem = {
    id,
    slug,
    title,
    content,
    excerpt: buildExcerpt(content),
    coverImageUrl,
    authorId: actor.id,
    authorDisplayName,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  };

  existing.push(newsItem);
  await writeNewsItems(existing);

  return mapStoredNewsItem(newsItem, { commentsCount: 0 });
}

export async function updateNews(newsId, actor, payload) {
  assertAdmin(actor);

  if (!newsId || typeof newsId !== "string") {
    throw createHttpError(400, "News identifier is required.");
  }

  const existing = await readNewsItems();
  const index = existing.findIndex((item) => item && item.id === newsId);
  if (index === -1) {
    throw createHttpError(404, "News item not found.");
  }

  const current = existing[index];
  const nextTitle = sanitizeTitle(payload?.title ?? current.title ?? "");
  if (!nextTitle) {
    throw createHttpError(400, "News title is required.");
  }
  if (nextTitle.length < MIN_TITLE_LENGTH) {
    throw createHttpError(400, "News title is too short.");
  }
  if (nextTitle.length > MAX_TITLE_LENGTH) {
    throw createHttpError(400, "News title is too long.");
  }

  const nextContent = sanitizeContent(payload?.content ?? current.content ?? "");
  if (!nextContent) {
    throw createHttpError(400, "News content is required.");
  }
  if (nextContent.length > MAX_CONTENT_LENGTH) {
    throw createHttpError(400, "News content is too long.");
  }

  const coverImageProvided = payload && Object.prototype.hasOwnProperty.call(payload, "coverImage");
  const nextCoverImageUrl = coverImageProvided
    ? await resolveCoverImage(payload.coverImage, current.coverImageUrl ?? null)
    : current.coverImageUrl ?? null;
  const now = new Date().toISOString();

  const baseSlug = slugify(nextTitle) ?? current.slug ?? `news-${newsId.slice(0, 8)}`;
  const slug = ensureUniqueSlug(baseSlug, existing, newsId) ?? current.slug ?? null;

  const updated = {
    ...current,
    title: nextTitle,
    content: nextContent,
    excerpt: buildExcerpt(nextContent),
    coverImageUrl: nextCoverImageUrl,
    slug,
    updatedAt: now,
  };

  existing[index] = updated;
  await writeNewsItems(existing);

  const existingComments = await readNewsComments();
  const commentCount = existingComments.reduce((total, comment) => {
    if (comment && typeof comment.newsId === "string" && comment.newsId === newsId) {
      return total + 1;
    }
    return total;
  }, 0);

  return mapStoredNewsItem(updated, { commentsCount: commentCount });
}

export async function deleteNews(newsId, actor) {
  assertAdmin(actor);

  if (!newsId || typeof newsId !== "string") {
    throw createHttpError(400, "News identifier is required.");
  }

  const existing = await readNewsItems();
  const index = existing.findIndex((item) => item && item.id === newsId);
  if (index === -1) {
    throw createHttpError(404, "News item not found.");
  }

  const [removed] = existing.splice(index, 1);
  await writeNewsItems(existing);

  if (removed?.coverImageUrl && removed.coverImageUrl.startsWith("/uploads/news/")) {
    await deleteNewsImageFile(removed.coverImageUrl).catch(() => {});
  }

  const comments = await readNewsComments();
  const remainingComments = comments.filter((comment) => comment && comment.newsId !== newsId);
  if (remainingComments.length !== comments.length) {
    await writeNewsComments(remainingComments);
  }

  return { deleted: true };
}

export async function listNewsComments(newsId) {
  if (!newsId || typeof newsId !== "string") {
    throw createHttpError(400, "News identifier is required.");
  }

  const [newsItems, newsComments] = await Promise.all([readNewsItems(), readNewsComments()]);
  const exists = newsItems.some((item) => item && item.id === newsId);
  if (!exists) {
    throw createHttpError(404, "News item not found.");
  }

  const mapped = newsComments
    .filter((comment) => comment && comment.newsId === newsId)
    .map((comment) => mapStoredNewsComment(comment))
    .filter((comment) => comment !== null);

  return sortNewsComments(mapped);
}

export async function createNewsComment(newsId, actor, payload) {
  assertUser(actor);

  if (!newsId || typeof newsId !== "string") {
    throw createHttpError(400, "News identifier is required.");
  }

  const content = sanitizeCommentContent(payload?.content);
  if (!content) {
    throw createHttpError(400, "Comment text is required.");
  }
  if (content.length < MIN_COMMENT_LENGTH) {
    throw createHttpError(400, "Comment text is required.");
  }
  if (content.length > MAX_COMMENT_LENGTH) {
    throw createHttpError(400, "Comment text is too long.");
  }

  const [newsItems, newsComments] = await Promise.all([readNewsItems(), readNewsComments()]);
  const exists = newsItems.some((item) => item && item.id === newsId);
  if (!exists) {
    throw createHttpError(404, "News item not found.");
  }

  const user = await findUserById(actor.id);
  if (!user) {
    throw createHttpError(401, "User not found.");
  }

  const profile =
    user.username && typeof user.username === "string"
      ? await getProfileByUsername(user.username.toLowerCase())
      : null;

  const now = new Date().toISOString();
  const comment = {
    id: randomUUID(),
    newsId,
    authorId: actor.id,
    authorUsername: user.username ?? null,
    authorDisplayName: user.displayName ?? user.username ?? "User",
    authorAvatarUrl: profile?.profile?.avatarUrl ?? DEFAULT_AVATAR_URL,
    content,
    createdAt: now,
    updatedAt: now,
  };

  newsComments.push(comment);
  await writeNewsComments(newsComments);

  return mapStoredNewsComment(comment);
}
