/* eslint-disable no-console */
function log(level, message, meta) {
  const base = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
  if (meta !== undefined) {
    console[level](base, meta);
  } else {
    console[level](base);
  }
}

export const logger = {
  info: (message, meta) => log("info", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  error: (message, meta) => log("error", message, meta),
};
