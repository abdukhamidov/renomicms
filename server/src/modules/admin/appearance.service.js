import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(new URL("../../..", import.meta.url)));
const serverRoot = path.join(projectRoot, "server");
const dataDir = path.join(serverRoot, "data");
const appearanceFilePath = path.join(dataDir, "appearance.json");

const defaultAppearance = Object.freeze({
  logoUrl: "/design/img/logo-icon.png",
});

async function ensureFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(appearanceFilePath);
  } catch {
    await fs.writeFile(appearanceFilePath, JSON.stringify(defaultAppearance, null, 2), "utf8");
  }
}

function normalizeAppearance(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...defaultAppearance };
  }

  const logoUrl = typeof raw.logoUrl === "string" && raw.logoUrl.trim().length > 0 ? raw.logoUrl.trim() : defaultAppearance.logoUrl;

  return {
    logoUrl,
  };
}

export async function getAppearanceSettings() {
  await ensureFile();

  try {
    const content = await fs.readFile(appearanceFilePath, "utf8");
    const parsed = JSON.parse(content);
    return normalizeAppearance(parsed);
  } catch {
    return { ...defaultAppearance };
  }
}

export async function updateAppearanceSettings(payload) {
  const current = await getAppearanceSettings();

  const logoUrl = payload.logoUrl !== undefined ? normalizeAppearance({ logoUrl: payload.logoUrl }).logoUrl : current.logoUrl;

  const next = {
    logoUrl,
  };

  await fs.writeFile(appearanceFilePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}
