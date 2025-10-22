import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPool, isDatabaseEnabled } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { DEFAULT_USER_ROLE } from "../../constants/roles.js";

const serverRoot = path.dirname(fileURLToPath(new URL("../../..", import.meta.url)));
const dataDir = path.join(serverRoot, "data");
const usersFilePath = path.join(dataDir, "users.json");

let tableInitialized = false;

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(usersFilePath);
  } catch {
    await fs.writeFile(usersFilePath, "[]", "utf8");
  }
}

function normalizeStoredUser(user) {
  if (!user || typeof user !== "object") {
    return null;
  }
  return {
    ...user,
    role: typeof user.role === "string" && user.role.length > 0 ? user.role : DEFAULT_USER_ROLE,
  };
}

async function readUsers() {
  await ensureStore();
  const content = await fs.readFile(usersFilePath, "utf8");
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((user) => normalizeStoredUser(user))
      .filter((user) => user !== null);
  } catch {
    return [];
  }
}

async function writeUsers(users) {
  await ensureStore();
  const normalized = users.map((user) => {
    if (!user || typeof user !== "object") {
      return user;
    }
    return {
      ...user,
      role: typeof user.role === "string" && user.role.length > 0 ? user.role : DEFAULT_USER_ROLE,
    };
  });
  await fs.writeFile(usersFilePath, JSON.stringify(normalized, null, 2), "utf8");
}

function mapRowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    usernameLower: row.username_lower,
    displayName: row.display_name,
    gender: row.gender,
    passwordHash: row.password_hash,
    role: row.role ?? DEFAULT_USER_ROLE,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

async function ensureUsersTable() {
  if (tableInitialized || !isDatabaseEnabled()) return;

  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      username TEXT NOT NULL,
      username_lower TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '${DEFAULT_USER_ROLE}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users (username_lower);
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT '${DEFAULT_USER_ROLE}';
  `);

  tableInitialized = true;
  logger.info("Users table ready");
}

export async function findAllUsers() {
  if (isDatabaseEnabled()) {
    await ensureUsersTable();
    const pool = getPool();
    const result = await pool.query(`
      SELECT id, username, username_lower, display_name, gender, password_hash, role, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `);
    return result.rows.map(mapRowToUser);
  }

  return readUsers();
}

export async function findUserByUsername(username) {
  const normalized = username.trim().toLowerCase();

  if (isDatabaseEnabled()) {
    await ensureUsersTable();
    const pool = getPool();
    const result = await pool.query(
      `
        SELECT id, username, username_lower, display_name, gender, password_hash, role, created_at, updated_at
        FROM users
        WHERE username_lower = $1
        LIMIT 1
      `,
      [normalized],
    );
    return mapRowToUser(result.rows[0]);
  }

  const users = await readUsers();
  return users.find((user) => user.usernameLower === normalized) ?? null;
}

export async function findUserById(id) {
  if (isDatabaseEnabled()) {
    await ensureUsersTable();
    const pool = getPool();
    const result = await pool.query(
      `
        SELECT id, username, username_lower, display_name, gender, password_hash, role, created_at, updated_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );
    return mapRowToUser(result.rows[0]);
  }

  const users = await readUsers();
  return users.find((user) => user.id === id) ?? null;
}

export async function insertUser(user) {
  if (isDatabaseEnabled()) {
    await ensureUsersTable();
    const pool = getPool();
    const result = await pool.query(
      `
        INSERT INTO users (id, username, username_lower, display_name, gender, password_hash, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, username, username_lower, display_name, gender, password_hash, role, created_at, updated_at
      `,
      [
        user.id,
        user.username,
        user.usernameLower,
        user.displayName,
        user.gender,
        user.passwordHash,
        user.role ?? DEFAULT_USER_ROLE,
        new Date(user.createdAt ?? Date.now()),
        new Date(user.updatedAt ?? Date.now()),
      ],
    );
    return mapRowToUser(result.rows[0]);
  }

  const users = await readUsers();
  users.push({
    ...user,
    role: user.role ?? DEFAULT_USER_ROLE,
  });
  await writeUsers(users);
  return {
    ...user,
    role: user.role ?? DEFAULT_USER_ROLE,
  };
}

export async function updateUserPasswordHash(userId, passwordHash) {
  if (isDatabaseEnabled()) {
    await ensureUsersTable();
    const pool = getPool();
    await pool.query(
      `
        UPDATE users
        SET password_hash = $1,
            updated_at = NOW()
        WHERE id = $2
      `,
      [passwordHash, userId],
    );
    return;
  }

  const users = await readUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) {
    return;
  }
  users[index].passwordHash = passwordHash;
  users[index].updatedAt = new Date().toISOString();
  await writeUsers(users);
}

export async function updateUserRole(userId, role) {
  if (isDatabaseEnabled()) {
    await ensureUsersTable();
    const pool = getPool();
    await pool.query(
      `
        UPDATE users
        SET role = $1,
            updated_at = NOW()
        WHERE id = $2
      `,
      [role, userId],
    );
    return;
  }

  const users = await readUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) {
    return;
  }

  users[index] = {
    ...users[index],
    role,
    updatedAt: new Date().toISOString(),
  };
  await writeUsers(users);
}
