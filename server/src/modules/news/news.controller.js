import {
  listNews,
  getNews,
  createNews,
  updateNews,
  deleteNews,
  listNewsComments,
  createNewsComment,
} from "./news.service.js";

function parseNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function listNewsHandler(request, response, next) {
  try {
    const page = parseNumber(request.query.page);
    const limit = parseNumber(request.query.limit);
    const result = await listNews({
      page: page ?? undefined,
      limit: limit ?? undefined,
    });
    response.json({
      status: "ok",
      news: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  } catch (error) {
    next(error);
  }
}

export async function getNewsHandler(request, response, next) {
  try {
    const newsId = request.params.newsId ?? "";
    const news = await getNews(newsId);
    response.json({
      status: "ok",
      news,
    });
  } catch (error) {
    next(error);
  }
}

export async function listNewsCommentsHandler(request, response, next) {
  try {
    const newsId = request.params.newsId ?? "";
    const comments = await listNewsComments(newsId);
    response.json({
      status: "ok",
      comments,
      total: comments.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function createNewsCommentHandler(request, response, next) {
  try {
    const newsId = request.params.newsId ?? "";
    const comment = await createNewsComment(newsId, request.user ?? null, request.body ?? {});
    response.status(201).json({
      status: "ok",
      comment,
    });
  } catch (error) {
    next(error);
  }
}

export async function createNewsHandler(request, response, next) {
  try {
    const news = await createNews(request.user ?? null, request.body ?? {});
    response.status(201).json({
      status: "ok",
      news,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateNewsHandler(request, response, next) {
  try {
    const newsId = request.params.newsId ?? "";
    const news = await updateNews(newsId, request.user ?? null, request.body ?? {});
    response.json({
      status: "ok",
      news,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteNewsHandler(request, response, next) {
  try {
    const newsId = request.params.newsId ?? "";
    const result = await deleteNews(newsId, request.user ?? null);
    response.json({
      status: "ok",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}
