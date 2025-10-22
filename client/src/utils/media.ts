const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

function combineUrl(base: string, path: string) {
  if (!base) return path;
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${normalizedBase}${path.startsWith("/") ? path : `/${path}`}`;
}

export function resolveMediaUrl(url: string | null | undefined): string | null | undefined {
  if (!url) {
    return url;
  }

  if (url.startsWith("/uploads/")) {
    return combineUrl(API_BASE_URL, url);
  }

  return url;
}
