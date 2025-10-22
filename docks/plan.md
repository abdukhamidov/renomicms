# reNomiCMS React/Vite/Node/Postgres Migration Plan

## 1. Current Module Inventory
- **Shared layout assets**: Every HTML file imports `/design/style.css` (Tailwind build) and uses the same responsive shell: desktop sidebar, sticky mobile header, fixed mobile bottom navbar, top navigation breadcrumbs, tab controls, badges, forms, comment threads, and pill counters. Image assets live under `design/img/*`.
- **Auth (`modules/auth/login.html`, `register.html`)**: Two-column responsive layout with mobile header, step indicators, username/password inputs, CTA buttons, and auxiliary actions (password recovery, social entry placeholders).
- **Blogs (`modules/blogs/*.html`)**: Files exist but are empty; we must confirm expected UX and design with stakeholders or reuse patterns from news/forum until real markup arrives.
- **Forum (`modules/forum/*.html`)**: Rich feature set covering forum index, forum list, topic detail, topic creation, and topic editing. Includes topic/category cards, status badges, counters, tag chips, action menus, comment threads with replies, attachment previews, and mobile composer overlays.
- **Mail (`modules/mail/index.html`, `chat.html`)**: Mailbox list with tabs, filters, unread counters, and conversation cards; chat page with message bubbles, grouped day separators, attachments, quick actions, and composer with reply picker.
- **News (`modules/news/index.html`, `news.html`, `edit.html`)**: News feed cards, detail view with comment threads and editor actions, WYSIWYG-like edit form with metadata inputs, cover selection, tags, and button groups.
- **Notification (`modules/notification/index.html`)**: Multiple notification card templates (likes, replies, admin actions, bans, followers) sharing header, body, metadata, and action areas.
- **Settings (`modules/settings/*.html`)**: Suite of pages (main profile settings, privacy, notification toggles, app theme, app language, auth history, reset password) relying on list groups, toggle switches, segmented controls, select inputs, and audit tables.
- **User (`modules/user/*.html`)**: Public profile views with hero cards, about sections, statistics rows, tabbed content for activity/blog/forum posts, feed of comments, and composer forms similar to the forum/news modules.

## 2. Target Architecture Overview
- Adopt a mono-repo with `apps/web` (React/Vite) and `apps/api` (Node.js/Express) or keep two packages managed via workspace tooling (e.g., npm workspaces) for isolated builds.
- Maintain Tailwind as the design system driver; recreate the existing tokens via `tailwind.config.js`, move `design/style.css` into the new pipeline, and keep image assets in `public/design/img`.
- Use PostgreSQL as the single source of truth; introduce Prisma or Knex for schema migrations and type-safe data access.
- Expose REST (and optional WebSocket) APIs from the Node backend; secure with JWT-based auth and refresh tokens compatible with the auth module UX.
- Containerize services (Docker compose) for local development: `web`, `api`, `db`, and optional `pgAdmin`.

## 3. Frontend (Vite + React)
### 3.1 Project Setup
- Scaffold with `npm create vite@latest` (React + TypeScript), configure absolute imports, ESLint, Prettier, and Tailwind (reusing current PostCSS config).
- Relocate static assets (`design/img`) to `apps/web/public/design/img` and ensure Google Fonts (`Nunito Sans`) load via `<link>` or custom CSS import.

### 3.2 Application Infrastructure
- Introduce `react-router-dom` with nested routes mirroring module hierarchy (`/auth/login`, `/forum`, `/forum/:topicId`, `/news/:newsId/edit`, etc.).
- Add state/query layer (React Query or Redux Toolkit Query) for server communication, caching, and optimistic UI updates.
- Centralize form handling with `react-hook-form` (paired with Zod for validation) to cover the numerous settings and creation forms.
- Implement feature flags/guards for role-based access (admin actions in forum/news, ban notifications, etc.).

### 3.3 Shared UI Library
- Build reusable layout primitives: `AppShell` (sidebar + main + bottom nav), `DesktopSidebar`, `MobileHeader`, `MobileBottomBar`, `PageHeader`, `Breadcrumbs`.
- Extract typography and utility components: `SectionTitle`, `StatPill`, `Badge`, `Avatar`, `CounterBubble`, `TabBar`, `SegmentedControl`, `ToggleSwitch`, `Select`, `Textarea`, `AttachmentPreview`, `ActionMenu`.
- Create domain-specific molecules: `CommentThread`, `Composer`, `MessageBubble`, `NotificationCard`, `NewsCard`, `ForumTopicCard`, `SettingsListItem`, `AuditTable`, `ProfileHero`.
- Ensure Tailwind classes match original markup; where necessary, encapsulate repeated class sets via `clsx` helpers or Tailwind component directives.

