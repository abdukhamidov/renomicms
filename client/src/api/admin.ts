import { apiRequest } from "./client";

export type AdminStatistics = {
  source: "database" | "files";
  generatedAt: string;
  users: {
    total: number;
    admins: number;
  };
  profiles: {
    total: number;
  };
  posts: {
    total: number;
  };
  followers: {
    relations: number;
    uniqueFollowers: number;
    uniqueFollowing: number;
  };
  notifications: {
    total: number;
    unread: number;
  };
  messages: {
    conversations: number;
    messages: number;
    participants: number;
  };
};

export type AdminStatisticsResponse = {
  status: "ok";
  stats: AdminStatistics;
};

export type AdminReport = {
  id: string;
  kind: "news_comment";
  status: "open" | "resolved";
  createdAt: string | null;
  resolvedAt: string | null;
  archivedAt?: string | null;
  reason: string | null;
  resolutionNote: string | null;
  reporter: {
    id: string | null;
    username: string | null;
    displayName: string | null;
  };
  resolvedBy: {
    id: string | null;
    username: string | null;
    displayName: string | null;
  };
  target: {
    newsId: string | null;
    newsTitle: string | null;
    commentId: string | null;
    commentAuthorId: string | null;
    commentContent: string;
    commentCreatedAt: string | null;
  };
  meta: {
    source: "news";
  };
};

export type AdminReportsResponse = {
  status: "ok";
  reports: AdminReport[];
};

export type AdminResolveReportPayload = {
  note?: string;
};

export type AdminResolveReportResponse = {
  status: "ok";
  report: AdminReport;
};

export function fetchAdminStatistics(token: string, signal?: AbortSignal) {
  return apiRequest<AdminStatisticsResponse>("/admin/stats", {
    method: "GET",
    token,
    signal,
  });
}

export function fetchAdminReports(token: string, signal?: AbortSignal) {
  return apiRequest<AdminReportsResponse>("/admin/reports", {
    method: "GET",
    token,
    signal,
  });
}

export function fetchAdminReportsArchive(token: string, signal?: AbortSignal) {
  return apiRequest<AdminReportsResponse>("/admin/reports/archive", {
    method: "GET",
    token,
    signal,
  });
}

export function resolveAdminReport(reportId: string, payload: AdminResolveReportPayload | undefined, token: string) {
  return apiRequest<AdminResolveReportResponse>(`/admin/reports/${encodeURIComponent(reportId)}/resolve`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload ?? {}),
  });
}
