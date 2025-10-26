import { apiRequest } from "./client";
import { resolveMediaUrl } from "@/utils/media";

export type NewsItem = {
  id: string;
  slug: string | null;
  title: string;
  content: string;
  excerpt: string;
  coverImageUrl: string | null;
  authorId: string | null;
  authorDisplayName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
  commentsCount: number;
  viewsCount?: number | null;
};

export type NewsComment = {
  id: string;
  newsId: string;
  authorId: string | null;
  authorUsername: string | null;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  content: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type NewsListResponse = {
  status: "ok";
  news: NewsItem[];
  total: number;
  page: number;
  pageSize: number;
};

type NewsDetailResponse = {
  status: "ok";
  news: NewsItem;
};

type NewsMutationResponse = {
  status: "ok";
  news: NewsItem;
};

type NewsDeleteResponse = {
  status: "ok";
  deleted: boolean;
};

type NewsCommentsResponse = {
  status: "ok";
  comments: NewsComment[];
  total?: number;
};

type NewsCommentResponse = {
  status: "ok";
  comment: NewsComment;
};

type NewsCommentDeleteResponse = {
  status: "ok";
  deleted: boolean;
};

export type NewsCommentReportPayload = {
  reason?: string | null;
};

export type NewsCommentReport = {
  id: string;
  newsId: string;
  commentId: string;
  reporterId: string | null;
  reporterUsername: string | null;
  reporterDisplayName: string | null;
  reason: string | null;
  commentAuthorId: string | null;
  commentSnapshot: {
    content: string;
    createdAt: string | null;
  };
  createdAt: string | null;
};

type NewsCommentReportResponse = {
  status: "ok";
  report: NewsCommentReport;
};

type NewsViewsResponse = {
  status: "ok";
  viewsCount: number;
};

export type NewsListParams = {
  page?: number;
  limit?: number;
};

export type NewsPayload = {
  title: string;
  content: string;
  coverImage?: string | null;
};

export type NewsCommentPayload = {
  content: string;
};

function normalizeNewsItem(item: NewsItem): NewsItem {
  return {
    ...item,
    coverImageUrl: resolveMediaUrl(item.coverImageUrl) ?? item.coverImageUrl,
    commentsCount: typeof item.commentsCount === "number" ? item.commentsCount : 0,
    viewsCount: typeof item.viewsCount === "number" ? item.viewsCount : 0,
  };
}

function normalizeNewsComment(comment: NewsComment): NewsComment {
  return {
    ...comment,
    authorAvatarUrl: resolveMediaUrl(comment.authorAvatarUrl) ?? comment.authorAvatarUrl,
  };
}

export async function fetchNewsList(params: NewsListParams = {}, token: string | null = null) {
  const query = new URLSearchParams();
  if (typeof params.page === "number") {
    query.set("page", String(params.page));
  }
  if (typeof params.limit === "number") {
    query.set("limit", String(params.limit));
  }
  const path = query.toString() ? `/news?${query.toString()}` : "/news";

  const response = await apiRequest<NewsListResponse>(path, {
    method: "GET",
    token,
  });

  return {
    ...response,
    news: response.news.map((item) => normalizeNewsItem(item)),
  };
}

export async function fetchNewsItem(newsId: string, token: string | null = null) {
  const response = await apiRequest<NewsDetailResponse>(`/news/${encodeURIComponent(newsId)}`, {
    method: "GET",
    token,
  });
  return {
    ...response,
    news: normalizeNewsItem(response.news),
  };
}

export async function createNews(payload: NewsPayload, token: string) {
  const response = await apiRequest<NewsMutationResponse>("/news", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
  return {
    ...response,
    news: normalizeNewsItem(response.news),
  };
}

export async function updateNews(newsId: string, payload: NewsPayload, token: string) {
  const response = await apiRequest<NewsMutationResponse>(`/news/${encodeURIComponent(newsId)}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
  return {
    ...response,
    news: normalizeNewsItem(response.news),
  };
}

export async function deleteNews(newsId: string, token: string) {
  return apiRequest<NewsDeleteResponse>(`/news/${encodeURIComponent(newsId)}`, {
    method: "DELETE",
    token,
  });
}

export async function fetchNewsComments(newsId: string, token: string | null = null) {
  const response = await apiRequest<NewsCommentsResponse>(`/news/${encodeURIComponent(newsId)}/comments`, {
    method: "GET",
    token,
  });
  return {
    ...response,
    comments: response.comments.map((comment) => normalizeNewsComment(comment)),
  };
}

export async function createNewsComment(newsId: string, payload: NewsCommentPayload, token: string) {
  const response = await apiRequest<NewsCommentResponse>(`/news/${encodeURIComponent(newsId)}/comments`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
  return {
    ...response,
    comment: normalizeNewsComment(response.comment),
  };
}

export async function updateNewsComment(
  newsId: string,
  commentId: string,
  payload: NewsCommentPayload,
  token: string,
) {
  const response = await apiRequest<NewsCommentResponse>(
    `/news/${encodeURIComponent(newsId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    },
  );
  return {
    ...response,
    comment: normalizeNewsComment(response.comment),
  };
}

export async function deleteNewsComment(newsId: string, commentId: string, token: string) {
  return apiRequest<NewsCommentDeleteResponse>(
    `/news/${encodeURIComponent(newsId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: "DELETE",
      token,
    },
  );
}

export async function reportNewsComment(
  newsId: string,
  commentId: string,
  payload: NewsCommentReportPayload | undefined,
  token: string,
) {
  return apiRequest<NewsCommentReportResponse>(
    `/news/${encodeURIComponent(newsId)}/comments/${encodeURIComponent(commentId)}/report`,
    {
      method: "POST",
      token,
      body: JSON.stringify(payload ?? {}),
    },
  );
}

export async function incrementNewsViews(newsId: string, token: string | null = null) {
  return apiRequest<NewsViewsResponse>(`/news/${encodeURIComponent(newsId)}/views`, {
    method: "POST",
    token,
  });
}
