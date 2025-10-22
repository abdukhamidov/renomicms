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

export function fetchAdminStatistics(token: string, signal?: AbortSignal) {
  return apiRequest<AdminStatisticsResponse>("/admin/stats", {
    method: "GET",
    token,
    signal,
  });
}
