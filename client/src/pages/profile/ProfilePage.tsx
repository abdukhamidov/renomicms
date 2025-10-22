import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import {
  fetchProfile,
  fetchProfilePosts,
  followUser,
  unfollowUser,
  createProfilePost,
  updateProfile,
} from "@/api/profile";
import type { ProfilePost, ProfileResponse } from "@/api/profile";
import { useAuth } from "@/contexts/useAuth";

const DEFAULT_AVATAR = "/design/img/default-avatar.png";
const DEFAULT_COVER = "/design/img/profile-cover.png";
const BIO_PLACEHOLDER = "Этот путешественник пока не рассказал о себе.";
const COMPOSER_PLACEHOLDER = "Есть что сказать? Поделись мыслями.";
const NO_POSTS_IMAGE = "/design/profile-empty.svg";
const POSTS_PAGE_SIZE = 10;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to read cover file."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read cover file."));
    reader.readAsDataURL(file);
  });
}

function formatDate(dateString: string) {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(date);
  } catch {
    return dateString;
  }
}

function formatRelative(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} d ago`;
  }

  return formatDate(dateString);
}

function pluralizeRu(value: number, forms: [string, string, string]) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 14) {
    return forms[2];
  }
  const mod10 = value % 10;
  if (mod10 === 1) {
    return forms[0];
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return forms[1];
  }
  return forms[2];
}

function formatLastVisit(dateInput?: string | null) {
  if (!dateInput) {
    return "Нет данных";
  }

  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return "Нет данных";
  }

  const diffMs = Date.now() - date.getTime();
  if (diffMs <= 0) {
    return "Сейчас онлайн";
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) {
    return "Сейчас онлайн";
  }
  if (minutes < 10) {
    return "Только что";
  }
  if (minutes < 60) {
    return `${minutes} ${pluralizeRu(minutes, ["минуту", "минуты", "минут"])} назад`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 6) {
    return "Недавно";
  }
  if (hours < 24) {
    return `${hours} ${pluralizeRu(hours, ["час", "часа", "часов"])} назад`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) {
    return "Вчера";
  }
  if (days < 7) {
    return `${days} ${pluralizeRu(days, ["день", "дня", "дней"])} назад`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return `${weeks} ${pluralizeRu(weeks, ["неделю", "недели", "недель"])} назад`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} ${pluralizeRu(months, ["месяц", "месяца", "месяцев"])} назад`;
  }

  const years = Math.floor(days / 365);
  if (years <= 0) {
    return formatDate(dateInput);
  }

  return `${years} ${pluralizeRu(years, ["год", "года", "лет"])} назад`;
}