### 3.4 Module Implementation Roadmap
- **Auth**: Routes for login/register/reset; integrate backend auth API, handle form validation, error states, and success flows; keep identical layout transitions across mobile/desktop.
- **Forum**: Pages for forum index, forum detail, topic detail, create/edit topic; implement pagination, sort/filter controls, comment threads, reply composer, attachment uploads, admin badges; integrate optimistic updates for posts and replies.
- **Mail**: Mailbox list with category tabs, unread counters, quick filters, and chat view with day grouping; wire WebSocket or polling for real-time updates; implement composer with attachments/audio placeholders.
- **News**: Feed with cards, detail view with comments, like/share actions, editing interface with status chips, cover selector, tag manager; reuse comment components.
- **Notification**: Render notification feed with variant-specific icons, metadata, CTA buttons; enable real-time updates via server push; add bulk actions (mark read).
- **Settings**: Multi-route settings area with shared sidebar/tabs; implement toggles, selects, password change flow, session history table (with pagination/export optional).
- **User Profiles**: Public profile layout with hero card, stats, tabs for activity/blog/forum; allow follow/unfollow, message CTA linking to Mail module; re-use comment feed for wall posts.
- **Blogs**: Clarify missing markup; either design placeholder components using forum/news patterns or await assets before implementation.

### 3.5 Quality and Responsiveness
- Match current breakpoints (mobile-first, `sm` for desktop layout). Snapshot styling with automated visual diff (Storybook + Chromatic or Playwright).
- Add accessibility checks (aria labels for icons, keyboard focus states for menus/toggles).

## 4. Backend (Node.js + Express)
- Scaffold Express app with modular routers per domain (`/auth`, `/users`, `/forum`, `/news`, `/mail`, `/notifications`, `/settings`).
- Use middleware for logging, rate-limiting, error handling, and auth guards (JWT verification, role middleware).
- Implement upload handling (attachments/avatars) via S3-compatible storage or local filesystem placeholder during initial phase.
- Provide WebSocket (Socket.IO) channels for chat and live notifications; fall back to server-sent events if needed.

## 5. Database (PostgreSQL)
- Define core tables: `users`, `profiles`, `sessions`, `forums`, `topics`, `posts`, `post_reactions`, `news`, `news_comments`, `blogs`, `blog_posts`, `mail_threads`, `mail_messages`, `notifications`, `settings`, `audit_logs`.
- Model relations (FK constraints, cascade rules) and indexes (search by slug, created_at).
- Manage schema via migrations (Prisma Migrate or Knex). Seed with sample data to mirror current static content for UI validation.

## 6. Integration Strategy
- Create client SDK wrappers for API endpoints and share request typing between backend and frontend (e.g., via `zod` schemas exported from `@renomi/contracts` package).
- Implement authentication with HTTP-only refresh tokens, short-lived access tokens, and remember-me toggle aligned with login design.
- Map form submissions in React to API endpoints: topic create/edit, news publish/edit, profile settings, notification preferences, password reset.
- Configure environment handling (`.env`) for backend secrets, database URLs, and frontend API base URLs.

## 7. Delivery Phases
1. **Foundation**: Set up repository structure, tooling, CI, Docker, lint/test pipelines.
2. **Shared UI & Layout**: Port global shell, typography, navigation, and utility components; verify design parity on key pages.
3. **Auth & Settings**: Implement authentication flow and settings pages to validate forms, validation, and secure API integration.
4. **Content Modules**: Sequentially rebuild Forum, News, Mail, Notifications, and User Profile experiences; introduce Blogs once requirements confirmed.
5. **Backend Enrichment**: Finalize business logic (moderation workflows, notifications, chat), add role management, refine data validation.
6. **Stabilization**: Comprehensive testing (unit, integration, e2e), performance tuning, accessibility sweep, production deployment preparations.

## 8. Immediate Next Actions
- Confirm requirements for empty blog module and any missing assets.
- Decide on workspace structure (single repo vs. packages) before scaffolding.
- Lock tooling choices (React Query vs. Redux, Prisma vs. Knex) to avoid churn during implementation.
- Start extracting shared UI patterns into component inventory to accelerate JSX conversion.
