import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "@/api/auth";
import type { AuthUser, ProfileCore } from "@/api/auth";
import { pingPresence } from "@/api/profile";
import {
  AuthContext,
  type AuthContextValue,
  type AuthState,
  persistToken,
  readStoredToken,
} from "./authContextCore";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, profile: null });
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = readStoredToken();
      if (!token) {
        setInitializing(false);
        return;
      }

      try {
        const response = await authApi.getProfile(token);
        setState({ user: response.user, token, profile: response.profile });
      } catch {
        persistToken(null);
        setState({ user: null, token: null, profile: null });
      } finally {
        setInitializing(false);
      }
    };

    bootstrap().catch(() => {
      setInitializing(false);
    });
  }, []);

  const applyAuth = useCallback(({ user, profile, token }: { user: AuthUser; profile: ProfileCore | null; token: string }) => {
    persistToken(token);
    setState({ user, token, profile });
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const response = await authApi.login({ username, password });
      applyAuth(response);
    },
    [applyAuth],
  );

  const register = useCallback(
    async (payload: {
      username: string;
      password: string;
      displayName: string;
      gender: "male" | "female";
    }) => {
      const response = await authApi.register(payload);
      applyAuth(response);
    },
    [applyAuth],
  );

  const logout = useCallback(() => {
    persistToken(null);
    setState({ user: null, token: null, profile: null });
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.token) return;
    const response = await authApi.getProfile(state.token);
    setState((prev) => ({ ...prev, user: response.user, profile: response.profile }));
  }, [state.token]);

  useEffect(() => {
    const token = state.token;
    if (!token) {
      return;
    }

    let cancelled = false;

    const pollProfile = async () => {
      try {
        await pingPresence(token);
      } catch {
        // ignore presence errors
      }

      try {
        const response = await authApi.getProfile(token);
        if (cancelled) {
          return;
        }

        setState((prev) => {
          const prevUnread = prev.user?.stats?.unreadNotifications;
          const nextUnread = response.user.stats.unreadNotifications;
          const prevLastSeen = prev.profile?.profile?.lastSeenAt ?? null;
          const nextLastSeen = response.profile?.profile?.lastSeenAt ?? null;
          if (prev.user && prev.profile && prevUnread === nextUnread && prevLastSeen === nextLastSeen) {
            return prev;
          }
          return { ...prev, user: response.user, profile: response.profile };
        });
      } catch {
        // ignore polling errors
      }
    };

    void pollProfile();
    const intervalId = window.setInterval(() => {
      void pollProfile();
    }, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void pollProfile();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [state.token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      token: state.token,
      profile: state.profile,
      initializing,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [state.user, state.token, state.profile, initializing, login, register, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
