import { useCallback, useEffect, useMemo, useState } from "react";

import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import { useAuth } from "@/contexts/useAuth";
import {
  createForumPost,
  deleteForumTopic,
  fetchForumTopic,
  incrementTopicView,
  updateTopicState,
  voteForumPost,
  type ForumPost,
  type ForumTopicDetail,
  type ForumTopicResponse,
  type ForumUserSummary,
} from "@/api/forum";

const DEFAULT_AVATAR = "/design/img/default-avatar.png";
const MAX_POST_LENGTH = 6000;

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0";
  }
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getAvatar(user: ForumUserSummary | null | undefined) {
  if (!user || !user.avatarUrl) {
    return DEFAULT_AVATAR;
  }
  return user.avatarUrl;
}

function getPostExcerpt(content: string, limit = 110) {
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "No content";
  }
  if (cleaned.length <= limit) {
    return cleaned;
  }
  return `${cleaned.slice(0, Math.max(0, limit - 3))}...`;
}
type TopicViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ForumTopicResponse };

type ReplyTarget = {
  postId: string;
  authorName: string;
  excerpt: string;
};

type VoteValue = -1 | 0 | 1;

type VoteControlsProps = {
  post: ForumPost;
  canVote: boolean;
  isPending: boolean;
  onVote: (post: ForumPost, value: VoteValue) => void;
};

function VoteControls({ post, canVote, isPending, onVote }: VoteControlsProps) {
  const votes = post.votes ?? { upvotes: 0, downvotes: 0, score: 0, user: 0 };
  const userVote =
    typeof votes.user === "number" && (votes.user === -1 || votes.user === 0 || votes.user === 1)
      ? (votes.user as VoteValue)
      : 0;
  const upvotes = Number.isFinite(Number(votes.upvotes)) ? Number(votes.upvotes) : 0;
  const downvotes = Number.isFinite(Number(votes.downvotes)) ? Number(votes.downvotes) : 0;
  const computedScore = Number.isFinite(Number(votes.score)) ? Number(votes.score) : upvotes - downvotes;
  const score = Number.isFinite(computedScore) ? computedScore : 0;
  const scoreLabel = score > 0 ? `+${score}` : `${score}`;
  const disableVote = !canVote || isPending;

  const upClasses = [
    "p-2",
    "rounded-[9999px]",
    "transition-colors",
    userVote === 1 ? "bg-[#0d1f12]" : "hover:bg-[#0d1f12]",
    disableVote ? "opacity-60 cursor-not-allowed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const downClasses = [
    "p-2",
    "rounded-[9999px]",
    "transition-colors",
    userVote === -1 ? "bg-[#61111f]" : "hover:bg-[#61111f]",
    disableVote ? "opacity-60 cursor-not-allowed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const scoreClasses = [
    disableVote ? "cursor-default" : "cursor-pointer",
    "font-semibold",
    score > 0 ? "text-[#66e48b]" : score < 0 ? "text-[#f0948b]" : "text-[#dbdbdb]",
  ]
    .filter(Boolean)
    .join(" ");

  const handleUpClick = () => {
    if (disableVote) {
      return;
    }
    onVote(post, userVote === 1 ? 0 : 1);
  };

  const handleDownClick = () => {
    if (disableVote) {
      return;
    }
    onVote(post, userVote === -1 ? 0 : -1);
  };

  return (
    <div className="flex items-center pb-0 gap-2">
      <button
        type="button"
        className={upClasses}
        onClick={handleUpClick}
        disabled={disableVote}
        aria-pressed={userVote === 1}
      >
        <img width={18} height={18} src="/design/img/vote-up.png" alt="Upvote" />
      </button>
      <span className={scoreClasses} title={`${upvotes} upvotes, ${downvotes} downvotes`}>
        {scoreLabel}
      </span>
      <button
        type="button"
        className={downClasses}
        onClick={handleDownClick}
        disabled={disableVote}
        aria-pressed={userVote === -1}
      >
        <img src="/design/img/vote-down.png" alt="Downvote" />
      </button>
    </div>
  );
}

