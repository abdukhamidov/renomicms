import dotenv from "dotenv";

dotenv.config();

function readRequiredEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === null || value === "") {
    throw new Error(`Environment variable ${name} is required but was not provided.`);
  }
  return value;
}

function toBoolean(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number.parseInt(process.env.PORT ?? "4000", 10),
  enableDatabase: toBoolean(process.env.ENABLE_DATABASE ?? "true"),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: readRequiredEnv("JWT_SECRET", "insecure-dev-secret"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  adminBootstrapToken: process.env.ADMIN_BOOTSTRAP_TOKEN ?? null,
};

if (env.enableDatabase && (!env.databaseUrl || env.databaseUrl.trim() === "")) {
  throw new Error("ENABLE_DATABASE=true, but DATABASE_URL is not set.");
}

export const isProd = env.nodeEnv === "production";
