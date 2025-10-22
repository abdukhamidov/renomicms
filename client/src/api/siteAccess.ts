import { apiRequest } from "./client";

export type SiteAccessMode = "public" | "auth_only" | "maintenance";

export type SiteAccessState = {
  mode: SiteAccessMode;
  message: string;
};

export type SiteAccessResponse = {
  status: "ok";
  access: SiteAccessState;
};

export function fetchSiteAccess(signal?: AbortSignal) {
  return apiRequest<SiteAccessResponse>("/site-access", {
    method: "GET",
    signal,
  });
}

export function updateSiteAccess(payload: Partial<SiteAccessState>, token: string) {
  return apiRequest<SiteAccessResponse>("/admin/site-access", {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}
