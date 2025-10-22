import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import { OfficialBadge } from "@/components/common/OfficialBadge";
import { fetchUsersList, type UsersListItem } from "@/api/users";

const PAGE_SIZE = 12;

function calculateLevel(stats: { posts: number; followers: number }) {
  const base = stats.posts * 0.6 + stats.followers * 0.2;
  return Math.max(1, Math.min(60, Math.round(base / 5) + 1));
}

export function UsersPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [users, setUsers] = useState<UsersListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [overall, setOverall] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offsetRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  const loadUsers = useCallback(
    async (reset: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const currentOffset = reset ? 0 : offsetRef.current;

      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchUsersList({
          search: debouncedSearch.length > 0 ? debouncedSearch : undefined,
          limit: PAGE_SIZE,
          offset: currentOffset,
          signal: controller.signal,
        });

        offsetRef.current = result.nextOffset ?? currentOffset + result.users.length;
        setUsers((prev) => (reset ? result.users : [...prev, ...result.users]));
        setTotal(result.total);
        setOverall(result.overall);
        setHasMore(result.hasMore);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        if (requestError instanceof Error) {
          setError(requestError.message);
        } else {
          setError("РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch],
  );

  useEffect(() => {
    offsetRef.current = 0;
    loadUsers(true).catch(() => {
      /* РѕС€РёР±РєР° РѕР±СЂР°Р±РѕС‚Р°РЅР° РІ loadUsers */
    });

    return () => {
      abortRef.current?.abort();
    };
  }, [debouncedSearch, loadUsers]);

  const handleRetry = useCallback(() => {
    loadUsers(users.length === 0).catch(() => {
      /* handled */
    });
  }, [loadUsers, users.length]);

  const handleLoadMore = useCallback(() => {
    if (isLoading || !hasMore) {
      return;
    }
    loadUsers(false).catch(() => {
      /* handled */
    });
  }, [hasMore, isLoading, loadUsers]);

  const isInitialLoading = isLoading && users.length === 0 && !error;
  const hasResults = users.length > 0;

  return (
    <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start text-[#dbdbdb]">
      <DesktopSidebar />

      <div className="w-full max-w-[540px] flex flex-col gap-3 items-center text-[14px] p-3 sm:gap-4 sm:p-0">
        <MobileHeader
          title="РџРѕР»СЊР·РѕРІР°С‚РµР»Рё"
          backHref="/"
          actionsTarget="navbar-actions"
          onOpenActions={() => setIsSheetOpen(true)}
        />

        <div className="hidden sm:flex items-center pt-1 justify-between w-full text-[#dbdbdb] sticky top-0 bg-black z-50">
          <Link to="/" className="flex items-center gap-1 pr-4 py-3">
            <img className="w-[26px]" src="/design/img/back.png" alt="РќР°Р·Р°Рґ" />
          </Link>
          <div className="flex justify-center font-semibold text-[16px] gap-2">
            <p>NomiCMS</p>
            <p className="text-[#414141] font-bold">/</p>
            <p>РџРѕР»СЊР·РѕРІР°С‚РµР»Рё</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 pl-4 py-3"
            onClick={() => setIsSheetOpen(true)}
            data-bottom-sheet-open
            data-bottom-sheet-target="navbar-actions"
            aria-label="Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Рµ РґРµР№СЃС‚РІРёСЏ"
          >
            <img className="w-[26px]" src="/design/img/more.png" alt="РњРµРЅСЋ" />
          </button>
        </div>

        <section className="flex w-full flex-col gap-3 bg-[#131313] border border-[#1D1D1D] rounded-[12px] p-4 text-[#dbdbdb]">
          <header className="flex flex-col gap-1">
            <h1 className="text-[18px] font-semibold text-white">РќР°Р№РґРёС‚Рµ РµРґРёРЅРѕРјС‹С€Р»РµРЅРЅРёРєРѕРІ</h1>
            <p className="text-[13px] text-[#8C8C8C]">
              РџСЂРѕСЃРјР°С‚СЂРёРІР°Р№С‚Рµ Р°РєС‚РёРІРЅС‹С… СѓС‡Р°СЃС‚РЅРёРєРѕРІ СЃРѕРѕР±С‰РµСЃС‚РІР° Рё РїРѕРґРїРёСЃС‹РІР°Р№С‚РµСЃСЊ, С‡С‚РѕР±С‹ РЅРµ РїСЂРѕРїСѓСЃРєР°С‚СЊ РЅРѕРІС‹Рµ РјР°С‚РµСЂРёР°Р»С‹.
            </p>
          </header>
          <label className="flex items-center gap-2 rounded-[10px] border border-[#1D1D1D] bg-[#0B0B0B] px-3 py-2 focus-within:border-[#2b99cf]">
            <img src="/design/img/search.png" alt="РџРѕРёСЃРє" className="w-[18px]" />
            <input
              className="w-full bg-transparent text-[#dbdbdb] placeholder:text-[#8C8C8C] text-[14px] focus:outline-none"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Р’РІРµРґРёС‚Рµ РёРјСЏ РёР»Рё РёРЅС‚РµСЂРµСЃ"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded-[6px] p-1 hover:bg-[#1D1D1D]"
                aria-label="РћС‡РёСЃС‚РёС‚СЊ РїРѕРёСЃРє"
              >
                <img src="/design/img/close.png" alt="" className="w-[16px]" />
              </button>
            ) : null}
          </label>
          <span className="text-[12px] uppercase tracking-[0.08em] text-[#777777]">
            РќР°Р№РґРµРЅРѕ: {total} / {overall}
          </span>
        </section>

        {error ? (
          <div className="flex w-full flex-col items-center gap-3 rounded-[12px] border border-[#3b1f1f] bg-[#1b0f0f] px-6 py-8 text-center text-[#fca5a5]">
            <p className="text-[16px] font-semibold text-white">РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№</p>
            <p className="text-[14px]">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-[8px] bg-[#32afed] px-4 py-2 text-[14px] font-semibold text-black hover:bg-[#2b99cf]"
            >
              РџРѕРІС‚РѕСЂРёС‚СЊ РїРѕРїС‹С‚РєСѓ
            </button>
          </div>
        ) : null}

        {isInitialLoading ? (
          <ul className="flex w-full flex-col gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <li
                key={index}
                className="animate-pulse flex flex-col gap-3 rounded-[12px] border border-[#1D1D1D] bg-[#131313] p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="h-[60px] w-[60px] rounded-[12px] bg-[#1F1F1F]" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-4 w-1/3 rounded bg-[#1F1F1F]" />
                    <div className="h-3 w-1/4 rounded bg-[#1F1F1F]" />
                    <div className="h-3 w-full rounded bg-[#1F1F1F]" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-24 rounded-[8px] bg-[#1F1F1F]" />
                  <div className="h-8 w-28 rounded-[8px] bg-[#1F1F1F]" />
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {!isInitialLoading && !hasResults && !error ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center text-[#8C8C8C] w-full bg-[#131313] border border-[#1D1D1D] rounded-[12px] p-8">
            <img src="/design/profile-empty.svg" alt="РќРµС‚ СЂРµР·СѓР»СЊС‚Р°С‚РѕРІ" className="h-[120px] w-[120px]" />
            <p className="text-[16px] font-semibold text-white">РќРёРєРѕРіРѕ РЅРµ РЅР°С€Р»Рё</p>
            <p className="text-[14px]">
              РџРѕРїСЂРѕР±СѓР№С‚Рµ РёР·РјРµРЅРёС‚СЊ Р·Р°РїСЂРѕСЃ РёР»Рё Р·Р°РіР»СЏРЅРёС‚Рµ РїРѕР·Р¶Рµ, РєРѕРіРґР° РїРѕСЏРІСЏС‚СЃСЏ РЅРѕРІС‹Рµ СѓС‡Р°СЃС‚РЅРёРєРё.
            </p>
          </div>
        ) : null}

        {hasResults ? (
          <ul className="flex w-full flex-col gap-3">
            {users.map((user) => {
              const level = calculateLevel(user.stats);
              const followersLabel = user.stats.followers === 1 ? "РїРѕРґРїРёСЃС‡РёРє" : "РїРѕРґРїРёСЃС‡РёРєРѕРІ";
              const postsLabel = user.stats.posts === 1 ? "РїРѕСЃС‚" : "РїРѕСЃС‚РѕРІ";
              const bio = user.bio && user.bio.trim().length > 0 ? user.bio : "РџРѕРєР° Р±РµР· РѕРїРёСЃР°РЅРёСЏ.";

              return (
                <li
                  key={user.id}
                  className="flex flex-col gap-3 rounded-[12px] border border-[#1D1D1D] bg-[#131313] p-4 text-[#dbdbdb]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Link to={`/profile?user=${encodeURIComponent(user.username)}`} className="shrink-0">
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="h-[60px] w-[60px] rounded-[12px] object-cover"
                        />
                      </Link>
                      <div className="flex flex-col gap-1">
                        <Link
                          to={`/profile?user=${encodeURIComponent(user.username)}`}
                          className="text-[16px] font-semibold text-white hover:underline"
                        >
                          {user.displayName}
                        </Link>
                        <span className="text-[12px] text-[#8C8C8C]">@{user.username}</span>
                        <p className="text-[13px] text-[#bdbdbd] leading-snug">{bio}</p>
                        {user.location ? (
                          <span className="text-[12px] text-[#777777]">рџ“Ќ {user.location}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col items-end text-[12px] text-[#8C8C8C]">
                      <span className="rounded-[8px] bg-[#0B0B0B] px-2 py-1 text-white text-[13px] font-semibold border border-[#1D1D1D]">
                        LVL {level}
                      </span>
                      <span className="mt-1">РђРєС‚РёРІРЅС‹Р№ СѓС‡Р°СЃС‚РЅРёРє</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2 text-[12px] text-[#8C8C8C]">
                      <span className="flex items-center gap-1 rounded-[8px] border border-[#1D1D1D] bg-[#0B0B0B] px-3 py-1">
                        <img src="/design/img/topic-gray.png" alt="" />
                        {user.stats.posts} {postsLabel}
                      </span>
                      <span className="flex items-center gap-1 rounded-[8px] border border-[#1D1D1D] bg-[#0B0B0B] px-3 py-1">
                        <img src="/design/img/users.png" alt="" className="w-[14px]" />
                        {user.stats.followers} {followersLabel}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/profile?user=${encodeURIComponent(user.username)}`}
                        className="flex items-center gap-2 rounded-[8px] border border-[#1D1D1D] bg-[#0B0B0B] px-[12px] py-[6px] text-[13px] font-semibold hover:bg-[#1C1C1C]"
                      >
                        РџСЂРѕС„РёР»СЊ
                      </Link>
                      <Link
                        to={`/mail/chat?to=${encodeURIComponent(user.username)}`}
                        className="flex items-center gap-2 rounded-[8px] bg-[#32afed] px-[12px] py-[6px] text-[13px] font-semibold text-black hover:bg-[#2b99cf]"
                      >
                        РЎРѕРѕР±С‰РµРЅРёРµ
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {hasMore ? (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoading}
            className={`flex items-center justify-center gap-2 w-full rounded-[12px] border border-[#1D1D1D] bg-[#131313] px-4 py-3 text-[14px] font-semibold text-[#dbdbdb] hover:bg-[#1C1C1C] ${
              isLoading ? "opacity-60" : ""
            }`}
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#dbdbdb] border-t-transparent" />
                Р—Р°РіСЂСѓР¶Р°РµРј...
              </>
            ) : (
              "РџРѕРєР°Р·Р°С‚СЊ РµС‰С‘"
            )}
          </button>
        ) : null}
      </div>

      <MobileBottomNav activeHref="/users" />
      <NavbarActionsSheet open={isSheetOpen} onClose={() => setIsSheetOpen(false)} textClassName="text-[16px]" />
    </div>
  );
}
