import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchAppearance, type AppearanceSettings } from "@/api/appearance";

type AppearanceContextValue = {
  appearance: AppearanceSettings;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setAppearance: (next: AppearanceSettings) => void;
};

const defaultAppearance: AppearanceSettings = {
  logoUrl: "/design/img/logo-icon.png",
};

const AppearanceContext = createContext<AppearanceContextValue | undefined>(undefined);

type AppearanceProviderProps = {
  children: ReactNode;
};

export function AppearanceProvider({ children }: AppearanceProviderProps) {
  const [appearance, setAppearance] = useState<AppearanceSettings>(defaultAppearance);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAppearance();
      setAppearance(response.appearance);
    } catch (fetchError) {
      if (fetchError instanceof Error) {
        setError(fetchError.message);
      } else {
        setError("Не удалось загрузить настройки оформления.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      appearance,
      loading,
      error,
      refresh: () => refresh(),
      setAppearance,
    }),
    [appearance, loading, error, refresh],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used within an AppearanceProvider");
  }
  return context;
}