type TopicActionsSheetProps = {
  open: boolean;
  topic: ForumTopicDetail | null;
  permissions: ForumTopicDetail["permissions"] | null;
  actionPending: boolean;
  onClose: () => void;
  onEdit: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
};

function TopicActionsSheet({
  open,
  topic,
  permissions,
  actionPending,
  onClose,
  onEdit,
  onToggleLock,
  onDelete,
}: TopicActionsSheetProps) {
  const lockLabel = topic?.isLocked ? "Unlock topic" : "Lock topic";
  const lockIcon = topic?.isLocked ? "/design/img/sheet-unlock.png" : "/design/img/sheet-lock.png";

  const actions = [
    {
      key: "edit",
      label: "Edit topic",
      icon: "/design/img/sheet-update-profile.png",
      visible: permissions?.canEdit,
      onClick: onEdit,
    },
    {
      key: "lock",
      label: lockLabel,
      icon: lockIcon,
      visible: permissions?.canLock,
      onClick: onToggleLock,
    },
    {
      key: "delete",
      label: "Delete topic",
      icon: "/design/img/sheet-delete-cover.png",
      visible: permissions?.canDelete,
      onClick: onDelete,
    },
    {
      key: "report",
      label: "Report",
      icon: "/design/img/sheet-report.png",
      visible: true,
      onClick: onClose,
    },
  ].filter((action) => action.visible);

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "hidden"}`}
      data-bottom-sheet="topic-actions"
      aria-hidden={open ? "false" : "true"}
    >
      <div
        className={`absolute inset-0 bg-black/80 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        data-bottom-sheet-overlay
        onClick={onClose}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 bg-[#131313] border-t border-[#1D1D1D] rounded-t-[16px] px-4 pt-4 pb-6 transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        data-bottom-sheet-panel
        role="menu"
      >
        <div className="mx-auto mb-4 h-[4px] w-12 rounded-full bg-[#2E2E2E]" />
        <div className="flex flex-col items-center gap-2 text-[#F5F5F5] text-[14px]">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              className="flex items-center gap-3 w-full max-w-[540px] rounded-[10px] border border-[#232323] bg-[#1C1C1C] p-2 text-left hover:bg-[#252525]"
              data-bottom-sheet-dismiss={undefined}
              onClick={action.onClick}
              disabled={actionPending}
            >
              <div className="bg-[#0B0B0B] p-[6px] rounded-[8px] border border-[#1D1D1D]">
                <img src={action.icon} alt="" />
              </div>
              {action.label}
            </button>
          ))}
          <button
            type="button"
            className="mt-4 w-full max-w-[540px] rounded-[10px] border border-[#232323] p-2 text-[#F5F5F5] hover:bg-[#1C1C1C]"
            data-bottom-sheet-dismiss
            onClick={onClose}
        >
          Close
        </button>
        </div>
      </div>
    </div>
  );
}
type UserActionsSheetProps = {
  open: boolean;
  post: ForumPost | null;
  onClose: () => void;
  onReply: () => void;
  onDelete: () => void;
};

function UserActionsSheet({ open, post, onClose, onReply, onDelete }: UserActionsSheetProps) {
  const canDelete = post?.permissions?.canDelete ?? false;

  const actions = [
    {
      key: "reply",
      label: "Reply to post",
      icon: "/design/img/sheet-update-profile.png",
      onClick: onReply,
      visible: Boolean(post),
    },
    {
      key: "delete",
      label: "Delete post",
      icon: "/design/img/sheet-delete-cover.png",
      onClick: onDelete,
      visible: canDelete,
    },
    {
      key: "report",
      label: "Report",
      icon: "/design/img/sheet-report.png",
      onClick: onClose,
      visible: Boolean(post),
    },
  ].filter((action) => action.visible);

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "hidden"}`}
      data-bottom-sheet="topic-user-actions"
      aria-hidden={open ? "false" : "true"}
    >
      <div
        className={`absolute inset-0 bg-black/80 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        data-bottom-sheet-overlay
        onClick={onClose}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 bg-[#131313] border-t border-[#1D1D1D] rounded-t-[16px] px-4 pt-4 pb-6 transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        data-bottom-sheet-panel
        role="menu"
      >
        <div className="mx-auto mb-4 h-[4px] w-12 rounded-full bg-[#2E2E2E]" />
        <div className="flex flex-col items-center gap-2 text-[#F5F5F5] text-[14px]">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              className="flex items-center gap-3 w-full max-w-[540px] rounded-[10px] border border-[#232323] bg-[#1C1C1C] p-2 text-left hover:bg-[#252525]"
              data-bottom-sheet-dismiss={undefined}
              onClick={action.onClick}
            >
              <div className="bg-[#0B0B0B] p-[6px] rounded-[8px] border border-[#1D1D1D]">
                <img src={action.icon} alt="" />
              </div>
              {action.label}
            </button>
          ))}
          <button
            type="button"
            className="mt-4 w-full max-w-[540px] rounded-[10px] border border-[#232323] p-2 text-[#F5F5F5] hover:bg-[#1C1C1C]"
            data-bottom-sheet-dismiss
            onClick={onClose}
          >\n            Close\n          </button>
        </div>
      </div>
    </div>
  );
}

