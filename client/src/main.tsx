import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { MessagesBadgeProvider } from "./contexts/MessagesBadgeContext.tsx";
import { SiteAccessProvider } from "./contexts/SiteAccessContext.tsx";
import { AppearanceProvider } from "./contexts/AppearanceContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SiteAccessProvider>
          <AppearanceProvider>
            <MessagesBadgeProvider>
              <App />
            </MessagesBadgeProvider>
          </AppearanceProvider>
        </SiteAccessProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
