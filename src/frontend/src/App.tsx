import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { Toaster } from "@/components/ui/sonner";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { hasApiKey } from "@/lib/youtube";
import { ChannelPage } from "@/pages/ChannelPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { HomePage } from "@/pages/HomePage";
import { SearchPage } from "@/pages/SearchPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SetupPage } from "@/pages/SetupPage";
import { WatchPage } from "@/pages/WatchPage";
import { useCallback, useEffect, useState } from "react";

type Page =
  | "home"
  | "trending"
  | "music"
  | "gaming"
  | "news"
  | "sports"
  | "settings"
  | "search"
  | "history"
  | "watch"
  | "channel";

interface NavState {
  page: Page;
  watchId?: string;
  watchStartTime?: number;
  channelId?: string;
  searchQuery?: string;
}

const SESSION_KEY = "modxtube_nav_state";

function loadPersistedState(): NavState[] {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as NavState[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return [{ page: "home" }];
}

export default function App() {
  const [apiReady, setApiReady] = useState(hasApiKey);
  const [navStack, setNavStack] = useState<NavState[]>(loadPersistedState);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { canInstall, install } = usePwaInstall();

  const current = navStack[navStack.length - 1];
  const currentPage = current.page;
  const watchId = current.watchId ?? "";
  const watchStartTime = current.watchStartTime ?? 0;
  const channelId = current.channelId ?? "";
  const searchQuery = current.searchQuery ?? "";

  // Persist nav stack to sessionStorage on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(navStack));
    } catch {
      // ignore
    }
  }, [navStack]);

  // Android back button: popstate -> go back one page in stack
  useEffect(() => {
    window.history.pushState({ depth: 0 }, "");
    const handlePopState = () => {
      setNavStack((prev) => {
        if (prev.length > 1) {
          window.history.pushState({ depth: prev.length - 2 }, "");
          return prev.slice(0, -1);
        }
        window.history.pushState({ depth: 0 }, "");
        return prev;
      });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const pushPage = useCallback((state: NavState) => {
    window.history.pushState({ depth: 1 }, "");
    setNavStack((prev) => [...prev, state]);
  }, []);

  // Bottom nav resets to root
  const handleNavigate = useCallback((page: string) => {
    setNavStack([{ page: page as Page }]);
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      pushPage({ page: "search", searchQuery: query });
    },
    [pushPage],
  );

  const handleWatch = useCallback(
    (id: string, resumeTime?: number) => {
      pushPage({ page: "watch", watchId: id, watchStartTime: resumeTime || 0 });
    },
    [pushPage],
  );

  const handleChannelClick = useCallback(
    (id: string, _title: string) => {
      pushPage({ page: "channel", channelId: id });
    },
    [pushPage],
  );

  if (!apiReady) {
    return (
      <>
        <SetupPage onSetup={() => setApiReady(true)} />
        <Toaster />
      </>
    );
  }

  function renderPage() {
    if (currentPage === "watch" && watchId) {
      return (
        <WatchPage
          videoId={watchId}
          onWatch={handleWatch}
          onChannelClick={handleChannelClick}
          startTime={watchStartTime}
        />
      );
    }
    if (currentPage === "channel" && channelId) {
      return (
        <ChannelPage
          channelId={channelId}
          onWatch={handleWatch}
          onBack={() =>
            setNavStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))
          }
          onChannelClick={handleChannelClick}
        />
      );
    }
    if (currentPage === "search") {
      return (
        <SearchPage
          query={searchQuery}
          onWatch={handleWatch}
          onChannelClick={handleChannelClick}
        />
      );
    }
    if (currentPage === "settings") {
      return <SettingsPage onClearKey={() => setApiReady(false)} />;
    }
    if (currentPage === "history") {
      return (
        <HistoryPage
          onWatch={handleWatch}
          onChannelClick={handleChannelClick}
        />
      );
    }
    if (currentPage === "trending") {
      return (
        <HomePage
          onWatch={handleWatch}
          onChannelClick={handleChannelClick}
          initialChip="trending"
        />
      );
    }
    return (
      <HomePage onWatch={handleWatch} onChannelClick={handleChannelClick} />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#000000" }}>
      <TopBar
        onSearch={handleSearch}
        onNavigate={handleNavigate}
        currentQuery={searchQuery}
      />

      {/* PWA install banner */}
      {canInstall && !bannerDismissed && (
        <div
          style={{
            position: "fixed",
            bottom: "calc(60px + env(safe-area-inset-bottom, 0px) + 8px)",
            left: 12,
            right: 12,
            zIndex: 200,
            background: "rgba(20,20,20,0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,0,0,0.25)",
            borderRadius: 16,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
          data-ocid="pwa.install.panel"
        >
          <img
            src="/assets/uploads/IMG_20260314_072526-1-1.png"
            alt=""
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1.5px solid rgba(255,0,0,0.6)",
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.2,
              }}
            >
              Install Modx Tube
            </div>
            <div style={{ color: "#aaa", fontSize: 11, marginTop: 2 }}>
              Add to home screen for the full app experience
            </div>
          </div>
          <button
            type="button"
            onClick={install}
            data-ocid="pwa.install.primary_button"
            style={{
              background: "rgba(255,0,0,0.85)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "6px 13px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Install
          </button>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            data-ocid="pwa.install.close_button"
            aria-label="Dismiss"
            style={{
              background: "none",
              border: "none",
              color: "#888",
              fontSize: 18,
              lineHeight: 1,
              cursor: "pointer",
              padding: "0 2px",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      )}

      <main
        style={
          currentPage === "watch"
            ? {
                paddingTop: "calc(64px + env(safe-area-inset-top, 0px))",
                paddingBottom: 0,
                height:
                  "calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }
            : {
                paddingTop: "calc(64px + env(safe-area-inset-top, 0px))",
                paddingBottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
                minHeight: "100vh",
              }
        }
      >
        {renderPage()}
      </main>
      <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
      <Toaster />
    </div>
  );
}
