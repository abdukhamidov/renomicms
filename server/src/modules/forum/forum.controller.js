import {
  listForumCategories,
  getForumSection,
  getForumTopic,
  createForumTopic,
  updateForumTopic,
  updateTopicState,
  createForumPost,
  updateForumPost,
  voteForumPost,
  deleteForumPost,
  deleteForumTopic,
  incrementTopicView,
} from "./forum.service.js";

export async function listCategoriesHandler(request, response) {
  const categories = await listForumCategories(request.user ?? null);
  response.json({
    status: "ok",
    categories,
  });
}

export async function getSectionHandler(request, response) {
  const sectionId = request.params.sectionId ?? "";
  const { page, limit } = request.query;

  const payload = await getForumSection(
    sectionId,
    request.user ?? null,
    {
      page: typeof page === "string" || typeof page === "number" ? Number(page) : undefined,
      limit: typeof limit === "string" || typeof limit === "number" ? Number(limit) : undefined,
    },
  );

  response.json({
    status: "ok",
    ...payload,
  });
}

export async function getTopicHandler(request, response) {
  const topicId = request.params.topicId ?? "";
  const { page, limit } = request.query;

  const payload = await getForumTopic(
    topicId,
    request.user ?? null,
    {
      page: typeof page === "string" || typeof page === "number" ? Number(page) : undefined,
      limit: typeof limit === "string" || typeof limit === "number" ? Number(limit) : undefined,
    },
  );

  response.json({
    status: "ok",
    ...payload,
  });
}

export async function createTopicHandler(request, response) {
  const sectionId = request.params.sectionId ?? "";
  const { title, content } = request.body ?? {};

  const result = await createForumTopic(sectionId, request.user ?? null, { title, content });

  response.status(201).json({
    status: "ok",
    topic: result.topic,
    post: result.post,
  });
}

export async function updateTopicHandler(request, response) {
  const topicId = request.params.topicId ?? "";
  const { title, content } = request.body ?? {};

  const payload = await updateForumTopic(topicId, request.user ?? null, { title, content });

  response.json({
    status: "ok",
    ...payload,
  });
}

export async function updateTopicStateHandler(request, response) {
  const topicId = request.params.topicId ?? "";
  const { isLocked, isPinned } = request.body ?? {};

  const topic = await updateTopicState(topicId, request.user ?? null, { isLocked, isPinned });

  response.json({
    status: "ok",
    topic,
  });
}

export async function incrementTopicViewHandler(request, response) {
  const topicId = request.params.topicId ?? "";
  const result = await incrementTopicView(topicId);

  response.json({
    status: "ok",
    ...result,
  });
}

export async function createPostHandler(request, response) {
  const topicId = request.params.topicId ?? "";
  const { content, replyToPostId } = request.body ?? {};

  const post = await createForumPost(topicId, request.user ?? null, { content, replyToPostId });

  response.status(201).json({
    status: "ok",
    post,
  });
}

export async function updatePostHandler(request, response) {
  const postId = request.params.postId ?? "";
  const { content } = request.body ?? {};

  const post = await updateForumPost(postId, request.user ?? null, { content });

  response.json({
    status: "ok",
    post,
  });
}

export async function votePostHandler(request, response) {
  const postId = request.params.postId ?? "";
  const { value } = request.body ?? {};

  const post = await voteForumPost(postId, request.user ?? null, { value });

  response.json({
    status: "ok",
    post,
  });
}

export async function deletePostHandler(request, response) {
  const postId = request.params.postId ?? "";
  const result = await deleteForumPost(postId, request.user ?? null);

  response.json({
    status: "ok",
    ...result,
  });
}

export async function deleteTopicHandler(request, response) {
  const topicId = request.params.topicId ?? "";
  const result = await deleteForumTopic(topicId, request.user ?? null);

  response.json({
    status: "ok",
    ...result,
  });
}
