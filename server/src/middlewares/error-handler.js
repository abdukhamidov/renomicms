import { logger } from "../utils/logger.js";
import { HttpError } from "../utils/http-error.js";

function isHttpErrorLike(err) {
  if (!err) return false;
  if (err instanceof HttpError) return true;
  return typeof err === "object" && "status" in err && typeof err.status === "number" && "message" in err;
}

export function errorHandler(error, _req, res, _next) {
  logger.error("Unhandled error", error);

  if (isHttpErrorLike(error)) {
    res.status(error.status ?? 500).json({
      status: "error",
      message: error.message ?? "Internal server error",
    });
    return;
  }

  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
}
