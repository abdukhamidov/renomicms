import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { HomePage } from "@/pages/home/HomePage";
import { ForumPage } from "@/pages/forum/ForumPage";
import { ForumSectionPage } from "@/pages/forum/ForumSectionPage";
import { ForumTopicPage } from "@/pages/forum/ForumTopicPage";
import { ForumCreateTopicPage } from "@/pages/forum/ForumCreateTopicPage";
import { ForumEditTopicPage } from "@/pages/forum/ForumEditTopicPage";
import { NewsPage } from "@/pages/news/NewsPage";
import { MailPage } from "@/pages/mail/MailPage";
import { MailChatPage } from "@/pages/mail/MailChatPage";
import { NotificationsPage } from "@/pages/notifications/NotificationsPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { ProfileSettingsPage } from "@/pages/settings/ProfileSettingsPage";
import { PrivateSettingsPage } from "@/pages/settings/PrivateSettingsPage";
import { ResetPasswordPage } from "@/pages/settings/ResetPasswordPage";
import { NotificationSettingsPage as SettingsNotificationsPage } from "@/pages/settings/NotificationSettingsPage";
import { AppThemePage } from "@/pages/settings/AppThemePage";
import { AppLanguagePage } from "@/pages/settings/AppLanguagePage";
import { AuthHistoryPage } from "@/pages/settings/AuthHistoryPage";
import { ProfilePage } from "@/pages/profile/ProfilePage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { LogoutPage } from "@/pages/auth/LogoutPage";
import { UsersPage } from "@/pages/users/UsersPage";
import { AdminPage } from "@/pages/admin/AdminPage";
import { AdminStatsPage } from "@/pages/admin/AdminStatsPage";
import { AdminSiteAccessPage } from "@/pages/admin/AdminSiteAccessPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminAppearancePage } from "@/pages/admin/AdminAppearancePage";
import { MaintenancePage } from "@/pages/system/MaintenancePage";
import { useAuth } from "@/contexts/useAuth";
import { useSiteAccess } from "@/contexts/SiteAccessContext";

function App() {
  const location = useLocation();
  const { user, initializing } = useAuth();
  const { status, loading, error } = useSiteAccess();
  const isAuthRoute = location.pathname.startsWith("/auth");
  const isAdmin = user?.role === "admin";

  if (loading || initializing) {
    return null;
  }

  if (error) {
    return <MaintenancePage title="\u041e\u0448\u0438\u0431\u043a\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u0430" message={error} />;
  }

  if (!isAdmin) {
    if (status.mode === "maintenance" && !isAuthRoute) {
      return <MaintenancePage message={status.message} />;
    }

    if (status.mode === "auth_only" && !user && !isAuthRoute) {
      return <Navigate to="/auth/login" state={{ from: location.pathname + location.search }} replace />;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/forum" element={<ForumPage />} />
      <Route path="/forum/section" element={<ForumSectionPage />} />
      <Route path="/forum/topic" element={<ForumTopicPage />} />
      <Route path="/forum/create" element={<ForumCreateTopicPage />} />
      <Route path="/forum/edit" element={<ForumEditTopicPage />} />
      <Route path="/news" element={<NewsPage />} />
      <Route path="/mail" element={<MailPage />} />
      <Route path="/mail/chat" element={<MailChatPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/settings/profile" element={<ProfileSettingsPage />} />
      <Route path="/settings/privacy" element={<PrivateSettingsPage />} />
      <Route path="/settings/security" element={<ResetPasswordPage />} />
      <Route path="/settings/notifications" element={<SettingsNotificationsPage />} />
      <Route path="/settings/theme" element={<AppThemePage />} />
      <Route path="/settings/language" element={<AppLanguagePage />} />
      <Route path="/settings/auth-history" element={<AuthHistoryPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/users" element={<UsersPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/stats" element={<AdminStatsPage />} />
      <Route path="/admin/users" element={<AdminUsersPage />} />
      <Route path="/admin/appearance" element={<AdminAppearancePage />} />
      <Route path="/admin/access" element={<AdminSiteAccessPage />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/logout" element={<LogoutPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

