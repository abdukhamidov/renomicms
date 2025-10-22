export const USER_ROLES = Object.freeze({
  ADMIN: "admin",
  USER: "user",
});

export const ALL_USER_ROLES = Object.freeze(Object.values(USER_ROLES));

export const DEFAULT_USER_ROLE = USER_ROLES.USER;

export function isValidUserRole(role) {
  return typeof role === "string" && ALL_USER_ROLES.includes(role);
}
