import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchSiteAccess, type SiteAccessState } from "@/api/siteAccess";

type SiteAccessContextValue = {
  status: SiteAccessState;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setStatus: (next: SiteAccessState) => void;
};

const defaultState: SiteAccessState = {
  mode: "public",
  message: "",
};

const SiteAccessContext = createContext<SiteAccessContextValue | undefined>(undefined);

type SiteAccessProviderProps = {
  children: ReactNode;
};

export function SiteAccessProvider({ children }: SiteAccessProviderProps) {
  const [status, setStatus] = useState<SiteAccessState>(defaultState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchSiteAccess();
      setStatus(response.access);
    } catch (fetchError) {
      if (fetchError instanceof Error) {
        setError(fetchError.message);
      } else {
        setError("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0434\u043e\u0441\u0442\u0443\u043f\u0430.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<SiteAccessContextValue>(
    () => ({
      status,
      loading,
      error,
      refresh: () => refresh(),
      setStatus,
    }),
    [status, loading, error, refresh],
  );

  return <SiteAccessContext.Provider value={value}>{children}</SiteAccessContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSiteAccess() {
  const context = useContext(SiteAccessContext);
  if (!context) {
    throw new Error("useSiteAccess must be used within a SiteAccessProvider");
  }
  return context;
}
