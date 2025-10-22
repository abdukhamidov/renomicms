import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { useAuth } from "@/contexts/useAuth";
import { updateProfile } from "@/api/profile";
import { resolveMediaUrl } from "@/utils/media";

const DEFAULT_AVATAR = "/design/img/default-avatar.png";
const DEFAULT_COVER = "/design/img/profile-cover.png";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Не удалось прочитать файл"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

export function ProfileSettingsPage() {
  const { user, token, profile, refreshProfile } = useAuth();
  const [avatarSrc, setAvatarSrc] = useState<string>(profile?.profile.avatarUrl ?? DEFAULT_AVATAR);
  const [coverSrc, setCoverSrc] = useState<string>(profile?.profile.coverUrl ?? DEFAULT_COVER);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [location, setLocation] = useState(profile?.profile.location ?? "");
  const [bio, setBio] = useState(profile?.profile.bio ?? "");
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [coverData, setCoverData] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error" | "loading"; message?: string }>({ type: "idle" });

  const canSave = useMemo(() => {
    if (!token) return false;
    if (status.type === "loading") return false;
    return true;
  }, [token, status.type]);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setAvatarSrc(profile?.profile.avatarUrl ?? DEFAULT_AVATAR);
    setCoverSrc(profile?.profile.coverUrl && profile.profile.coverUrl.length > 0 ? profile.profile.coverUrl : DEFAULT_COVER);
    setLocation(profile?.profile.location ?? "");
    setBio(profile?.profile.bio ?? "");
    setAvatarData(null);
    setCoverData(null);
    setStatus({ type: "idle" });
  }, [user?.displayName, profile?.profile.avatarUrl, profile?.profile.coverUrl, profile?.profile.location, profile?.profile.bio]);

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setAvatarData(dataUrl);
      setAvatarSrc(dataUrl);
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: "Не удалось загрузить аватар." });
    }
  }

  function handleRemoveAvatar() {
    setAvatarData(DEFAULT_AVATAR);
    setAvatarSrc(DEFAULT_AVATAR);
  }

  async function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setCoverData(dataUrl);
      setCoverSrc(dataUrl);
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: "Не удалось загрузить обложку." });
    }
  }

  function handleRemoveCover() {
    setCoverData("" /* очищаем обложку */);
    setCoverSrc(DEFAULT_COVER);
  }
  const resolvedAvatarSrc = useMemo(() => {
    if (!avatarSrc) return DEFAULT_AVATAR;
    if (typeof avatarSrc === "string" && avatarSrc.startsWith("data:image")) {
      return avatarSrc;
    }
    return resolveMediaUrl(avatarSrc) ?? avatarSrc;
  }, [avatarSrc]);

  const resolvedCoverSrc = useMemo(() => {
    if (!coverSrc) return DEFAULT_COVER;
    if (typeof coverSrc === "string" && coverSrc.startsWith("data:image")) {
      return coverSrc;
    }
    return resolveMediaUrl(coverSrc) ?? coverSrc;
  }, [coverSrc]);


  async function handleSubmit() {
    if (!token) {
      setStatus({ type: "error", message: "Необходимо войти в аккаунт." });
      return;
    }

    if (!displayName.trim()) {
      setStatus({ type: "error", message: "Имя не должно быть пустым." });
      return;
    }

    setStatus({ type: "loading" });
    try {
      const nextAvatarUrl =
        avatarData !== null ? avatarData : (profile?.profile.avatarUrl ?? undefined);
      let nextCoverUrl: string | undefined;
      if (coverData !== null) {
        nextCoverUrl = coverData;
      } else if (profile?.profile.coverUrl && profile.profile.coverUrl.length > 0) {
        nextCoverUrl = profile.profile.coverUrl;
      } else {
        nextCoverUrl = undefined;
      }

      await updateProfile(
        {
          displayName: displayName.trim(),
          bio: bio.trim(),
          location: location.trim(),
          avatarUrl: nextAvatarUrl,
          coverUrl: nextCoverUrl,
        },
        token,
      );
      await refreshProfile();
      setStatus({ type: "success", message: "Профиль обновлён." });
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Не удалось сохранить профиль." });
    }
  }

  return (
    <SettingsLayout title="Редактировать профиль">
      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full max-w-[540px] flex-col gap-3 rounded-[16px] border border-[#1D1D1D] bg-[#131313] p-4">
          <h2 className="text-[16px] font-semibold text-white">Аватар</h2>
          <div className="flex w-full items-center gap-3">
            <div className="h-[88px] w-[88px] overflow-hidden rounded-[12px] border border-[#1D1D1D] bg-[#0B0B0B]">
              <img src={resolvedAvatarSrc} alt="Аватар" className="h-full w-full object-cover" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-[#32AFED] px-4 py-2 font-bold text-black hover:bg-[#2b99cf]">
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                Загрузить фото
              </label>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-[10px] border border-[#1D1D1D] bg-[#131313] px-3 py-2 text-[#dbdbdb] hover:bg-[#171717] disabled:opacity-40"
                onClick={handleRemoveAvatar}
                disabled={avatarSrc === DEFAULT_AVATAR}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-[540px] flex-col gap-3 rounded-[16px] border border-[#1D1D1D] bg-[#131313] p-4">
          <h2 className="text-[16px] font-semibold text-white">Обложка</h2>
          <div className="flex flex-col gap-3">
            <div className="h-[120px] w-full overflow-hidden rounded-[12px] border border-[#1D1D1D] bg-[#0B0B0B]">
              <img src={resolvedCoverSrc} alt="Обложка" className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-[#1D1D1D] bg-[#0B0B0B] px-4 py-2 text-[#dbdbdb] hover:bg-[#171717]">
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                Загрузить обложку
              </label>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-[10px] border border-[#1D1D1D] bg-[#0B0B0B] px-4 py-2 text-[#dbdbdb] hover:bg-[#171717] disabled:opacity-40"
                onClick={handleRemoveCover}
                disabled={!coverData && coverSrc === DEFAULT_COVER}
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-[540px] flex-col gap-3">
          <label className="flex flex-col gap-2 text-[#dbdbdb]" htmlFor="profile-display-name">
            <span className="px-1 text-[14px]">Имя</span>
            <input
              id="profile-display-name"
              className="w-full rounded-[12px] border border-[#1D1D1D] bg-[#131313] px-4 py-3 text-[14px] text-[#ffffff] focus:border-[#505050] focus:outline-none"
              type="text"
              placeholder="Введите имя"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2 text-[#dbdbdb]" htmlFor="profile-location">
            <span className="px-1 text-[14px]">Город или страна</span>
            <input
              id="profile-location"
              className="w-full rounded-[12px] border border-[#1D1D1D] bg-[#131313] px-4 py-3 text-[14px] text-[#ffffff] focus:border-[#505050] focus:outline-none"
              type="text"
              placeholder="Где вы находитесь?"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2 text-[#dbdbdb]" htmlFor="profile-bio">
            <span className="px-1 text-[14px]">О себе</span>
            <textarea
              id="profile-bio"
              data-autosize
              rows={3}
              placeholder="Напишите пару слов о себе"
              className="min-h-[90px] w-full resize-none rounded-[12px] border border-[#1D1D1D] bg-[#131313] p-4 text-[14px] text-[#ffffff] leading-[1.4] focus:outline-none focus:ring-0"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
            />
          </label>
        </div>

        {status.type === "error" ? (
          <div className="w-full max-w-[540px] rounded-[12px] border border-[#3f1d1d] bg-[#1f0c0c] p-3 text-[14px] text-[#fca5a5]">
            {status.message ?? "Не удалось сохранить изменения."}
          </div>
        ) : null}
        {status.type === "success" ? (
          <div className="w-full max-w-[540px] rounded-[12px] border border-[#1d3f2b] bg-[#102215] p-3 text-[14px] text-[#86efac]">
            {status.message ?? "Изменения сохранены."}
          </div>
        ) : null}

        <div className="w-full max-w-[540px]">
          <button
            type="button"
            className="w-full rounded-[12px] bg-[#31AEEC] px-4 py-3 text-[15px] font-bold text-black hover:bg-[#3abdff] disabled:opacity-60"
            onClick={handleSubmit}
            disabled={!canSave}
          >
            {status.type === "loading" ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </SettingsLayout>
  );
}
