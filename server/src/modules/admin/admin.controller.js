import { USER_ROLES } from "../../constants/roles.js";
import { createHttpError } from "../../utils/http-error.js";
import { getAdminStatistics } from "./admin.service.js";
import { getSiteAccessState, updateSiteAccessState } from "./site-access.service.js";
import { updateProfileInfo } from "../profile/profile.service.js";
import { getAppearanceSettings, updateAppearanceSettings } from "./appearance.service.js";

export async function handleGetAdminStats(request, response, next) {
  try {
    if (!request.user || request.user.role !== USER_ROLES.ADMIN) {
      throw createHttpError(403, "Only administrators can access statistics.");
    }

    const stats = await getAdminStatistics();
    response.json({
      status: "ok",
      stats,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetAdminSiteAccess(request, response, next) {
  try {
    if (!request.user || request.user.role !== USER_ROLES.ADMIN) {
      throw createHttpError(403, "Only administrators can access site controls.");
    }

    const access = await getSiteAccessState();
    response.json({
      status: "ok",
      access,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateAdminSiteAccess(request, response, next) {
  try {
    if (!request.user || request.user.role !== USER_ROLES.ADMIN) {
      throw createHttpError(403, "Only administrators can modify site access.");
    }

    const { mode, message } = request.body ?? {};
    if (mode !== undefined && typeof mode !== "string") {
      throw createHttpError(400, "Invalid mode value.");
    }
    if (message !== undefined && typeof message !== "string") {
      throw createHttpError(400, "Invalid message value.");
    }

    const access = await updateSiteAccessState({ mode, message });
    response.json({
      status: "ok",
      access,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetAppearanceSettings(request, response, next) {
  try {
    if (!request.user || request.user.role !== USER_ROLES.ADMIN) {
      throw createHttpError(403, "Only administrators can access appearance settings.");
    }

    const appearance = await getAppearanceSettings();
    response.json({
      status: "ok",
      appearance,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateAppearanceSettings(request, response, next) {
  try {
    if (!request.user || request.user.role !== USER_ROLES.ADMIN) {
      throw createHttpError(403, "Only administrators can modify appearance settings.");
    }

    const { logoUrl } = request.body ?? {};
    if (logoUrl !== undefined && typeof logoUrl !== "string") {
      throw createHttpError(400, "Invalid logoUrl value.");
    }

    const appearance = await updateAppearanceSettings({ logoUrl });
    response.json({
      status: "ok",
      appearance,
    });
  } catch (error) {
    next(error);
  }
}


export async function handleUpdateUserProfile(request, response, next) {
  try {
    if (!request.user || request.user.role !== USER_ROLES.ADMIN) {
      throw createHttpError(403, "Only administrators can modify user profiles.");
    }

    const userId = request.params?.userId;
    if (!userId || typeof userId !== 'string') {
      throw createHttpError(400, "User id is required.");
    }

    const { displayName, bio, avatarUrl, coverUrl, location, isOfficial } = request.body ?? {};
    if (displayName !== undefined && typeof displayName !== 'string') {
      throw createHttpError(400, "displayName must be a string.");
    }
    if (bio !== undefined && typeof bio !== 'string') {
      throw createHttpError(400, "bio must be a string.");
    }
    if (avatarUrl !== undefined && typeof avatarUrl !== 'string') {
      throw createHttpError(400, "avatarUrl must be a string.");
    }
    if (coverUrl !== undefined && typeof coverUrl !== 'string') {
      throw createHttpError(400, "coverUrl must be a string.");
    }
    if (location !== undefined && typeof location !== 'string') {
      throw createHttpError(400, "location must be a string.");
    }
    if (isOfficial !== undefined && typeof isOfficial !== 'boolean') {
      throw createHttpError(400, "isOfficial must be a boolean.");
    }

    const profile = await updateProfileInfo(userId, {
      displayName,
      bio,
      avatarUrl,
      coverUrl,
      location,
      isOfficial,
    });

    response.json({
      status: 'ok',
      profile,
    });
  } catch (error) {
    next(error);
  }
}
