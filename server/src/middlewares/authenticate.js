import { verifyToken } from "../modules/auth/auth.service.js";
import { createHttpError } from "../utils/http-error.js";
import { findUserById } from "../modules/users/user.repository.js";
import { DEFAULT_USER_ROLE } from "../constants/roles.js";

async function resolveRequestUser(token) {
  const decoded = verifyToken(token);
  const user = await findUserById(decoded.sub);
  if (!user) {
    throw createHttpError(401, "Authorization required.");
  }

  return {
    id: user.id,
    role: user.role ?? DEFAULT_USER_ROLE,
    token,
  };
}

export async function authenticate(request, _response, next) {
  const authHeader = request.headers.authorization ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    next(createHttpError(401, "���?��+�?��'�?�? ���?�'�?�?������Ő�?."));
    return;
  }

  const token = authHeader.slice("Bearer".length).trim();
  if (!token) {
    next(createHttpError(401, "���?��+�?��'�?�? ���?�'�?�?������Ő�?."));
    return;
  }

  try {
    request.user = await resolveRequestUser(token);
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuthenticate(request, _response, next) {
  const authHeader = request.headers.authorization ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice("Bearer".length).trim();
  if (!token) {
    next();
    return;
  }

  try {
    request.user = await resolveRequestUser(token);
  } catch (error) {
    // keep optional auth errors silent
  }
  next();
}
