import { getAppearanceSettings } from "../admin/appearance.service.js";

export async function handleGetAppearance(_request, response, next) {
  try {
    const appearance = await getAppearanceSettings();
    response.json({
      status: "ok",
      appearance,
    });
  } catch (error) {
    next(error);
  }
}
