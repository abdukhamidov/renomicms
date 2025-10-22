import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { Link, Navigate } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import { useAuth } from "@/contexts/useAuth";
import { fetchUsersList, type UsersListItem, updateUserProfileAdmin, updateUserRole } from "@/api/users";
import { OfficialBadge } from "@/components/common/OfficialBadge";
import type { UserRole } from "@/api/auth";

const PAGE_TITLE = "Пользователи";
const PAGE_SIZE = 50;
const ROLE_OPTIONS: UserRole[] = ["user", "admin"];
const DEFAULT_AVATAR = "/design/img/avatar-default.png";
const DEFAULT_COVER = "/design/img/profile-cover.png";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Не удалось прочитать файл аватара."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Не удалось прочитать файл аватара."));
    reader.readAsDataURL(file);
  });
}

type AdminUsersListItem = UsersListItem & {
  isOfficial?: boolean;
  coverUrl?: string | null;
};

export function AdminUsersPage() {
  const { user, token, initializing } = useAuth();
  const [isNavbarSheetOpen, setNavbarSheetOpen] = useState(false);
  const [users, setUsers] = useState<AdminUsersListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    displayName: "",
    bio: "",
    location: "",
    avatarUrl: "",
    coverUrl: "",
  });
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);
  const [badgeUpdatingId, setBadgeUpdatingId] = useState<string | null>(null);
  const selectStyle: CSSProperties = {
    backgroundColor: "#0d0d0d",
    color: "#f1f1f1",
  };
  const detailAvatarStyle: CSSProperties = { width: 56, height: 56 };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchUsersList({
        limit: PAGE_SIZE,
        search: debouncedSearch.length > 0 ? debouncedSearch : undefined,
      });
      setUsers(result.users as AdminUsersListItem[]);
      return result.users as AdminUsersListItem[];
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("Не удалось загрузить пользователей.");
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const selectedUser = useMemo(
    () => users.find((item) => item.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );
  const selectedUserOrdinal = useMemo(() => {
    if (!selectedUserId) {
      return null;
    }
    const index = users.findIndex((item) => item.id === selectedUserId);
    return index >= 0 ? index + 1 : null;
  }, [users, selectedUserId]);

  useEffect(() => {
    if (selectedUser) {
      setProfileDraft({
        displayName: selectedUser.displayName ?? "",
        bio: selectedUser.bio ?? "",
        location: selectedUser.location ?? "",
        avatarUrl: selectedUser.avatarUrl ?? "",
        coverUrl: selectedUser.coverUrl ?? "",
      });
      setSaveError(null);
      setSaveSuccess(false);
    }
  }, [selectedUser]);

  if (initializing) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const handleOpenProfile = (targetUser: AdminUsersListItem) => {
    setSelectedUserId(targetUser.id);
  };

  const handleBackToList = () => {
    setSelectedUserId(null);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleTriggerAvatarUpload = () => {
    setSaveError(null);
    setSaveSuccess(false);
    avatarFileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setProfileDraft((prev) => ({ ...prev, avatarUrl: dataUrl }));
      setSaveError(null);
      setSaveSuccess(false);
    } catch (uploadError) {
      console.error(uploadError);
      setSaveError(uploadError instanceof Error ? uploadError.message : "Failed to process cover file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleRemoveAvatar = () => {
    setProfileDraft((prev) => ({ ...prev, avatarUrl: DEFAULT_AVATAR }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleTriggerCoverUpload = () => {
    setSaveError(null);
    setSaveSuccess(false);
    coverFileInputRef.current?.click();
  };

  const handleCoverFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setProfileDraft((prev) => ({ ...prev, coverUrl: dataUrl }));
      setSaveError(null);
      setSaveSuccess(false);
    } catch (uploadError) {
      console.error(uploadError);
      setSaveError(uploadError instanceof Error ? uploadError.message : "Failed to process cover file.")
    } finally {
      event.target.value = "";
    }
  };

  const handleRemoveCover = () => {
    setProfileDraft((prev) => ({ ...prev, coverUrl: "" }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleRoleChange = async (targetUser: AdminUsersListItem, nextRole: UserRole) => {
    if (!token) {
      setError("Требуется авторизация.");
      return;
    }

    if (targetUser.role === nextRole) {
      return;
    }

    setRoleUpdatingId(targetUser.id);
    try {
      await updateUserRole(targetUser.id, nextRole, token);
      await loadUsers();
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("Не удалось изменить роль пользователя.");
      }
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const handleToggleOfficial = async (targetUser: AdminUsersListItem) => {
    if (!token) {
      setError("Требуется авторизация.");
      return;
    }

    setBadgeUpdatingId(targetUser.id);
    try {
      await updateUserProfileAdmin(targetUser.id, { isOfficial: !targetUser.isOfficial }, token);
      await loadUsers();
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("Не удалось обновить значок.");
      }
    } finally {
      setBadgeUpdatingId(null);
    }
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token || !selectedUser) {
      setSaveError("Требуется авторизация.");
      return;
    }

    setSavingProfile(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateUserProfileAdmin(
        selectedUser.id,
        {
          displayName: profileDraft.displayName,
          bio: profileDraft.bio,
          location: profileDraft.location,
          avatarUrl: profileDraft.avatarUrl,
          coverUrl: profileDraft.coverUrl,
        },
        token,
      );
      await loadUsers();
      setSaveSuccess(true);
    } catch (requestError) {
      if (requestError instanceof Error) {
        setSaveError(requestError.message);
      } else {
        setSaveError("Не удалось сохранить профиль.");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const isDetailView = selectedUser !== null;
  const headerTitle = isDetailView ? selectedUser.displayName || selectedUser.username : PAGE_TITLE;
  const previewAvatarUrl =
    profileDraft.avatarUrl && profileDraft.avatarUrl.trim().length > 0
      ? profileDraft.avatarUrl
      : selectedUser?.avatarUrl && selectedUser.avatarUrl.trim().length > 0
        ? selectedUser.avatarUrl
        : DEFAULT_AVATAR;
  const canRemoveAvatar = previewAvatarUrl !== DEFAULT_AVATAR;
  const draftCover = profileDraft.coverUrl;
  const previewCoverUrl =
    draftCover && draftCover.trim().length > 0
      ? draftCover.trim()
      : draftCover === ""
        ? DEFAULT_COVER
        : selectedUser?.coverUrl && selectedUser.coverUrl.trim().length > 0
          ? selectedUser.coverUrl
          : DEFAULT_COVER;
  const canRemoveCover =
    (draftCover && draftCover.trim().length > 0) ||
    (draftCover !== "" && Boolean(selectedUser?.coverUrl && selectedUser.coverUrl.trim().length > 0));

  return (
    <>
      <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start">
        <DesktopSidebar />

        <div className="max-w-[540px] w-full flex flex-col gap-4 items-center text-[14px] p-3 sm:gap-5 sm:p-0">
          <div className="flex items-center justify-between w-full bg-[#131313] border-b border-[#1D1D1D] text-[#dbdbdb] sticky top-0 sm:hidden">
            {isDetailView ? (
              <button type="button" className="flex items-center gap-1 px-[16px] py-[14px]" onClick={handleBackToList}>
                <img src="/design/img/back.png" alt="Назад" />
              </button>
            ) : (
              <Link to="/" className="flex items-center gap-1 px-[16px] py-[14px]">
                <img src="/design/img/back.png" alt="" />
              </Link>
            )}
            <div className="flex justify-center font-semibold">{headerTitle}</div>
            <button
              type="button"
              className="flex items-center gap-1 px-[16px] py-[14px]"
              data-bottom-sheet-open="true"
              data-bottom-sheet-target="navbar-actions"
              onClick={() => setNavbarSheetOpen(true)}
            >
              <img src="/design/img/more.png" alt="" />
            </button>
          </div>

          <div className="hidden sm:flex items-center pt-1 justify-between w-full text-[#dbdbdb] sticky top-0 bg-black z-50">
            {isDetailView ? (
              <button type="button" className="flex items-center gap-1 pr-4 py-3" onClick={handleBackToList}>
                <img className="w-[26px]" src="/design/img/back.png" alt="Назад" />
              </button>
            ) : (
              <Link to="/" className="flex items-center gap-1 pr-4 py-3">
                <img className="w-[26px]" src="/design/img/back.png" alt="" />
              </Link>
            )}
            <div className="flex justify-center font-semibold text-[16px] gap-2">
              <p>{headerTitle}</p>
            </div>
            <button
              type="button"
              className="flex items-center gap-1 px-[16px] py-[14px]"
              data-bottom-sheet-open="true"
              data-bottom-sheet-target="navbar-actions"
              onClick={() => setNavbarSheetOpen(true)}
            >
              <img src="/design/img/more.png" alt="" />
            </button>
          </div>

          {error ? (
            <div className="w-full rounded-[12px] border border-[#402626] bg-[#2A1414] px-4 py-3 text-[13px] text-[#f5caca]">{error}</div>
          ) : null}

          {!isDetailView ? (
            <div className="flex w-full flex-col gap-4">
              <div className="flex w-full flex-col gap-2 rounded-[12px] border border-[#1D1D1D] bg-[#101010] px-4 py-3">
                <label className="text-[11px] uppercase tracking-wide text-[#6f6f6f]">Поиск</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#555]">🔍</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Поиск по логину или имени"
                    className="w-full rounded-[10px] border border-[#1D1D1D] bg-[#0B0B0B] px-9 py-2 text-[13px] text-white placeholder:text-[#555] focus:border-[#2F94F9] focus:outline-none"
                  />
                  {search.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[8px] border border-[#1D1D1D] bg-[#151515] px-2 py-1 text-[11px] text-[#dbdbdb] transition hover:bg-[#1c1c1c]"
                    >
                      Очистить
                    </button>
                  ) : null}
                </div>
              </div>

              {isLoading ? (
                <div className="w-full rounded-[12px] border border-[#1D1D1D] bg-[#101010] px-4 py-4 text-center text-[13px] text-[#9a9a9a]">
                  Загрузка пользователей...
                </div>
              ) : null}

              <ul className="flex flex-col gap-3">
                {users.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-[12px] border border-[#1D1D1D] bg-[#131313] px-4 py-3 text-[#dbdbdb] transition hover:border-[#2F94F9]"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="relative h-[40px] w-[40px] overflow-hidden rounded-full border border-[#1D1D1D] bg-[#0d0d0d]">
                        <img
                          src={item.avatarUrl || "/design/img/avatar-default.png"}
                          alt={item.username}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-2 text-[15px] font-semibold text-white">
                          {item.displayName || item.username}
                          {item.isOfficial ? <OfficialBadge /> : null}
                        </span>
                        <span className="text-[12px] text-[#8f8f8f]">@{item.username}</span>
                        <span className="text-[11px] text-[#777]">
                          Посты: <span className="text-white">{item.stats.posts}</span> · Подписчики:{" "}
                          <span className="text-white">{item.stats.followers}</span>
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-[10px] border border-[#2F94F9] bg-[#2F94F9] px-4 py-2 text-[13px] font-semibold text-black transition hover:bg-[#2676c5]"
                      onClick={() => handleOpenProfile(item)}
                    >
                      Посмотреть
                    </button>
                  </li>
                ))}
              </ul>

              {!isLoading && users.length === 0 ? (
                <div className="w-full rounded-[12px] border border-[#1D1D1D] bg-[#101010] px-6 py-10 text-center text-[13px] text-[#9a9a9a]">
                  Пользователей не найдено.
                </div>
              ) : null}
            </div>
          ) : null}

          {isDetailView && selectedUser ? (
            <div className="flex w-full flex-col gap-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="rounded-[10px] border border-[#1D1D1D] bg-[#101010] px-4 py-2 text-[13px] text-[#dbdbdb] transition hover:bg-[#181818]"
                  onClick={handleBackToList}
                >
                  ← Назад к списку
                </button>
              </div>

              <section className="flex flex-col gap-4 rounded-[12px] border border-[#1D1D1D] bg-[#131313] px-4 py-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div
                      className="overflow-hidden rounded-full border border-[#1D1D1D] bg-[#0d0d0d]"
                      style={detailAvatarStyle}
                    >
                      <img
                        src={previewAvatarUrl}
                        alt={selectedUser.username}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-2 text-[17px] font-semibold text-white">
                        {selectedUser.displayName || selectedUser.username}
                        {selectedUser.isOfficial ? <OfficialBadge /> : null}
                      </span>
                      <span className="text-[13px] text-[#9a9a9a]">@{selectedUser.username}</span>
                      <span className="text-[11px] text-[#6f6f6f]">
                        ID: <span className="text-[#bdbdbd]">{selectedUserOrdinal ?? selectedUser.id}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <input
                      ref={avatarFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                    <button
                      type="button"
                      className="rounded-[10px] border border-[#2F94F9] bg-[#2F94F9] px-4 py-2 text-[13px] font-semibold text-black transition hover:bg-[#2676c5]"
                      onClick={handleTriggerAvatarUpload}
                    >
                      Изменить аватар
                    </button>
                    <button
                      type="button"
                      className="rounded-[10px] border border-[#1D1D1D] bg-[#101010] px-4 py-2 text-[13px] text-[#dbdbdb] transition hover:bg-[#181818] disabled:opacity-50"
                      onClick={handleRemoveAvatar}
                      disabled={!canRemoveAvatar}
                    >
                      Удалить аватар
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-[12px] text-[#9a9a9a]">
                  <span>
                    Подписчики: <span className="text-white">{selectedUser.stats.followers}</span>
                  </span>
                  <span>
                    Подписки: <span className="text-white">{selectedUser.stats.following}</span>
                  </span>
                  <span>
                    Посты: <span className="text-white">{selectedUser.stats.posts}</span>
                  </span>
                </div>
              </section>
              <section className="flex flex-col gap-3 rounded-[12px] border border-[#1D1D1D] bg-[#131313] px-4 py-4">
                <div className="flex flex-col gap-3">
                  <div className="h-[140px] w-full overflow-hidden rounded-[12px] border border-[#1D1D1D] bg-[#0b0b0b]">
                    <img src={previewCoverUrl} alt={`${selectedUser.username} cover`} className="h-full w-full object-cover" />
                  </div>
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverFileChange}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-[10px] border border-[#2F94F9] bg-[#2F94F9] px-4 py-2 text-[13px] font-semibold text-black transition hover:bg-[#2676c5]"
                      onClick={handleTriggerCoverUpload}
                    >
                      Change cover
                    </button>
                    <button
                      type="button"
                      className="rounded-[10px] border border-[#1D1D1D] bg-[#101010] px-4 py-2 text-[13px] text-[#dbdbdb] transition hover:bg-[#181818] disabled:opacity-50"
                      onClick={handleRemoveCover}
                      disabled={!canRemoveCover}
                    >
                      Remove cover
                    </button>
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-3 rounded-[12px] border border-[#1D1D1D] bg-[#131313] px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <label className="flex flex-col gap-1 text-[12px] text-[#9a9a9a]">
                    <span className="text-[11px] uppercase tracking-wide text-[#6f6f6f]">Роль пользователя</span>
                    <div className="relative">
                      <select
                        style={selectStyle}
                        className="w-full appearance-none rounded-[10px] border border-[#1D1D1D] bg-[#0d0d0d] px-3 py-2 text-[13px] text-white focus:border-[#2F94F9] focus:outline-none"
                        value={selectedUser.role}
                        disabled={roleUpdatingId === selectedUser.id || !token}
                        onChange={(event) => handleRoleChange(selectedUser, event.target.value as UserRole)}
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option === "admin" ? "Администратор" : "Пользователь"}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#777]">▾</span>
                    </div>
                  </label>
                  <div className="flex flex-col gap-2 rounded-[10px] border border-[#1D1D1D] bg-[#111111] px-4 py-3">
                    <span className="text-[11px] uppercase tracking-wide text-[#6f6f6f]">Официальный статус</span>
                    <button
                      type="button"
                      onClick={() => handleToggleOfficial(selectedUser)}
                      disabled={badgeUpdatingId === selectedUser.id || !token}
                      className={`rounded-[10px] border border-[#1D1D1D] px-4 py-2 text-[13px] font-semibold transition ${
                        selectedUser.isOfficial
                          ? "bg-[#1d3426] text-[#92e0aa] hover:bg-[#25402e]"
                          : "bg-[#0d0d0d] text-[#dbdbdb] hover:bg-[#181818]"
                      } ${badgeUpdatingId === selectedUser.id ? "opacity-60" : ""}`}
                    >
                      {selectedUser.isOfficial ? "Снять значок" : "Сделать официальным"}
                    </button>
                  </div>
                </div>
              </section>

              <form
                onSubmit={handleSaveProfile}
                className="flex flex-col gap-4 rounded-[12px] border border-[#1D1D1D] bg-[#131313] px-4 py-5"
              >
                <legend className="sr-only">Редактирование профиля</legend>
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <label className="flex flex-col gap-2 text-[#dbdbdb] text-[13px]">
                    <span className="text-[11px] uppercase tracking-wide text-[#6f6f6f]">Отображаемое имя</span>
                    <input
                      value={profileDraft.displayName}
                      onChange={(event) => setProfileDraft((prev) => ({ ...prev, displayName: event.target.value }))}
                      placeholder="Введите имя"
                      className="rounded-[12px] border border-[#1D1D1D] bg-[#101010] px-4 py-3 text-[13px] text-[#e1e1e1] placeholder:text-[#666] focus:border-[#2F94F9] focus:outline-none focus:ring-0"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-[#dbdbdb] text-[13px]">
                    <span className="text-[11px] uppercase tracking-wide text-[#6f6f6f]">Город / страна</span>
                    <input
                      value={profileDraft.location}
                      onChange={(event) => setProfileDraft((prev) => ({ ...prev, location: event.target.value }))}
                      placeholder="Например, Москва"
                      className="rounded-[12px] border border-[#1D1D1D] bg-[#101010] px-4 py-3 text-[13px] text-[#e1e1e1] placeholder:text-[#666] focus:border-[#2F94F9] focus:outline-none focus:ring-0"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-2 text-[#dbdbdb] text-[13px]">
                  <span className="text-[11px] uppercase tracking-wide text-[#6f6f6f]">Биография</span>
                  <textarea
                    value={profileDraft.bio}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, bio: event.target.value }))}
                    placeholder="Коротко расскажите о пользователе"
                    className="min-h-[120px] w-full resize-none rounded-[12px] border border-[#1D1D1D] bg-[#101010] px-4 py-3 text-[13px] text-[#eaeaea] placeholder:text-[#666] focus:border-[#2F94F9] focus:outline-none focus:ring-0"
                    rows={5}
                  />
                </label>

                <label className="flex flex-col gap-2 text-[#dbdbdb] text-[13px]">
                  <span className="text-[11px] uppercase tracking-wide text-[#6f6f6f]">Аватар (URL)</span>
                  <input
                    type="url"
                    value={profileDraft.avatarUrl}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, avatarUrl: event.target.value }))}
                    placeholder="https://example.com/avatar.png"
                    className="rounded-[12px] border border-[#1D1D1D] bg-[#101010] px-4 py-3 text-[13px] text-[#e1e1e1] placeholder:text-[#666] focus:border-[#2F94F9] focus:outline-none focus:ring-0"
                  />
                </label>

                <label className="flex flex-col gap-2 text-[#dbdbdb] text-[13px]">
                  <span className="text-[11px] uppercase tracking-wide text-[#6f6f6f]">Обложка (URL)</span>
                  <input
                    type="url"
                    value={profileDraft.coverUrl}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, coverUrl: event.target.value }))}
                    placeholder="https://example.com/cover.png"
                    className="rounded-[12px] border border-[#1D1D1D] bg-[#101010] px-4 py-3 text-[13px] text-[#e1e1e1] placeholder:text-[#666] focus:border-[#2F94F9] focus:outline-none focus:ring-0"
                  />
                </label>


                {saveError ? (
                  <div className="rounded-[10px] border border-[#402626] bg-[#2A1414] px-4 py-3 text-[12px] text-[#f5caca]">{saveError}</div>
                ) : null}

                {saveSuccess ? (
                  <div className="rounded-[10px] border border-[#193524] bg-[#112519] px-4 py-3 text-[12px] text-[#93f2c4]">
                    Изменения сохранены.
                  </div>
                ) : null}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="submit"
                    disabled={savingProfile || !token}
                    className={`rounded-[12px] border border-[#2F94F9] bg-[#2F94F9] px-6 py-2 text-[13px] font-semibold text-black transition hover:bg-[#2277c0] ${
                      savingProfile ? "opacity-60" : ""
                    }`}
                  >
                    {savingProfile ? "Сохраняем..." : "Сохранить"}
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>

        <MobileBottomNav activeHref="/admin" />
      </div>

      <NavbarActionsSheet open={isNavbarSheetOpen} onClose={() => setNavbarSheetOpen(false)} textClassName="text-[16px]" />
    </>
  );
}
