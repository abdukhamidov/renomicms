import { apiRequest } from "./client";

export type ForumUserSummary = {
  id: string | null;
  username: string | null;
  displayName: string;
  avatarUrl: string;
};

export type ForumSectionStats = {
  topicsCount: number;
  postsCount: number;
  lastActivityAt: string | null;
  lastActivityUser: ForumUserSummary | null;
};

export type ForumSectionSummary = {
  id: string;
  slug: string | null;
  title: string;
  description: string;
  icon: string | null;
  order: number;
  isLocked: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  stats: ForumSectionStats;
  pinnedCount: number;
};

export type ForumCategory = {
  id: string;
  slug: string | null;
  title: string;
  description: string;
  icon: string | null;
  order: number;
  isLocked: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  stats: ForumSectionStats;
  sections: ForumSectionSummary[];
};

export type ForumPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ForumTopicSummary = {
  id: string;
  sectionId: string;
  slug: string | null;
  title: string;
  author: ForumUserSummary;
  createdAt: string | null;
  updatedAt: string | null;
  isLocked: boolean;
  isPinned: boolean;
  viewCount: number;
  repliesCount: number;
  lastPostAt: string | null;
  lastPostAuthor: ForumUserSummary;
};

export type ForumTopicDetail = ForumTopicSummary & {
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canLock: boolean;
    canPin: boolean;
    canReply: boolean;
  };
};

export type ForumSectionResponse = {
  section: {
    id: string;
    slug: string | null;
    title: string;
    description: string;
    icon: string | null;
    order: number;
    isLocked: boolean;
    createdAt: string | null;
    updatedAt: string | null;
    category: {
      id: string;
      title: string;
      slug: string | null;
    } | null;
  };
  pinnedTopics: ForumTopicSummary[];
  topics: ForumTopicSummary[];
  pagination: ForumPagination;
  permissions: {
    canCreateTopic: boolean;
    isLocked: boolean;
  };
};

export type ForumPostVotes = {
  upvotes: number;
  downvotes: number;
  score: number;
  user: -1 | 0 | 1;
};

export type ForumPost = {
  id: string;
  topicId: string;
  author: ForumUserSummary;
  content: string;
  replyTo: {
    postId: string;
    author: ForumUserSummary;
    excerpt: string;
  } | null;
  isDeleted: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
  votes?: ForumPostVotes;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
  };
};

export type ForumTopicResponse = {
  topic: ForumTopicDetail;
  section: {
    id: string;
    slug: string | null;
    title: string;
    description: string;
    icon: string | null;
    order: number;
    isLocked: boolean;
    createdAt: string | null;
    updatedAt: string | null;
  };
  posts: ForumPost[];
  pagination: ForumPagination;
};

export function fetchForumCategories(token: string | null) {
  return apiRequest<{ status: "ok"; categories: ForumCategory[] }>("/forum", {
    method: "GET",
    token: token ?? undefined,
  }).then((response) => response.categories);
}

export function fetchForumSection(
  sectionId: string,
  token: string | null,
  options: { page?: number; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (typeof options.page === "number") {
    params.set("page", String(options.page));
  }
  if (typeof options.limit === "number") {
    params.set("limit", String(options.limit));
  }

  const path = `/forum/sections/${encodeURIComponent(sectionId)}${params.size ? `?${params.toString()}` : ""}`;

  return apiRequest<{ status: "ok" } & ForumSectionResponse>(path, {
    method: "GET",
    token: token ?? undefined,
  }).then(({ status: _status, ...payload }) => payload);
}

export function fetchForumTopic(
  topicId: string,
  token: string | null,
  options: { page?: number; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (typeof options.page === "number") {
    params.set("page", String(options.page));
  }
  if (typeof options.limit === "number") {
    params.set("limit", String(options.limit));
  }

  const path = `/forum/topics/${encodeURIComponent(topicId)}${params.size ? `?${params.toString()}` : ""}`;

  return apiRequest<{ status: "ok" } & ForumTopicResponse>(path, {
    method: "GET",
    token: token ?? undefined,
  }).then(({ status: _status, ...payload }) => payload);
}

export function createForumTopic(
  sectionId: string,
  payload: { title: string; content: string },
  token: string,
) {
  return apiRequest<{ status: "ok"; topic: ForumTopicDetail; post: ForumPost }>(
    `/forum/sections/${encodeURIComponent(sectionId)}/topics`,
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
  );
}

export function updateForumTopic(
  topicId: string,
  payload: { title?: string; content?: string },
  token: string,
) {
  return apiRequest<{ status: "ok" } & ForumTopicResponse>(`/forum/topics/${encodeURIComponent(topicId)}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  }).then(({ status: _status, ...rest }) => rest);
}

export function updateTopicState(topicId: string, payload: { isLocked?: boolean; isPinned?: boolean }, token: string) {
  return apiRequest<{ status: "ok"; topic: ForumTopicSummary }>(
    `/forum/topics/${encodeURIComponent(topicId)}/state`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    },
  ).then((response) => response.topic);
}

export function incrementTopicView(topicId: string, token: string | null) {
  return apiRequest<{ status: "ok"; topicId: string; viewCount: number }>(
    `/forum/topics/${encodeURIComponent(topicId)}/views`,
    {
      method: "POST",
      token: token ?? undefined,
    },
  ).then((response) => response.viewCount);
}

export function createForumPost(
  topicId: string,
  payload: { content: string; replyToPostId?: string | null },
  token: string,
) {
  return apiRequest<{ status: "ok"; post: ForumPost }>(
    `/forum/topics/${encodeURIComponent(topicId)}/posts`,
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
  ).then((response) => response.post);
}

export function updateForumPost(postId: string, payload: { content: string }, token: string) {
  return apiRequest<{ status: "ok"; post: ForumPost }>(`/forum/posts/${encodeURIComponent(postId)}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  }).then((response) => response.post);
}

export function voteForumPost(postId: string, payload: { value: -1 | 0 | 1 }, token: string) {
  return apiRequest<{ status: "ok"; post: ForumPost }>(`/forum/posts/${encodeURIComponent(postId)}/votes`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  }).then((response) => response.post);
}

export function deleteForumPost(postId: string, token: string) {
  return apiRequest<{ status: "ok"; postDeleted?: boolean; topicDeleted?: boolean }>(
    `/forum/posts/${encodeURIComponent(postId)}`,
    {
      method: "DELETE",
      token,
    },
  );
}

export function deleteForumTopic(topicId: string, token: string) {
  return apiRequest<{ status: "ok"; topicDeleted?: boolean }>(`/forum/topics/${encodeURIComponent(topicId)}`, {
    method: "DELETE",
    token,
  });
}

export type ForumAttachmentUploadResult = {
  attachmentUrl: string;
  filename: string;
  contentType: string | null;
};

export function uploadForumAttachment(
  payload: { filename: string; content: string; contentType?: string | null },
  token: string,
) {
  return apiRequest<{ status: "ok"; attachmentUrl: string; filename: string; contentType: string | null }>(
    "/forum/attachments",
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
  ).then((response) => ({
    attachmentUrl: response.attachmentUrl,
    filename: response.filename ?? payload.filename,
    contentType: response.contentType ?? null,
  }));
}
