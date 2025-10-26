export const NEWS_CACHE_EVENT = "nomi:news-cache-update";

export type NewsCacheUpdateDetail = {
  newsId: string;
  commentsCount?: number;
  commentsDelta?: number;
};
