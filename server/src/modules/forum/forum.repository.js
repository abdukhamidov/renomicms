import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(new URL("../../..", import.meta.url)));
const serverRoot = path.join(projectRoot, "server");
const dataDir = path.join(serverRoot, "data");
const uploadsDir = path.join(serverRoot, "uploads");
const forumUploadsDir = path.join(uploadsDir, "forum");

const categoriesFilePath = path.join(dataDir, "forum-categories.json");
const sectionsFilePath = path.join(dataDir, "forum-sections.json");
const topicsFilePath = path.join(dataDir, "forum-topics.json");
const postsFilePath = path.join(dataDir, "forum-posts.json");

const DEFAULT_TIMESTAMP = new Date().toISOString();

const DEFAULT_CATEGORIES = {
  "cat-nomicms": {
    id: "cat-nomicms",
    slug: "nomicms",
    title: "NomiCMS",
    description: "Обсуждение NomiCMS и связанных проектов",
    icon: "/design/img/logo-red.png",
    order: 1,
    isLocked: false,
    sectionIds: ["sec-nomicms-news", "sec-nomicms-help", "sec-nomicms-releases"],
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
  "cat-community": {
    id: "cat-community",
    slug: "community",
    title: "Сообщество",
    description: "Место для свободного общения и знакомств",
    icon: "/design/img/forum.png",
    order: 2,
    isLocked: false,
    sectionIds: ["sec-community-general", "sec-community-showcase", "sec-community-support", "sec-community-offtopic"],
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
};

const DEFAULT_SECTIONS = {
  "sec-nomicms-news": {
    id: "sec-nomicms-news",
    categoryId: "cat-nomicms",
    slug: "nomicms-news",
    title: "Новости и обновления",
    description: "Официальные объявления о релизах и развитии NomiCMS",
    order: 1,
    icon: "/design/img/folder.png",
    isLocked: false,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
  "sec-nomicms-help": {
    id: "sec-nomicms-help",
    categoryId: "cat-nomicms",
    slug: "nomicms-help",
    title: "Помощь и вопросы",
    description: "Вопросы по установке, настройке и использованию системы",
    order: 2,
    icon: "/design/img/folder.png",
    isLocked: false,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
  "sec-nomicms-releases": {
    id: "sec-nomicms-releases",
    categoryId: "cat-nomicms",
    slug: "nomicms-releases",
    title: "Релизы и патчи",
    description: "Обсуждение выпусков, патчей и исправлений",
    order: 3,
    icon: "/design/img/folder.png",
    isLocked: false,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
  "sec-community-general": {
    id: "sec-community-general",
    categoryId: "cat-community",
    slug: "community-general",
    title: "Общий раздел",
    description: "Главная площадка для общих обсуждений и идей",
    order: 1,
    icon: "/design/img/folder.png",
    isLocked: false,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
  "sec-community-showcase": {
    id: "sec-community-showcase",
    categoryId: "cat-community",
    slug: "community-showcase",
    title: "Проекты участников",
    description: "Показывайте свои работы и делитесь опытом",
    order: 2,
    icon: "/design/img/folder.png",
    isLocked: false,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
  "sec-community-support": {
    id: "sec-community-support",
    categoryId: "cat-community",
    slug: "community-support",
    title: "Поддержка сообщества",
    description: "Вопросы модерации, правила и жалобы",
    order: 3,
    icon: "/design/img/folder.png",
    isLocked: false,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
  "sec-community-offtopic": {
    id: "sec-community-offtopic",
    categoryId: "cat-community",
    slug: "community-offtopic",
    title: "Флуд и оффтоп",
    description: "Общение на свободные темы вне NomiCMS",
    order: 4,
    icon: "/design/img/folder.png",
    isLocked: false,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
};

const DEFAULT_TOPICS = {};
const DEFAULT_POSTS = {};

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });

  const defaults = [
    { path: categoriesFilePath, value: JSON.stringify(DEFAULT_CATEGORIES, null, 2) },
    { path: sectionsFilePath, value: JSON.stringify(DEFAULT_SECTIONS, null, 2) },
    { path: topicsFilePath, value: JSON.stringify(DEFAULT_TOPICS, null, 2) },
    { path: postsFilePath, value: JSON.stringify(DEFAULT_POSTS, null, 2) },
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

async function readJson(filePath, fallback) {
  await ensureStore();
  try {
    const text = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await ensureStore();
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function ensureForumUploadsDir() {
  await fs.mkdir(forumUploadsDir, { recursive: true });
}

export async function readForumCategories() {
  return readJson(categoriesFilePath, {});
}

export async function writeForumCategories(categories) {
  return writeJson(categoriesFilePath, categories);
}

export async function readForumSections() {
  return readJson(sectionsFilePath, {});
}

export async function writeForumSections(sections) {
  return writeJson(sectionsFilePath, sections);
}

export async function readForumTopics() {
  const topics = await readJson(topicsFilePath, {});
  return topics;
}

export async function writeForumTopics(topics) {
  return writeJson(topicsFilePath, topics);
}

export async function readForumPosts() {
  return readJson(postsFilePath, {});
}

export async function writeForumPosts(posts) {
  return writeJson(postsFilePath, posts);
}

export async function readForumData() {
  const [categories, sections, topics, posts] = await Promise.all([
    readForumCategories(),
    readForumSections(),
    readForumTopics(),
    readForumPosts(),
  ]);
  return { categories, sections, topics, posts };
}

export async function writeForumData({ categories, sections, topics, posts }) {
  await Promise.all([
    writeForumCategories(categories),
    writeForumSections(sections),
    writeForumTopics(topics),
    writeForumPosts(posts),
  ]);
}

export async function saveForumAttachmentFile({ extension = "", buffer }) {
  if (!buffer || !(buffer instanceof Buffer) || buffer.length === 0) {
    throw new Error("Attachment buffer is empty");
  }
  await ensureForumUploadsDir();

  const normalizedExtension = typeof extension === "string" ? extension.toLowerCase() : "";
  const cleaned = normalizedExtension.replace(/[^a-z0-9.]/g, "");
  let finalExtension = ".bin";
  if (cleaned) {
    const trimmed = cleaned.startsWith(".") ? cleaned.slice(1) : cleaned;
    if (trimmed) {
      finalExtension = `.${trimmed.slice(0, 16)}`;
    }
  }

  const fileName = `${randomUUID()}${finalExtension}`;
  const filePath = path.join(forumUploadsDir, fileName);
  await fs.writeFile(filePath, buffer);
  return `/uploads/forum/${fileName}`;
}
