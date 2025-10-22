import { apiRequest } from "./client";

export type AppearanceSettings = {
  logoUrl: string;
};

export type AppearanceResponse = {
  status: "ok";
  appearance: AppearanceSettings;
};

export function fetchAppearance(signal?: AbortSignal) {
  return apiRequest<AppearanceResponse>("/appearance", {
    method: "GET",
    signal,
  });
}

export function updateAppearance(payload: Partial<AppearanceSettings>, token: string) {
  return apiRequest<AppearanceResponse>("/admin/appearance", {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}
