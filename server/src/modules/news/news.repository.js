import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(new URL("../../..", import.meta.url)));
const serverRoot = path.join(projectRoot, "server");
const dataDir = path.join(serverRoot, "data");
const uploadsDir = path.join(serverRoot, "uploads");
const newsUploadsDir = path.join(uploadsDir, "news");
const newsFilePath = path.join(dataDir, "news.json");
const newsCommentsFilePath = path.join(dataDir, "news-comments.json");

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(newsUploadsDir, { recursive: true });

  try {
    await fs.access(newsFilePath);
  } catch {
    await fs.writeFile(newsFilePath, "[]", "utf8");
  }

  try {
    await fs.access(newsCommentsFilePath);
  } catch {
    await fs.writeFile(newsCommentsFilePath, "[]", "utf8");
  }
}

function sanitizeExtension(extension) {
  if (typeof extension !== "string" || !extension) {
    return ".bin";
  }
  const trimmed = extension.trim();
  if (!trimmed) {
    return ".bin";
  }
  const normalized = trimmed.startsWith(".") ? trimmed.slice(1) : trimmed;
  const safe = normalized.replace(/[^a-z0-9.+-]/gi, "").toLowerCase();
  if (!safe) {
    return ".bin";
  }
  const finalExt = safe === "jpeg" ? "jpg" : safe.slice(0, 16);
  return `.${finalExt}`;
}

export async function readNewsItems() {
  await ensureStore();
  const content = await fs.readFile(newsFilePath, "utf8");
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) => item && typeof item === "object");
  } catch {
    return [];
  }
}

export async function writeNewsItems(items) {
  await ensureStore();
  await fs.writeFile(newsFilePath, JSON.stringify(items, null, 2), "utf8");
}

export async function readNewsComments() {
  await ensureStore();
  const content = await fs.readFile(newsCommentsFilePath, "utf8");
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) => item && typeof item === "object");
  } catch {
    return [];
  }
}

export async function writeNewsComments(comments) {
  await ensureStore();
  await fs.writeFile(newsCommentsFilePath, JSON.stringify(comments, null, 2), "utf8");
}

export async function saveNewsImageFile({ buffer, extension }) {
  if (!buffer || !(buffer instanceof Buffer) || buffer.length === 0) {
    throw new Error("Image buffer is empty");
  }
  await ensureStore();
  const ext = sanitizeExtension(extension);
  const fileName = `${randomUUID()}${ext}`;
  const filePath = path.join(newsUploadsDir, fileName);
  await fs.writeFile(filePath, buffer);
  return `/uploads/news/${fileName}`;
}

export async function deleteNewsImageFile(relativePath) {
  if (typeof relativePath !== "string" || !relativePath.startsWith("/uploads/news/")) {
    return false;
  }

  const fileName = relativePath.slice("/uploads/news/".length);
  if (!fileName) {
    return false;
  }

  const normalized = fileName.replace(/\\/g, "/").split("/").filter(Boolean).join("/");
  if (!normalized) {
    return false;
  }

  const baseDir = path.resolve(newsUploadsDir);
  const targetPath = path.resolve(newsUploadsDir, normalized);
  if (!targetPath.startsWith(baseDir)) {
    return false;
  }

  try {
    await fs.unlink(targetPath);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}
