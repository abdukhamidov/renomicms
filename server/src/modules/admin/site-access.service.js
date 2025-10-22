import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(new URL("../../..", import.meta.url)));
const serverRoot = path.join(projectRoot, "server");
const dataDir = path.join(serverRoot, "data");
const siteAccessFilePath = path.join(dataDir, "site-access.json");

const SITE_ACCESS_MODES = new Set(["public", "auth_only", "maintenance"]);
const defaultState = Object.freeze({
  mode: "public",
  message: "",
});

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(siteAccessFilePath);
  } catch {
    await fs.writeFile(siteAccessFilePath, JSON.stringify(defaultState, null, 2), "utf8");
  }
}

function normalizeState(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...defaultState };
  }

  const mode = SITE_ACCESS_MODES.has(raw.mode) ? raw.mode : defaultState.mode;
  const message = typeof raw.message === "string" ? raw.message : "";

  return {
    mode,
    message,
  };
}

export async function getSiteAccessState() {
  await ensureDataFile();

  try {
    const content = await fs.readFile(siteAccessFilePath, "utf8");
    const parsed = JSON.parse(content);
    return normalizeState(parsed);
  } catch {
    return { ...defaultState };
  }
}

export async function updateSiteAccessState(payload) {
  const current = await getSiteAccessState();

  const modeInput = typeof payload?.mode === "string" ? payload.mode.trim().toLowerCase() : current.mode;
  const mode = SITE_ACCESS_MODES.has(modeInput) ? modeInput : current.mode;

  const message =
    typeof payload?.message === "string"
      ? payload.message.trim()
      : current.message;

  const nextState = {
    mode,
    message,
  };

  await fs.writeFile(siteAccessFilePath, JSON.stringify(nextState, null, 2), "utf8");
  return nextState;
}

