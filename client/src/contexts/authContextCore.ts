import { createContext } from "react";
import type { AuthUser, ProfileCore } from "@/api/auth";

export type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  profile: ProfileCore | null;
  initializing: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: {
    username: string;
    password: string;
    displayName: string;
    gender: "male" | "female";
  }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
};

export type AuthState = {
  user: AuthUser | null;
  token: string | null;
  profile: ProfileCore | null;
};

export const storageKey = "renomicms.auth";

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function readStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.token === "string") {
      return parsed.token;
    }
    return null;
  } catch {
    return null;
  }
}

export function persistToken(token: string | null) {
  if (!token) {
    localStorage.removeItem(storageKey);
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify({ token }));
}