function classNames(parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type ProfileAction = "edit" | "update-cover" | "remove-cover";

type ProfileActionsSheetProps = {
  open: boolean;
  onClose: () => void;
  onAction?: (action: ProfileAction) => void;
  canManageCover?: boolean;
  canRemoveCover?: boolean;
  isCoverUpdating?: boolean;
};

type ProfileTab = "profile" | "forum" | "blog";

type ProfileContentProps = {
  data: ProfileResponse;
  posts: ProfilePost[];
  isSelf: boolean;
  canInteract: boolean;
  canPost: boolean;
  onFollowToggle: () => void;
  followLoading: boolean;
  onOpenProfileActions: () => void;
  onOpenNavbarSheet: () => void;
  onBack: () => void;
  onCreatePost: (content: string) => Promise<void>;
  composerLoading: boolean;
  hasMorePosts: boolean;
  onLoadMore: () => void;
  loadMoreLoading: boolean;
  loadMoreError: string | null;
  totalPosts: number;
  activeTab: ProfileTab;
  onSelectTab: (tab: ProfileTab) => void;
  followMessage: string | null;
  coverMessage: { type: "success" | "error"; message: string } | null;
  isCoverUpdating: boolean;
};

type ProfileMobileHeaderProps = {
  title: string;
  onBack: () => void;
  onOpenNavbarSheet: () => void;
};

function ProfileActionsSheet({
  open,
  onClose,
  onAction,
  canManageCover = false,
  canRemoveCover = false,
  isCoverUpdating = false,
}: ProfileActionsSheetProps) {
  const handleAction = (action: ProfileAction) => {
    onClose();
    window.setTimeout(() => {
      onAction?.(action);
    }, 0);
  };

  return (
    <div
      className={classNames([
        "fixed inset-0 z-50",
        open ? "" : "hidden",
      ])}
      data-bottom-sheet="profile-actions"
      aria-hidden={open ? "false" : "true"}
    >
      <div
        className="absolute inset-0 bg-black/80 transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0 }}
        data-bottom-sheet-overlay
        onClick={onClose}
      />
      <div
        className={classNames([
          "absolute bottom-0 left-0 right-0 bg-[#131313] border-t border-[#1D1D1D] rounded-t-[16px] px-4 pt-4 pb-6 transition-transform duration-300",
          open ? "translate-y-0" : "translate-y-full",
        ])}
        data-bottom-sheet-panel
      >
        <div className="mx-auto mb-4 h-[4px] w-12 rounded-full bg-[#2E2E2E]" />
        <div className="flex flex-col items-center gap-2 text-[#F5F5F5] text-[16px]">
          {canManageCover ? (
            <>
              <button
                type="button"
                className="flex items-center gap-3 w-full max-w-[540px] rounded-[10px] border border-[#232323] bg-[#1C1C1C] p-2 text-left hover:bg-[#252525] disabled:opacity-60"
                data-bottom-sheet-dismiss
                data-bottom-sheet-action="edit"
                onClick={() => handleAction("edit")}
                disabled={isCoverUpdating}
              >
                <div className="bg-[#0B0B0B] p-[6px] rounded-[8px] border border-[#1D1D1D]">
                  <img src="/design/img/sheet-update-profile.png" alt="Edit profile" />
                </div>
                Edit profile
              </button>
              <button
                type="button"
                className="flex items-center gap-3 w-full max-w-[540px] rounded-[10px] border border-[#232323] bg-[#1C1C1C] p-2 text-left hover:bg-[#252525] disabled:opacity-60"
                data-bottom-sheet-dismiss
                data-bottom-sheet-action="update-cover"
                onClick={() => handleAction("update-cover")}
                disabled={isCoverUpdating}
              >
                <div className="bg-[#0B0B0B] p-[6px] rounded-[8px] border border-[#1D1D1D]">
                  <img src="/design/img/sheet-upload-cover.png" alt="Update cover" />
                </div>
                Change cover
              </button>
              <button
                type="button"
                className="flex items-center gap-3 w-full max-w-[540px] rounded-[10px] border border-[#232323] bg-[#1C1C1C] p-2 text-left hover:bg-[#252525] disabled:opacity-60"
                data-bottom-sheet-dismiss
                data-bottom-sheet-action="remove-cover"
                onClick={() => handleAction("remove-cover")}
                disabled={isCoverUpdating || !canRemoveCover}
              >
                <div className="bg-[#0B0B0B] p-[6px] rounded-[8px] border border-[#1D1D1D]">
                  <img src="/design/img/sheet-delete-cover.png" alt="Remove cover" />
                </div>
                Remove cover
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="mt-4 w-full max-w-[540px] rounded-[10px] border border-[#232323] p-2 text-[#F5F5F5] hover:bg-[#1C1C1C]"
            data-bottom-sheet-dismiss
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileMobileHeader({ title, onBack, onOpenNavbarSheet }: ProfileMobileHeaderProps) {
  return (
    <header className="sm:hidden sticky top-0 z-50 flex h-[50px] w-full items-center justify-between bg-[#131313] border-b border-[#1D1D1D] text-[#dbdbdb] -mx-3 sm:mx-0">
      <button type="button" className="flex items-center gap-1 px-[16px] py-[14px]" onClick={onBack}>
        <img src="/design/img/back.png" alt="Back" />
      </button>
      <div className="flex justify-center font-semibold">{title}</div>
      <button
        type="button"
        className="flex items-center gap-1 px-[16px] py-[14px]"
        data-bottom-sheet-open
        data-bottom-sheet-target="navbar-actions"
        onClick={onOpenNavbarSheet}
        aria-label="Open actions"
      >
        <img src="/design/img/more.png" alt="Menu" />
      </button>
    </header>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, token, refreshProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const usernameParam = searchParams.get("user");
  const activeTabParam = searchParams.get("tab");
  const activeTab: ProfileTab =
    activeTabParam === "forum" || activeTabParam === "blog" ? activeTabParam : "profile";
  const username = (usernameParam ?? user?.username ?? "").trim();

  const isSelf = useMemo(() => {
    if (!user || !username) {
      return false;
    }
    return user.username.toLowerCase() === username.toLowerCase();
  }, [user, username]);

  const [data, setData] = useState<ProfileResponse | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowLoading, setFollowLoading] = useState(false);
  const [followMessage, setFollowMessage] = useState<string | null>(null);
  const [isNavbarSheetOpen, setIsNavbarSheetOpen] = useState(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCoverUpdating, setIsCoverUpdating] = useState(false);
  const [coverMessage, setCoverMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isComposerLoading, setIsComposerLoading] = useState(false);
  const [isLoadMoreLoading, setIsLoadMoreLoading] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [postsOffset, setPostsOffset] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [totalPosts, setTotalPosts] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!username) {
      setError("User not specified");
      setLoading(false);
      return;
    }

    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setLoadMoreError(null);
      try {
        const response = await fetchProfile(username, token);
        if (ignore) {
          return;
        }
        setData(response);
        const initialPosts = response.posts ?? [];
        setPosts(initialPosts);
        const total = response.profile.stats?.posts ?? initialPosts.length;
        setTotalPosts(total);
        setPostsOffset(initialPosts.length);
        setHasMorePosts(initialPosts.length < total);
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load profile");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [username, token, reloadKey]);

  useEffect(() => {
    const fit = (element: HTMLTextAreaElement) => {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    };

    const textareas = Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea[data-autosize]"));
    textareas.forEach(fit);

    const handleInput = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLTextAreaElement && target.dataset.autosize !== undefined) {
        fit(target);
      }
    };

    document.addEventListener("input", handleInput);
    return () => {
      document.removeEventListener("input", handleInput);
    };
  }, [posts]);

  useEffect(() => {
    if (!followMessage) {
      return;
    }

    const timer = window.setTimeout(() => setFollowMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [followMessage]);

  useEffect(() => {
    if (!coverMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setCoverMessage(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [coverMessage]);

  useEffect(() => {
    setFollowMessage(null);
    setCoverMessage(null);
  }, [usernameParam]);

  const presenceUsername = data?.profile.username ?? null;

  useEffect(() => {
    if (!presenceUsername || loading || error) {
      return;
    }

    let cancelled = false;
    let pending = false;

    const refreshPresence = async () => {
      if (pending) {
        return;
      }

      pending = true;
      try {
        const response = await fetchProfile(presenceUsername, token);
        if (cancelled) {
          return;
        }

        setData((previous) => {
          if (!previous) {
            return response;
          }
          return {
            ...previous,
            profile: response.profile,
            followers: response.followers,
            following: response.following,
            notifications: response.notifications,
            isFollowing: response.isFollowing,
          };
        });
      } catch {
        // Ignore polling errors
      } finally {
        pending = false;
      }
    };

    void refreshPresence();
    const intervalId = window.setInterval(() => {
      void refreshPresence();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [presenceUsername, token, loading, error]);

  const handleCoverFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) {
        return;
      }

      if (!data || !token || !isSelf) {
        setCoverMessage({ type: "error", message: "You cannot change this cover." });
        return;
      }

      setIsCoverUpdating(true);
      setCoverMessage(null);

      try {
        const rawAvatarUrl = data.profile.profile.avatarUrl;
        const normalizedAvatarUrl =
          rawAvatarUrl && rawAvatarUrl.trim().length > 0 ? rawAvatarUrl : undefined;
        const dataUrl = await fileToDataUrl(file);
        await updateProfile(
          {
            coverUrl: dataUrl,
            avatarUrl: normalizedAvatarUrl,
          },
          token,
        );
        const updated = await fetchProfile(data.profile.username, token);
        setData((previous) =>
          previous
            ? {
                ...previous,
                profile: updated.profile,
                followers: updated.followers,
                following: updated.following,
              }
            : updated,
        );
        setCoverMessage({ type: "success", message: "Cover updated." });
        await refreshProfile().catch(() => undefined);
      } catch (uploadError) {
        setCoverMessage({
          type: "error",
          message: uploadError instanceof Error ? uploadError.message : "Failed to update cover.",
        });
      } finally {
        setIsCoverUpdating(false);
      }
    },
    [data, isSelf, token, refreshProfile],
  );

  const handleRemoveCover = useCallback(async () => {
    if (!data || !token || !isSelf) {
      setCoverMessage({ type: "error", message: "You cannot change this cover." });
      return;
    }

    setIsCoverUpdating(true);
    setCoverMessage(null);

    try {
      const rawAvatarUrl = data.profile.profile.avatarUrl;
      const normalizedAvatarUrl =
        rawAvatarUrl && rawAvatarUrl.trim().length > 0 ? rawAvatarUrl : undefined;
      await updateProfile(
        {
          coverUrl: "",
          avatarUrl: normalizedAvatarUrl,
        },
        token,
      );
      const updated = await fetchProfile(data.profile.username, token);
      setData((previous) =>
        previous
          ? {
              ...previous,
              profile: updated.profile,
              followers: updated.followers,
              following: updated.following,
            }
          : updated,
      );
      setCoverMessage({ type: "success", message: "Cover removed." });
      await refreshProfile().catch(() => undefined);
    } catch (removeError) {
      setCoverMessage({
        type: "error",
        message: removeError instanceof Error ? removeError.message : "Failed to remove cover.",
      });
    } finally {
      setIsCoverUpdating(false);
    }
  }, [data, isSelf, token, refreshProfile]);

  const handleProfileAction = useCallback(
    (action: ProfileAction) => {
      if (!isSelf) {
        return;
      }

      if (action === "edit") {
        navigate("/settings/profile");
        return;
      }

      if (action === "update-cover") {
        if (!isCoverUpdating) {
          setCoverMessage(null);
          coverFileInputRef.current?.click();
        }
        return;
      }

      if (action === "remove-cover") {
        if (!isCoverUpdating) {
          void handleRemoveCover();
        }
      }
    },
    [handleRemoveCover, isCoverUpdating, isSelf, navigate],
  );

  const handleFollowToggle = useCallback(async () => {
    if (!data || !token || isSelf) {
      return;
    }

    setFollowLoading(true);
    try {
      const targetUsername = data.profile.username;
      if (data.isFollowing) {
        const result = await unfollowUser(targetUsername, token);
        setFollowMessage(
          result.wasFollowing ? `Вы отписались от ${targetUsername}` : `Вы не были подписаны на ${targetUsername}`,
        );
      } else {
        const result = await followUser(targetUsername, token);
        setFollowMessage(
          result.alreadyFollowing
            ? `Вы уже подписаны на ${targetUsername}`
            : `Вы подписались на ${targetUsername}`,
        );
      }
      const updated = await fetchProfile(targetUsername, token);
      setData(updated);
    } catch (err) {
      setFollowMessage(null);
      setError(err instanceof Error ? err.message : "Failed to update subscription");
    } finally {
      setFollowLoading(false);
    }
  }, [data, isSelf, token]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }, [navigate]);

  const handleComposerSubmit = useCallback(
    async (rawContent: string) => {
      if (!data || !token) {
        throw new Error("You need to sign in to publish posts.");
      }

      const fallbackAuthor = user
        ? {
            id: user.id,
            username: user.username,
            displayName: user.username,
            avatarUrl: user.avatarUrl || DEFAULT_AVATAR,
          }
        : {
            id: data.profile.id,
            username: data.profile.username,
            displayName: data.profile.username,
            avatarUrl: data.profile.profile.avatarUrl || DEFAULT_AVATAR,
          };

      setIsComposerLoading(true);
      try {
        const newPost = await createProfilePost(data.profile.username, { content: rawContent.trim() }, token);

        const optimisticPost = newPost.author
          ? newPost
          : {
              ...newPost,
              author: fallbackAuthor,
            };

        setPosts((prev) => [optimisticPost, ...prev]);
        setTotalPosts((prev) => prev + 1);
        setPostsOffset((prev) => prev + 1);

        try {
          const [refreshedProfile, refreshedPosts] = await Promise.all([
            fetchProfile(data.profile.username, token),
            fetchProfilePosts(data.profile.username, { limit: POSTS_PAGE_SIZE }, token),
          ]);

          setData(refreshedProfile);

          const freshPosts = refreshedPosts.posts ?? [];
          setPosts(freshPosts);

          const refreshedTotal = refreshedPosts.total ?? refreshedProfile.profile.stats?.posts ?? freshPosts.length;
          setTotalPosts(refreshedTotal);

          setPostsOffset(refreshedPosts.nextOffset ?? freshPosts.length);
          setHasMorePosts(refreshedPosts.hasMore);
        } catch {
          // keep optimistic data; mark that more posts may exist
          setHasMorePosts(true);
        }
      } finally {
        setIsComposerLoading(false);
      }
    },
    [data, token, user],
  );

  const handleLoadMore = useCallback(async () => {
    if (!data || !hasMorePosts || isLoadMoreLoading) {
      return;
    }

    setIsLoadMoreLoading(true);
    setLoadMoreError(null);
    try {
      const result = await fetchProfilePosts(
        data.profile.username,
        { offset: postsOffset, limit: POSTS_PAGE_SIZE },
        token,
      );
      setPosts((prev) => [...prev, ...result.posts]);
      setHasMorePosts(result.hasMore);
      setPostsOffset(result.nextOffset);
      if (typeof result.total === "number") {
        setTotalPosts(result.total);
      }
    } catch (err) {
      setLoadMoreError(err instanceof Error ? err.message : "Could not load more posts.");
    } finally {
      setIsLoadMoreLoading(false);
    }
  }, [data, hasMorePosts, isLoadMoreLoading, postsOffset, token]);

  const headerTitle = data?.profile.username ?? username ?? "Profile";
  const handleSelectTab = useCallback(
    (nextTab: ProfileTab) => {
      const params = new URLSearchParams();
      if (usernameParam) {
        params.set("user", usernameParam);
      }
      if (nextTab !== "profile") {
        params.set("tab", nextTab);
      }
      setSearchParams(params);
    },
    [setSearchParams, usernameParam],
  );

  const canInteract = Boolean(token);
  const canPost = canInteract;

  return (
    <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start text-[#dbdbdb]">
      <DesktopSidebar />

      <div className="flex w-full max-w-[540px] flex-col items-center gap-2 sm:items-start sm:gap-4 px-3 sm:px-0">
        <ProfileMobileHeader
          title={headerTitle}
          onBack={handleBack}
          onOpenNavbarSheet={() => setIsNavbarSheetOpen(true)}
        />

        {loading && <ProfileSkeleton />}
        {!loading && error && (
          <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />
        )}
        {!loading && !error && data && (
          <ProfileContent
            data={data}
            posts={posts}
            isSelf={isSelf}
            canInteract={canInteract}
            canPost={canPost}
            onFollowToggle={handleFollowToggle}
            followLoading={isFollowLoading}
            onOpenProfileActions={() => setIsProfileSheetOpen(true)}
            onOpenNavbarSheet={() => setIsNavbarSheetOpen(true)}
            onBack={handleBack}
            onCreatePost={handleComposerSubmit}
            composerLoading={isComposerLoading}
            hasMorePosts={hasMorePosts}
            onLoadMore={handleLoadMore}
            loadMoreLoading={isLoadMoreLoading}
            loadMoreError={loadMoreError}
            totalPosts={totalPosts}
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            followMessage={followMessage}
            coverMessage={coverMessage}
            isCoverUpdating={isCoverUpdating}
          />
        )}
      </div>

      <input ref={coverFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFileChange} />

      <MobileBottomNav activeHref="/profile" />
      <NavbarActionsSheet open={isNavbarSheetOpen} onClose={() => setIsNavbarSheetOpen(false)} textClassName="text-[16px]" />
      <ProfileActionsSheet
        open={isProfileSheetOpen}
        onClose={() => setIsProfileSheetOpen(false)}
        onAction={handleProfileAction}
        canManageCover={isSelf}
        canRemoveCover={Boolean(
          isSelf && data?.profile.profile.coverUrl && data.profile.profile.coverUrl.trim().length > 0,
        )}
        isCoverUpdating={isCoverUpdating}
      />
    </div>
  );
}

function ProfileContent({
  data,
  posts,
  isSelf,
  canInteract,
  canPost,
  onFollowToggle,
  followLoading,
  onOpenProfileActions,
  onOpenNavbarSheet,
  onBack,
  onCreatePost,
  composerLoading,
  hasMorePosts,
  onLoadMore,
  loadMoreLoading,
  loadMoreError,
  totalPosts,
  activeTab,
  onSelectTab,
  followMessage,
  coverMessage,
  isCoverUpdating,
}: ProfileContentProps) {
  const avatar = data.profile.profile.avatarUrl || DEFAULT_AVATAR;
  const cover = data.profile.profile.coverUrl || DEFAULT_COVER;
  const rawBio = data.profile.profile.bio?.trim();
  const bio = rawBio && rawBio.length > 0 ? rawBio : BIO_PLACEHOLDER;
  const lastSeenSource = data.profile.profile.lastSeenAt ?? data.profile.updatedAt ?? data.profile.profile.updatedAt;
  const lastSeenLabel = formatLastVisit(lastSeenSource);
  const lastSeenDisplay = lastSeenLabel === "Сейчас онлайн" ? lastSeenLabel : `${lastSeenLabel}`;
  const followLabel = followLoading ? "..." : data.isFollowing ? "Отписаться" : "Подписаться";
  const postsTotal = Math.max(totalPosts, posts.length);
  const defaultAuthor = {
    id: data.profile.id,
    username: data.profile.username,
    displayName: data.profile.username,
    avatarUrl: avatar,
  };
  const coverAlertClass =
    coverMessage?.type === "success"
      ? "rounded-[8px] border border-[#193524] bg-[#112519] text-[#93f2c4]"
      : coverMessage?.type === "error"
        ? "rounded-[8px] border border-[#402626] bg-[#2A1414] text-[#f5caca]"
        : "";

  return (
    <div className="w-full max-w-[540px] flex flex-col gap-2 items-center text-[14px] p-3 sm:gap-4 sm:p-0">
      <div className="hidden sm:flex items-center pt-1 justify-between w-full text-[#dbdbdb] sticky top-0 bg-black z-50">
        <button type="button" className="flex items-center gap-1 pr-4 py-3" onClick={onBack}>
          <img className="w-[26px]" src="/design/img/back.png" alt="Back" />
        </button>
        <div className="flex justify-center font-semibold text-[16px] gap-2">
          <p>Users</p>
          <p className="text-[#414141] font-bold">/</p>
          <p>{data.profile.username}</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 pl-4 py-3"
          data-bottom-sheet-open
          data-bottom-sheet-target="navbar-actions"
          onClick={onOpenNavbarSheet}
          aria-label="More actions"
        >
          <img className="w-[26px]" src="/design/img/more.png" alt="Menu" />
        </button>
      </div>

      <div className="flex flex-col w-full bg-[#131313] border border-[#1D1D1D] text-white rounded-[12px]">
        <div
          className="flex items-start justify-end h-[110px] sm:h-[160px] w-full bg-cover bg-center rounded-[12px]"
          style={{ backgroundImage: `url(${cover})` }}
        >
          {isSelf ? (
            <button
              type="button"
              className="p-4 disabled:opacity-60"
              data-bottom-sheet-open
              data-bottom-sheet-target="profile-actions"
              onClick={onOpenProfileActions}
              aria-label="Profile actions"
              disabled={isCoverUpdating}
            >
              <img className="w-6" src="/design/img/more-gray.png" alt="" />
            </button>
          ) : null}
        </div>

        <div className="flex items-start justify-between w-full">
          <div className="flex">
            <Link to={`/profile?user=${encodeURIComponent(data.profile.username)}`} className="p-4 pb-0 pt-0 mt-[-24px]">
              <img className="w-[80px] h-[80px] rounded-[12px] object-cover" src={avatar} alt={data.profile.username} />
            </Link>
            <div className="flex flex-col">
              <span className="flex items-center gap-1 font-bold text-[18px] px-0 py-2 pb-0">
                {data.profile.username}
                <img className="w-[18px]" src="/design/img/badge.png" alt="Badge" />
              </span>
              <span className="text-[#dbdbdb] text-[14px] px-0 pt-0 py-2">
                {lastSeenDisplay}
              </span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 px-4 py-2 pb-0">
            {isSelf ? (
              <>
                <Link
                  to="/settings/profile"
                  className="flex items-center gap-2 bg-[#32afed] px-[12px] py-[6px] rounded-[8px] text-[#000000] font-bold hover:bg-[#3abdff]"
                >
                  <img src="/design/img/mail-black.png" alt="Редактировать" />
                  Редактировать
                </Link>
                <button
                  type="button"
                  className="flex items-center gap-2 bg-[#ffffff] px-[12px] py-[6px] rounded-[8px] text-[#000000] font-bold hover:bg-[#e6e6e6] disabled:opacity-60"
                  onClick={onOpenProfileActions}
                  aria-label="More"
                  disabled={isCoverUpdating}
                >
                  <img src="/design/img/add.png" alt="More actions" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to={`/mail/chat?to=${encodeURIComponent(data.profile.username)}`}
                  className="flex items-center gap-2 bg-[#32afed] px-[12px] py-[6px] rounded-[8px] text-[#000000] font-bold hover:bg-[#2b99cf]"
                >
                  <img src="/design/img/mail-black.png" alt="Написать" />
                  Написать
                </Link>
                <button
                  type="button"
                  onClick={onFollowToggle}
                  disabled={!canInteract || followLoading}
                  className="flex items-center gap-2 bg-[#ffffff] px-[12px] py-[6px] rounded-[8px] text-[#000000] font-bold hover:bg-[#e6e6e6] disabled:opacity-60"
                  aria-label={data.isFollowing ? "Отписаться" : "Подписаться"}
                >
                  <img src="/design/img/add.png" alt="Переключить подписку" />
                  {followLabel}
                </button>
              </>
            )}
        </div>
      </div>

      {coverMessage && isSelf ? (
        <div className="px-4 pb-2" role="status" aria-live="polite">
          <div className={`${coverAlertClass} text-[13px] px-3 py-2`}>{coverMessage.message}</div>
        </div>
      ) : null}

      {followMessage && !isSelf ? (
        <div className="px-4 pb-2" role="status" aria-live="polite">
          <div className="rounded-[8px] border border-[#1D1D1D] bg-[#0f1b24] text-[#7dd3fc] text-[13px] px-3 py-2">
            {followMessage}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col px-4 py-2 gap-2">
        <span className="text-[16px] text-[#e1e1e1]">{bio}</span>
      </div>

        {!isSelf && (
          <div className="flex items-center gap-3 px-4 py-4 pt-1 sm:hidden">
            <Link
              to={`/mail/chat?to=${encodeURIComponent(data.profile.username)}`}
              className="flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#32afed] px-[12px] py-[6px] text-[14px] font-bold text-black hover:bg-[#2b99cf]"
            >
              <img src="/design/img/mail-black.png" alt="Написать" />
              Написать
            </Link>
            <button
              type="button"
              onClick={onFollowToggle}
              disabled={!canInteract || followLoading}
              className="flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#ffffff] px-[12px] py-[6px] text-[14px] font-bold text-black hover:bg-[#e6e6e6] disabled:opacity-60"
            >
              {followLabel}
            </button>
          </div>
        )}
      </div>

      <ProfileTabs activeTab={activeTab} onSelectTab={onSelectTab} />

      {activeTab === "profile" ? (
        <>
          {canPost ? <PostComposer onSubmit={onCreatePost} loading={composerLoading} /> : null}
          <PostsSection
            posts={posts}
            defaultAuthor={defaultAuthor}
            onOpenProfileActions={onOpenProfileActions}
            hasMorePosts={hasMorePosts}
            onLoadMore={onLoadMore}
            loadMoreLoading={loadMoreLoading}
            loadMoreError={loadMoreError}
            totalPosts={postsTotal}
            canInteract={canInteract}
            isSelf={isSelf}
          />
        </>
      ) : (
        <div className="flex flex-col w-full max-w-[540px] gap-3 bg-[#131313] border border-[#1D1D1D] text-white p-[24px] rounded-[12px] text-center">
          <h2 className="text-[18px] font-semibold text-white">Раздел в разработке</h2>
          <p className="text-[14px] text-[#8C8C8C]">Эта вкладка пока недоступна. Загляните позже.</p>
        </div>
      )}
    </div>
  );
}

type PostComposerProps = {
  onSubmit: (content: string) => Promise<void>;
  loading: boolean;
};

function PostComposer({ onSubmit, loading }: PostComposerProps) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [content]);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Напишите что-нибудь перед отправкой.");
      return;
    }
    setError(null);
    try {
      await onSubmit(trimmed);
      setContent("");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Не удалось отправить сообщение.");
    }
  };

  return (
    <div className="flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white p-[16px] rounded-[12px]">
      <textarea
        ref={textareaRef}
        data-autosize
        rows={1}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            void handleSubmit();
          }
        }}
        placeholder={COMPOSER_PLACEHOLDER}
        className="w-full bg-[#131313] text-[#dbdbdb] placeholder:text-[#8C8C8C] resize-none overflow-hidden leading-[1.4] border-0 focus:ring-0 focus:outline-none min-h-[32px] max-h-[50vh]"
        disabled={loading}
      />
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <button type="button" className="p-1 pl-0 pb-0 disabled:opacity-60" disabled>
            <img src="/design/img/image.png" alt="Add image" />
          </button>
          <button type="button" className="p-1 pb-0 disabled:opacity-60" disabled>
            <img src="/design/img/text-font.png" alt="Formatting" />
          </button>
        </div>
        <button
          type="button"
          className="py-[6px] px-[8px] font-bold text-[#000000] bg-[#32afed] hover:bg-[#2b99cf] rounded-[8px] disabled:opacity-60"
          onClick={() => void handleSubmit()}
          disabled={loading}
        >
          {loading ? "Отправка..." : "Отправить"}
        </button>
      </div>
      {error ? <p className="text-[12px] text-[#f87171]">{error}</p> : null}
    </div>
  );
}

type ProfileTabsProps = {
  activeTab: ProfileTab;
  onSelectTab: (tab: ProfileTab) => void;
};

function ProfileTabs({ activeTab, onSelectTab }: ProfileTabsProps) {
  const tabs: Array<{ key: ProfileTab; label: string }> = [
    { key: "profile", label: "Профиль" },
    { key: "forum", label: "Форум" },
    { key: "blog", label: "Блог" },
  ];

  return (
    <div className="flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white rounded-[12px]">
      <div className="flex items-center justify-around gap-3 py-[4px] px-[6px] w-full">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelectTab(tab.key)}
            className={classNames([
              "flex items-center justify-center text-[#dbdbdb] w-full px-[18px] py-[8px] rounded-[8px]",
              tab.key === activeTab
                ? "bg-[#0B0B0B] border border-[#1D1D1D] font-semibold"
                : "border border-transparent hover:border-[#1D1D1D]",
            ])}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type PostsSectionProps = {
  posts: ProfilePost[];
  defaultAuthor: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  onOpenProfileActions: () => void;
  hasMorePosts: boolean;
  onLoadMore: () => void;
  loadMoreLoading: boolean;
  loadMoreError: string | null;
  totalPosts: number;
  canInteract: boolean;
  isSelf: boolean;
};

function PostsSection({
  posts,
  defaultAuthor,
  onOpenProfileActions,
  hasMorePosts,
  onLoadMore,
  loadMoreLoading,
  loadMoreError,
  totalPosts,
  canInteract,
  isSelf,
}: PostsSectionProps) {
  const postsCount = Math.max(totalPosts, posts.length);

  if (posts.length === 0) {
    const title = isSelf ? "No posts yet" : `${defaultAuthor.username} has no posts yet`;
    const subtitle = isSelf
      ? "Start the conversation by writing the first post."
      : canInteract
        ? "Be the first to leave a message on this wall."
        : "Sign in to leave a message.";

    return (
      <div className="flex flex-col items-center justify-center text-[#dbdbdb] gap-3 w-full max-w-[540px] py-10">
        <div className="w-[120px] h-[120px]">
          <img className="h-full w-full" src={NO_POSTS_IMAGE} alt="Нет записей" />
        </div>
        <p className="text-[16px] font-semibold text-white">{title}</p>
        <p className="text-[14px] text-[#8C8C8C]">{subtitle}</p>
        <span className="text-[12px] uppercase tracking-[0.08em] text-[#666]">
          0 из {postsCount} записей
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full gap-2">
      {posts.map((post) => {
        const author = post.author ?? defaultAuthor;
        const rawUsername = author?.username ?? "";
        const safeUsername =
          rawUsername && rawUsername.trim().length > 0 ? rawUsername.trim() : defaultAuthor.username;
        const displayLabel = safeUsername;
        const authorAvatar =
          author?.avatarUrl && author.avatarUrl.trim().length > 0 ? author.avatarUrl : defaultAuthor.avatarUrl;

        const createdAtRelative = formatRelative(post.createdAt);
        const createdAtFull = formatDate(post.createdAt);

        return (
          <article
            id={`post-${post.id}`}
            key={post.id}
            className="flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white p-[16px] rounded-[12px]"
          >
            <div className="flex justify-between gap-2">
              <div className="flex gap-2">
                <Link to={`/profile?user=${encodeURIComponent(safeUsername)}`}>
                  <img
                    className="w-[42px] h-[42px] rounded-[8px] object-cover"
                    src={authorAvatar}
                    alt={`${displayLabel} avatar`}
                  />
                </Link>
                <div className="flex flex-col justify-center gap-1">
                  <div className="flex items-center gap-1">
                    <div className="font-semibold text-[16px]">
                      <Link to={`/profile?user=${encodeURIComponent(safeUsername)}`} className="hover:underline">
                        {displayLabel}
                      </Link>
                    </div>
                    <img className="w-[18px]" src="/design/img/badge.png" alt="Badge" />
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-[#e1e1e1]">
                    <time dateTime={post.createdAt} title={createdAtFull}>
                      {createdAtRelative}
                    </time>
                  </div>
                </div>
              </div>
              <div className="flex items-start justify-end">
                {isSelf ? (
                  <button
                    type="button"
                    className="p-2 hover:bg-[#1D1D1D] rounded-[8px]"
                    data-bottom-sheet-open
                    data-bottom-sheet-target="profile-actions"
                    onClick={onOpenProfileActions}
                    aria-label="Post actions"
                  >
                    <img src="/design/img/more-gray.png" alt="" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {post.imageUrl ? (
                <img
                  className="rounded-[8px] border border-[#1D1D1D] object-cover"
                  src={post.imageUrl}
                  alt={post.title ?? `Post by ${displayLabel}`}
                />
              ) : null}
              {post.title ? <h3 className="text-[16px] font-semibold text-white">{post.title}</h3> : null}
              <p className="text-[#e1e1e1] text-[16px] whitespace-pre-line">{post.content}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center pb-0 gap-2">
                <button type="button" className="p-2 hover:bg-[#0d1f12] rounded-[9999px]" disabled>
                  <img width={18} height={18} src="/design/img/vote-up.png" alt="Upvote" />
                </button>
                <span className="cursor-pointer">{post.likesCount}</span>
                <button type="button" className="p-2 hover:bg-[#61111f] rounded-[9999px]" disabled>
                  <img src="/design/img/vote-down.png" alt="Downvote" />
                </button>
              </div>
              <button
                type="button"
                className="py-[6px] px-[8px] text-[#31AEEC] hover:bg-[#0c2836] rounded-[8px]"
                disabled={!canInteract}
              >
                Ответить · {post.commentsCount}
              </button>
            </div>
          </article>
        );
      })}

      {loadMoreError ? (
        <div className="w-full max-w-[540px] rounded-[12px] border border-[#3b1f1f] bg-[#1b0f0f] px-4 py-3 text-left text-[13px] text-[#fca5a5]">
          <p>{loadMoreError}</p>
          <button
            type="button"
            className="mt-2 inline-flex items-center justify-center rounded-[8px] border border-[#1D1D1D] px-3 py-1 text-[12px] font-semibold text-[#fca5a5] hover:bg-[#291515]"
            onClick={onLoadMore}
          >
            Повторить
          </button>
        </div>
      ) : null}

      {hasMorePosts ? (
        <button
          type="button"
          className={classNames([
            "flex items-center justify-center gap-1 w-full max-w-[540px] py-[10px] px-[14px] bg-[#131313] border border-[#1D1D1D] text-[#e1e1e1] font-bold text-[14px] rounded-[12px] hover:bg-[#1C1C1C]",
            loadMoreLoading && "opacity-60",
          ])}
          onClick={onLoadMore}
          disabled={loadMoreLoading}
        >
          <img src="/design/img/more-gray.png" alt="" />
          <span>{loadMoreLoading ? "Загрузка..." : "Показать ещё"}</span>
        </button>
      ) : null}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="w-full max-w-[540px] animate-pulse">
      <div className="mb-3 h-[160px] w-full rounded-[12px] bg-[#1D1D1D]" />
      <div className="mb-3 flex items-start gap-3">
        <div className="h-[80px] w-[80px] rounded-[12px] bg-[#1D1D1D]" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-5 w-1/3 rounded bg-[#1D1D1D]" />
          <div className="h-4 w-1/4 rounded bg-[#1D1D1D]" />
          <div className="h-3 w-1/5 rounded bg-[#1D1D1D]" />
        </div>
      </div>
      <div className="mb-3 h-[70px] w-full rounded-[12px] bg-[#131313]" />
      <div className="h-[140px] w-full rounded-[12px] bg-[#131313]" />
    </div>
  );
}

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="w-full max-w-[540px] rounded-[12px] border border-[#1D1D1D] bg-[#131313] px-6 py-8 text-center text-[#dbdbdb]">
      <h2 className="text-[18px] font-semibold text-white">Unable to load the profile</h2>
      <p className="mt-2 text-[14px] text-[#8C8C8C]">{message}</p>
      {onRetry ? (
        <button
          type="button"
          className="mt-4 inline-flex items-center justify-center rounded-[8px] bg-[#32afed] px-4 py-2 text-[14px] font-semibold text-black hover:bg-[#2b99cf]"
          onClick={onRetry}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
