type PostCardProps = {
  post: ForumPost;
  onReply: (post: ForumPost) => void;
  onVote: (post: ForumPost, value: VoteValue) => void;
  onOpenActions: (post: ForumPost) => void;
  canVote: boolean;
  isVotePending: boolean;
};

function PostCard({ post, onReply, onVote, onOpenActions, canVote, isVotePending }: PostCardProps) {
  return (
    <div
      id={`post-${post.id}`}
      className="flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border-t border-r border-l border-[#1D1D1D] text-white p-[16px] rounded-[12px]"
    >
      <div className="flex justify-between gap-2">
        <div className="flex gap-2">
          <a href="#">
            <img className="w-[42px] h-[42px] rounded-[8px] object-cover" src={getAvatar(post.author)} alt={post.author.displayName} />
          </a>
          <div className="flex flex-col justify-center gap-1">
            <div className="flex items-center gap-1">
              <div className="font-semibold text-[16px]">
                <a href="#">{post.author.displayName}</a>
              </div>
              <img className="w-[18px]" src="/design/img/badge.png" alt="" />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex text-[12px] text-[#e1e1e1] mt-[-4px]">{formatDateTime(post.createdAt)}</div>
            </div>
          </div>
        </div>
        <div className="flex items-start justify-end">
          <button
            type="button"
            data-bottom-sheet-open
            data-bottom-sheet-target="topic-user-actions"
            onClick={() => onOpenActions(post)}
          >
            <img className="p-2 hover:bg-[#1D1D1D] rounded-[8px]" src="/design/img/more-gray.png" alt="More actions" />
          </button>
        </div>
      </div>
      {post.replyTo ? (
        <a
          href={`#post-${post.replyTo.postId}`}
          className="flex items-start gap-2 w-full rounded-[8px] text-[#e1e1e1] px-3 py-2 border border-dashed hover:border-[#444] border-[#333]"
        >
          <img className="mt-[2px] w-[16px]" src="/design/img/reply.png" alt="Reply reference" />
          <span>
            <b>{post.replyTo.author.displayName}</b>, {post.replyTo.excerpt}
          </span>
        </a>
      ) : null}
      <p className="text-[#e1e1e1] text-[16px] whitespace-pre-line">{post.content}</p>
      <div className="flex items-center gap-3">
        <VoteControls post={post} canVote={canVote} isPending={isVotePending} onVote={onVote} />
        <button
          type="button"
          className="py-[6px] px-[8px] text-[#31AEEC] hover:bg-[#0c2836] rounded-[8px]"
          onClick={() => onReply(post)}
        >
          Reply
        </button>
      </div>
    </div>
  );
}
export function ForumTopicPage() {
  const navigate = useNavigate();
  const { topicId } = useParams<{ topicId: string }>();
  const { token } = useAuth();

  const [isNavbarSheetOpen, setIsNavbarSheetOpen] = useState(false);
  const [isTopicActionsOpen, setIsTopicActionsOpen] = useState(false);
  const [state, setState] = useState<TopicViewState>({ status: "loading" });
  const [postContent, setPostContent] = useState("");
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [activePost, setActivePost] = useState<ForumPost | null>(null);
  const [votePending, setVotePending] = useState<Record<string, boolean>>({});
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    const fit = (element: HTMLTextAreaElement) => {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    };

    const textareas = document.querySelectorAll<HTMLTextAreaElement>("textarea[data-autosize]");
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
  }, []);

  useEffect(() => {
    if (!topicId) {
      setState({ status: "error", message: "Topic not found." });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    setActionError(null);
    setVoteError(null);
    setVotePending({});

    fetchForumTopic(topicId, token ?? null)
      .then((response) => {
        if (cancelled) {
          return;
        }
        setState({ status: "ready", data: response });
        incrementTopicView(topicId, token ?? null).catch(() => {});
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Failed to load the topic.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [topicId, token]);

  useEffect(() => {
    const textarea = document.querySelector<HTMLTextAreaElement>("[data-reply-textarea]");
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [postContent]);

  const topic = state.status === "ready" ? state.data.topic : null;
  const section = state.status === "ready" ? state.data.section : null;

  const firstPost = useMemo(() => {
    if (state.status !== "ready") {
      return null;
    }
    return state.data.posts.reduce<ForumPost | null>((earliest, post) => {
      if (!earliest) return post;
      const earliestTime = new Date(earliest.createdAt ?? 0).getTime();
      const postTime = new Date(post.createdAt ?? 0).getTime();
      return postTime < earliestTime ? post : earliest;
    }, null);
  }, [state]);

  const replyPosts = useMemo(() => {
    if (state.status !== "ready") {
      return [] as ForumPost[];
    }
    const firstId = firstPost?.id ?? null;
    return state.data.posts.filter((post) => post.id !== firstId);
  }, [state, firstPost]);

  const commentsCount =
    state.status === "ready"
      ? state.data.pagination?.total ?? state.data.topic.repliesCount ?? replyPosts.length
      : 0;

  const canReply = state.status === "ready" ? Boolean(state.data.topic.permissions?.canReply) : false;
  const canVote = Boolean(token);
  const replyNotice =
    state.status === "ready"
      ? !token
        ? "Please sign in to leave a comment."
        : !canReply
          ? topic?.isLocked
            ? "Replies are disabled while the topic is locked."
            : "You do not have permission to reply in this topic."
          : null
      : null;
  const sectionLink = section ? `/forum/sections/${encodeURIComponent(section.id)}` : "/forum";
  const sectionTitle = section?.title ?? "Section";
  const topicTitle = topic?.title ?? "Topic";
  const topicAuthor = firstPost?.author ?? topic?.author ?? null;
  const topicCreatedAt = firstPost?.createdAt ?? topic?.createdAt ?? null;
  const handleReplyShortcut = useCallback((post: ForumPost) => {
    setReplyTarget({
      postId: post.id,
      authorName: post.author.displayName,
      excerpt: getPostExcerpt(post.content),
    });
    setFormError(null);
    setPostContent((current) => (current.trim().length === 0 ? `${post.author.displayName}, ` : current));
    window.requestAnimationFrame(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>("[data-reply-textarea]");
      textarea?.focus();
    });
  }, []);

  const handleClearReplyTarget = useCallback(() => {
    setReplyTarget(null);
  }, []);

  const handleOpenPostActions = useCallback((post: ForumPost) => {
    setActivePost(post);
  }, []);

  const handleClosePostActions = useCallback(() => {
    setActivePost(null);
  }, []);

  const handleSheetReply = useCallback(() => {
    if (activePost) {
      handleReplyShortcut(activePost);
    }
    setActivePost(null);
  }, [activePost, handleReplyShortcut]);

  const handleSheetDelete = useCallback(() => {
    setActivePost(null);
  }, []);

  const handleVote = useCallback(
    async (post: ForumPost, value: VoteValue) => {
      if (state.status !== "ready") {
        return;
      }
      if (!token) {
        setVoteError("Please sign in to vote on comments.");
        return;
      }

      const normalized: VoteValue = value === 1 ? 1 : value === -1 ? -1 : 0;

      setVoteError(null);
      setVotePending((prev) => ({ ...prev, [post.id]: true }));

      try {
        const updatedPost = await voteForumPost(post.id, { value: normalized }, token);
        setState((prev) => {
          if (prev.status !== "ready") {
            return prev;
          }
          return {
            status: "ready",
            data: {
              ...prev.data,
              posts: prev.data.posts.map((existing) => (existing.id === updatedPost.id ? updatedPost : existing)),
            },
          };
        });
      } catch (error) {
        setVoteError(error instanceof Error ? error.message : "Failed to update the vote.");
      } finally {
        setVotePending((prev) => {
          const next = { ...prev };
          delete next[post.id];
          return next;
        });
      }
    },
    [state.status, token],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (state.status !== "ready") {
        return;
      }

      setFormError(null);

      if (!token) {
        setFormError("Please sign in to leave a comment.");
        return;
      }

      if (!state.data.topic.permissions?.canReply) {
        try {
          const refreshed = await fetchForumTopic(state.data.topic.id, token, {
            page: state.data.pagination.page,
            limit: state.data.pagination.limit,
          });
          setState({ status: "ready", data: refreshed });
          if (!refreshed.topic.permissions?.canReply) {
            setFormError("You do not have permission to reply in this topic.");
            return;
          }
        } catch (error) {
          setFormError(error instanceof Error ? error.message : "Failed to refresh the topic.");
          return;
        }
      }

      const trimmed = postContent.trim();
      if (!trimmed) {
        setFormError("Enter a message before sending.");
        return;
      }

      if (trimmed.length > MAX_POST_LENGTH) {
        setFormError(`Reply cannot exceed ${MAX_POST_LENGTH} characters.`);
        return;
      }

      setPostSubmitting(true);
      try {
        const newPost = await createForumPost(state.data.topic.id, { content: trimmed, replyToPostId: replyTarget?.postId ?? null }, token);
        setState((prev) => {
          if (prev.status !== "ready") {
            return prev;
          }
          const currentTotal = prev.data.topic.repliesCount ?? prev.data.posts.length;
          return {
            status: "ready",
            data: {
              ...prev.data,
              posts: [...prev.data.posts, newPost],
              pagination: prev.data.pagination
                ? {
                    ...prev.data.pagination,
                    total: (prev.data.pagination.total ?? currentTotal) + 1,
                  }
                : prev.data.pagination,
              topic: {
                ...prev.data.topic,
                repliesCount: currentTotal + 1,
                lastPostAt: newPost.createdAt,
                lastPostAuthor: newPost.author,
              },
            },
          };
        });
        setPostContent("");
        setReplyTarget(null);
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Failed to send the comment.");
      } finally {
        setPostSubmitting(false);
      }
    },
    [postContent, state, token],
  );

  const handleToggleLock = useCallback(async () => {
    if (state.status !== "ready" || !token || !state.data.topic.permissions.canLock) {
      return;
    }
    setIsTopicActionsOpen(false);
    setActionPending(true);
    setActionError(null);
    try {
      const summary = await updateTopicState(state.data.topic.id, { isLocked: !state.data.topic.isLocked }, token);
      setState((prev) => {
        if (prev.status !== "ready") {
          return prev;
        }
        return {
          status: "ready",
          data: {
            ...prev.data,
            topic: {
              ...prev.data.topic,
              isLocked: summary.isLocked,
              isPinned: summary.isPinned,
              viewCount: summary.viewCount,
              repliesCount: summary.repliesCount,
              lastPostAt: summary.lastPostAt,
              lastPostAuthor: summary.lastPostAuthor,
              updatedAt: summary.updatedAt,
            },
          },
        };
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update the topic.");
    } finally {
      setActionPending(false);
    }
  }, [state, token]);

  const handleDeleteTopic = useCallback(async () => {
    if (state.status !== "ready" || !token || !state.data.topic.permissions.canDelete) {
      return;
    }
    if (!window.confirm("Delete this topic permanently?")) {
      return;
    }
    setIsTopicActionsOpen(false);
    setActionPending(true);
    setActionError(null);
    try {
      await deleteForumTopic(state.data.topic.id, token);
      navigate(sectionLink);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to delete the topic.");
    } finally {
      setActionPending(false);
    }
  }, [navigate, sectionLink, state, token]);

  const handleEditTopic = useCallback(() => {
    if (!topic) {
      return;
    }
    setIsTopicActionsOpen(false);
    navigate(`/forum/topics/${encodeURIComponent(topic.id)}/edit`);
  }, [navigate, topic]);

  const mobileTitle = topic ? `Topic - ${topic.title}` : "Topic";
  return (
    <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start text-[#dbdbdb]">
      <DesktopSidebar />

      <div className="flex items-center justify-between z-50 w-full bg-[#131313] border-b border-[#1D1D1D] text-[#dbdbdb] sticky top-0 sm:hidden">
        <Link to={sectionLink} className="flex items-center gap-1 px-[16px] py-[14px]">
          <img src="/design/img/back.png" alt="Back" />
        </Link>
        <div className="flex justify-center font-semibold">{mobileTitle}</div>
        <button
          type="button"
          className="flex items-center gap-1 px-[16px] py-[14px]"
          data-bottom-sheet-open
          data-bottom-sheet-target="navbar-actions"
          onClick={() => setIsNavbarSheetOpen(true)}
        >
          <img src="/design/img/more.png" alt="More" />
        </button>
      </div>

      <div className="w-full max-w-[540px] flex flex-col gap-3 items-center text-[14px] p-3 sm:gap-4 sm:p-0">
        <div className="hidden sm:flex items-center pt-1 justify-between w-full text-[#dbdbdb] sticky top-0 bg-black z-50">
          <Link to={sectionLink} className="flex items-center gap-1 pr-4 py-3">
            <img className="w-[26px]" src="/design/img/back.png" alt="Back" />
          </Link>
          <div className="flex justify-center font-semibold text-[16px] gap-2">
            <p>Forum</p>
            <p className="text-[#414141] font-bold">/</p>
            <p>{sectionTitle}</p>
            <p className="text-[#414141] font-bold">/</p>
            <p>{topicTitle}</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 pl-4 py-3"
            data-bottom-sheet-open
            data-bottom-sheet-target="navbar-actions"
            onClick={() => setIsNavbarSheetOpen(true)}
          >
            <img className="w-[26px]" src="/design/img/more.png" alt="More" />
          </button>
        </div>

        {actionError ? (
          <div className="flex flex-col w-full max-w-[540px] gap-2 bg-[#1b0f0f] border border-[#401919] text-[#f5c1c1] p-[16px] rounded-[12px]">
            {actionError}
          </div>
        ) : null}
        {voteError ? (
          <div className="flex flex-col w-full max-w-[540px] gap-2 bg-[#1b0f0f] border border-[#401919] text-[#f5c1c1] p-[16px] rounded-[12px]">
            {voteError}
          </div>
        ) : null}

        {state.status === "loading" ? (
          <div className="flex flex-col w-full max-w-[540px] items-center gap-3 bg-[#131313] border border-[#1D1D1D] text-white p-[24px] rounded-[12px]">
            <div className="h-8 w-8 rounded-full border-2 border-[#31AEEC] border-t-transparent animate-spin" />
            <p className="text-[14px] text-[#8C8C8C]">Loading topic...</p>
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="flex flex-col w-full max-w-[540px] gap-2 bg-[#1b0f0f] border border-[#401919] text-[#f5c1c1] p-[16px] rounded-[12px]">
            {state.message}
          </div>
        ) : null}

        {state.status === "ready" ? (
          <>
            <div className="flex flex-col gap-2 bg-[#131313] border-t border-r border-l border-[#1D1D1D] text-white p-[16px] pb-2 rounded-[12px]">
              <div className="flex justify-between gap-2">
                <div className="flex gap-2">
                  <a href="#">
                    <img
                      className="w-[42px] h-[42px] rounded-[8px] object-cover"
                      src={getAvatar(topicAuthor)}
                      alt={topicAuthor?.displayName ?? "Anonymous"}
                    />
                  </a>
                  <div className="flex flex-col justify-center gap-1">
                    <div className="flex items-center gap-1">
                      <div className="font-semibold text-[16px]">
                        <a href="#">{topicAuthor?.displayName ?? "Anonymous"}</a>
                      </div>
                      <img className="w-[18px]" src="/design/img/badge.png" alt="" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex text-[12px] text-[#e1e1e1] mt-[-4px]">{formatDateTime(topicCreatedAt)}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-start justify-end">
                  <button
                    type="button"
                    data-bottom-sheet-open
                    data-bottom-sheet-target="topic-actions"
                    onClick={() => setIsTopicActionsOpen(true)}
                  >
                    <img className="p-2 hover:bg-[#1D1D1D] rounded-[8px]" src="/design/img/more-gray.png" alt="More actions" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-[16px]">{topic?.title}</p>
                <p className="text-[#e1e1e1] text-[16px] whitespace-pre-line">{firstPost?.content ?? ""}</p>
              </div>

              <div className="flex items-center gap-3">
                {firstPost ? (
                  <VoteControls
                    post={firstPost}
                    canVote={canVote}
                    isPending={Boolean(votePending[firstPost.id])}
                    onVote={handleVote}
                  />
                ) : null}
                {firstPost ? (
                  <button
                    type="button"
                    className="py-[6px] px-[8px] text-[#31AEEC] hover:bg-[#0c2836] rounded-[8px]"
                    onClick={() => handleReplyShortcut(firstPost)}
                  >
                    Reply
                  </button>
                ) : null}
              </div>

              <div className="flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border-t border-r border-l border-[#1D1D1D] text-white p-[16px] rounded-[12px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src="/design/img/comment-gray.png" alt="Comments" />
                    <p className="text-[#e1e1e1]">Comments: {formatNumber(commentsCount)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <img src="/design/img/eye.png" alt="Views" />
                    <p className="text-[#e1e1e1] mt-[2px]">{formatNumber(topic?.viewCount ?? 0)}</p>
                  </div>
                </div>
              </div>

            </div>

            <form
              className="hidden sm:flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white p-[16px] rounded-[12px]"
              onSubmit={handleSubmit}
            >
              {replyTarget ? (
                <div className="flex items-start gap-2 pb-2">
                  <img className="mt-[12px]" src="/design/img/reply.png" alt="Reply" />
                  <p className="w-full rounded-[8px] text-[#e1e1e1] px-3 py-2 border border-dashed hover:border-[#444] border-[#333] cursor-pointer">
                    <b>{replyTarget.authorName},</b> {replyTarget.excerpt}
                  </p>
                  <button type="button" className="flex items-center justify-center" onClick={handleClearReplyTarget}>
                    <img className="p-2 pr-0 pl-1" src="/design/img/close.png" alt="Close" />
                  </button>
                </div>
              ) : null}

              <textarea
                data-autosize
                data-reply-textarea
                rows={3}
                placeholder="Write a comment"
                className="w-full bg-[#131313] text-[#dbdbdb] placeholder:text-[#8C8C8C] resize-none overflow-hidden leading-[1.4] border-0 focus:ring-0 focus:outline-none min-h-[32px] max-h-[50vh]"
                value={postContent}
                onChange={(event) => {
                  setPostContent(event.target.value);
                  setFormError(null);
                }}
                maxLength={MAX_POST_LENGTH}
                disabled={postSubmitting}
              />

              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <button type="button" className="p-1 pl-0 pb-0">
                    <img src="/design/img/image.png" alt="Attach image" />
                  </button>
                  <button type="button" className="p-1 pb-0">
                    <img src="/design/img/text-font.png" alt="Formatting" />
                  </button>
                </div>
                <button
                  type="submit"
                  className="py-[6px] px-[8px] font-bold text-[#000000] bg-[#32afed] hover:bg-[#2b99cf] rounded-[8px]"
                  disabled={postSubmitting}
                >
                  {postSubmitting ? "Sending..." : "Send"}
                </button>
              </div>
              <div className="flex justify-end text-[12px] text-[#8C8C8C]">
                {postContent.length} / {MAX_POST_LENGTH}
              </div>
              {formError ? <div className="text-[12px] text-[#f0948b]">{formError}</div> : null}
              {!formError && replyNotice ? (
                <div className="text-[12px] text-[#8C8C8C]">{replyNotice}</div>
              ) : null}
            </form>
            {replyPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-[#dbdbdb] gap-3 py-6 w-full max-w-[540px] bg-[#131313] border border-dashed border-[#1D1D1D] rounded-[12px]">
                <img src="/design/img/comment-gray.png" alt="No comments" className="w-[48px] h-[48px]" />
                <p className="text-[16px] font-semibold">No comments in this topic yet</p>
                <p className="text-[13px] text-[#8C8C8C]">Be the first to share your thoughts.</p>
              </div>
            ) : (
              replyPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onReply={handleReplyShortcut}
                  onVote={handleVote}
                  onOpenActions={handleOpenPostActions}
                  canVote={canVote}
                  isVotePending={Boolean(votePending[post.id])}
                />
              ))
            )}
          </>
        ) : null}
      </div>
      <div className="fixed bottom-0 left-0 right-0 h-[130px] sm:hidden z-50 bg-[#131313] border-t border-[#1D1D1D] text-white">
        {replyTarget ? (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1d1d1d]">
            <img className="w-[16px]" src="/design/img/reply.png" alt="Reply" />
            <p className="w-full rounded-[8px] text-[#e1e1e1] px-3 py-2 border border-[#1D1D1D] text-[12px]">
              <b>{replyTarget.authorName},</b> {replyTarget.excerpt}
            </p>
            <button type="button" onClick={handleClearReplyTarget}>
              <img className="p-2 pr-0 pl-1" src="/design/img/close.png" alt="Close" />
            </button>
          </div>
        ) : null}
        <form
          className="max-w-[540px] mx-auto w-full px-3 pt-2 pb-2 flex items-end gap-1"
          onSubmit={state.status === "ready" ? handleSubmit : undefined}
        >
          <button type="button" className="shrink-0 self-end p-2">
            <img src="/design/img/image.png" alt="Attach image" />
          </button>
          <textarea
            data-autosize
            data-reply-textarea
            rows={1}
            placeholder="Write a comment"
            className="flex-1 min-w-0 bg-[#0B0B0B] text-[#dbdbdb] placeholder:text-[#8C8C8C] leading-[1.4] resize-none overflow-hidden border border-[#1D1D1D] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-0 min-h-[40px] max-h-[40vh]"
            value={postContent}
            onChange={(event) => {
              setPostContent(event.target.value);
              setFormError(null);
            }}
            maxLength={MAX_POST_LENGTH}
            disabled={state.status !== "ready" || postSubmitting}
          />
          <button
            type="submit"
            className="shrink-0 self-end p-2 rounded-[10px] text-[#66e48b]"
            disabled={state.status !== "ready" || postSubmitting}
          >
            <img className="w-6 h-6" src="/design/img/send.png" alt="Send" />
          </button>
        </form>
        {formError ? <div className="px-4 pb-2 text-[12px] text-[#f0948b] sm:hidden">{formError}</div> : null}
        {!formError && replyNotice ? (
          <div className="px-4 pb-2 text-[12px] text-[#8C8C8C] sm:hidden">{replyNotice}</div>
        ) : null}
      </div>

      <MobileBottomNav activeHref="/forum" />
      <NavbarActionsSheet open={isNavbarSheetOpen} onClose={() => setIsNavbarSheetOpen(false)} />
      <TopicActionsSheet
        open={isTopicActionsOpen}
        onClose={() => setIsTopicActionsOpen(false)}
        topic={topic}
        permissions={topic?.permissions ?? null}
        actionPending={actionPending}
        onEdit={handleEditTopic}
        onToggleLock={handleToggleLock}
        onDelete={handleDeleteTopic}
      />
      <UserActionsSheet
        open={Boolean(activePost)}
        post={activePost}
        onClose={handleClosePostActions}
        onReply={handleSheetReply}
        onDelete={handleSheetDelete}
      />
    </div>
  );
}

























