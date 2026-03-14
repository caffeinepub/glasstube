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
import { useCallback, useState } from "react";

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

export default function App() {
  const [apiReady, setApiReady] = useState(hasApiKey);
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [watchId, setWatchId] = useState("");
  const [watchStartTime, setWatchStartTime] = useState(0);
  const [channelId, setChannelId] = useState("");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { canInstall, install } = usePwaInstall();

  const handleNavigate = useCallback((page: string) => {
    setCurrentPage(page as Page);
    if (page !== "search") setSearchQuery("");
    if (page !== "watch") setWatchId("");
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage("search");
    setWatchId("");
  }, []);

  const handleWatch = useCallback((id: string, resumeTime?: number) => {
    setWatchId(id);
    setWatchStartTime(resumeTime || 0);
    setCurrentPage("watch");
  }, []);

  const handleChannelClick = useCallback((id: string, _title: string) => {
    setChannelId(id);
    setCurrentPage("channel");
  }, []);

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
          onBack={() => setCurrentPage("home")}
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
        style={{
          paddingTop: "calc(64px + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
          minHeight: "100vh",
        }}
      >
        {renderPage()}
      </main>
      <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
      <Toaster />
    </div>
  );
}
