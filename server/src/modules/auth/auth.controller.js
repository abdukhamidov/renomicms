import { registerUser, loginUser, getProfileFromToken, changePassword } from "./auth.service.js";
import { validateRegisterBody, validateLoginBody } from "./auth.validators.js";
import { createHttpError } from "../../utils/http-error.js";

export async function register(request, response) {
  const payload = validateRegisterBody(request.body);
  const result = await registerUser(payload);
  response.status(201).json({
    status: "ok",
    ...result,
  });
}

export async function login(request, response) {
  const payload = validateLoginBody(request.body);
  const result = await loginUser(payload);
  response.json({
    status: "ok",
    ...result,
  });
}

export async function me(request, response) {
  const token = request.user?.token;
  if (!token) {
    throw createHttpError(401, "Требуется авторизация.");
  }

  const result = await getProfileFromToken(token);

  response.json({
    status: "ok",
    ...result,
  });
}

export async function updatePassword(request, response) {
  const userId = request.user?.id;
  if (!userId) {
    throw createHttpError(401, "Требуется авторизация.");
  }

  const { currentPassword, newPassword } = request.body ?? {};
  if (!currentPassword || !newPassword) {
    throw createHttpError(400, "Необходимо указать текущий и новый пароли.");
  }

  if (typeof newPassword !== "string" || newPassword.length < 6 || newPassword.length > 32) {
    throw createHttpError(400, "Новый пароль должен содержать от 6 до 32 символов.");
  }

  await changePassword(userId, currentPassword, newPassword);

  response.json({
    status: "ok",
  });
}
