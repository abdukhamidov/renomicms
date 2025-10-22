import { createHttpError } from "../../utils/http-error.js";

function assertLength(value, min, max, field) {
  if (value.length < min || value.length > max) {
    throw createHttpError(400, `${field} должен содержать от ${min} до ${max} символов.`);
  }
}

export function validateUsername(value) {
  if (typeof value !== "string") {
    throw createHttpError(400, "Логин обязателен.");
  }
  const username = value.trim();
  assertLength(username, 3, 15, "Логин");
  return username;
}

export function validatePassword(value, field = "Пароль") {
  if (typeof value !== "string") {
    throw createHttpError(400, `${field} обязателен.`);
  }
  const password = value;
  assertLength(password, 6, 32, field);
  return password;
}

export function validateDisplayName(value) {
  if (typeof value !== "string") {
    throw createHttpError(400, "Имя обязательно.");
  }
  const displayName = value.trim();
  assertLength(displayName, 3, 15, "Имя");
  return displayName;
}

export function validateGender(value) {
  if (typeof value !== "string") {
    throw createHttpError(400, "Пол обязателен.");
  }
  const gender = value.trim().toLowerCase();
  if (!["male", "female"].includes(gender)) {
    throw createHttpError(400, "Пол должен быть 'male' или 'female'.");
  }
  return gender;
}

export function validateRegisterBody(body) {
  if (!body || typeof body !== "object") {
    throw createHttpError(400, "Некорректное тело запроса.");
  }

  const username = validateUsername(body.username);
  const password = validatePassword(body.password);
  const displayName = validateDisplayName(body.displayName);
  const gender = validateGender(body.gender);

  return { username, password, displayName, gender };
}

export function validateLoginBody(body) {
  if (!body || typeof body !== "object") {
    throw createHttpError(400, "Некорректное тело запроса.");
  }

  const username = validateUsername(body.username);
  const password = validatePassword(body.password);

  return { username, password };
}
