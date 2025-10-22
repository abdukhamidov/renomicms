import { getSiteAccessState } from "../admin/site-access.service.js";

export async function handleGetPublicSiteAccess(_request, response, next) {
  try {
    const access = await getSiteAccessState();
    response.json({
      status: "ok",
      access,
    });
  } catch (error) {
    next(error);
  }
}
