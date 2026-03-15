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
import { useCallback, useEffect, useRef, useState } from "react";

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
const BG_SESSION_KEY = "modxtube_bg_nav_state";

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

function loadBgState(): NavState[] {
  try {
    const saved = sessionStorage.getItem(BG_SESSION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as NavState[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [{ page: "home" }];
}

// Floating draggable mini player card
function MiniPlayerCard({
  videoId,
  onExpand,
  onClose,
}: {
  videoId: string;
  onExpand: () => void;
  onClose: () => void;
}) {
  const MINI_W = window.innerWidth < 400 ? 200 : 260;
  const VIDEO_H = window.innerWidth < 400 ? 112 : 146;
  const CONTROLS_H = 36;
  const MINI_H = VIDEO_H + CONTROLS_H;

  // Default position: bottom-right above nav bar (8px from right, 84px from bottom)
  const [pos, setPos] = useState({
    x: window.innerWidth - MINI_W - 8,
    y: window.innerHeight - MINI_H - 84,
  });
  const [isPlaying, setIsPlaying] = useState(true);
  const [exiting, setExiting] = useState(false);
  const miniIframeRef = useRef<HTMLIFrameElement>(null);
  const dragging = useRef(false);
  const startTouch = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const totalDrag = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    dragging.current = true;
    totalDrag.current = 0;
    startTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    startPos.current = { ...pos };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const dx = e.touches[0].clientX - startTouch.current.x;
    const dy = e.touches[0].clientY - startTouch.current.y;
    totalDrag.current = Math.sqrt(dx * dx + dy * dy);
    const newX = Math.max(
      0,
      Math.min(window.innerWidth - MINI_W, startPos.current.x + dx),
    );
    const newY = Math.max(
      0,
      Math.min(window.innerHeight - MINI_H - 80, startPos.current.y + dy),
    );
    setPos({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    dragging.current = false;
  };

  const handleTap = () => {
    if (totalDrag.current < 8) onExpand();
  };

  const sendIframeCommand = (func: string) => {
    miniIframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args: "" }),
      "*",
    );
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      sendIframeCommand("pauseVideo");
    } else {
      sendIframeCommand("playVideo");
    }
    setIsPlaying(!isPlaying);
  };

  const handlePiP = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const iframe = miniIframeRef.current as any;
      if (iframe?.requestPictureInPicture) {
        iframe.requestPictureInPicture().catch(() => {});
      }
    } catch (_) {
      // PiP not supported for cross-origin iframes — silently fail
      // The YouTube iframe itself shows a native PiP button in its controls
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExiting(true);
    setTimeout(() => onClose(), 280);
  };

  const iframeSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&mute=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`;

  return (
    <div
      data-ocid="miniplayer.card"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: MINI_W,
        height: MINI_H,
        zIndex: 500,
        borderRadius: 16,
        background: "#000",
        border: "1px solid rgba(255,255,255,0.13)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        touchAction: "none",
        willChange: "transform",
        transform: "translateZ(0)",
        animation: exiting
          ? "miniOut 0.28s cubic-bezier(0.32,0.72,0,1) forwards"
          : "miniIn 0.32s cubic-bezier(0.32,0.72,0,1)",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <style>{`
        @keyframes miniIn {
          from { transform: scale(0.85) translateY(24px) translateZ(0); opacity: 0; }
          to   { transform: scale(1) translateY(0) translateZ(0); opacity: 1; }
        }
        @keyframes miniOut {
          from { transform: scale(1) translateY(0) translateZ(0); opacity: 1; }
          to   { transform: scale(0.85) translateY(24px) translateZ(0); opacity: 0; }
        }
      `}</style>

      {/* Video iframe area — tap to expand */}
      <button
        type="button"
        onClick={handleTap}
        style={{
          width: "100%",
          height: VIDEO_H,
          flexShrink: 0,
          position: "relative",
          cursor: "pointer",
          background: "#000",
          border: "none",
          padding: 0,
          display: "block",
        }}
      >
        <iframe
          ref={miniIframeRef}
          src={iframeSrc}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
            pointerEvents: "none",
          }}
          title="Mini player"
        />
      </button>

      {/* Controls bar */}
      <div
        style={{
          height: CONTROLS_H,
          flexShrink: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px",
          gap: 4,
        }}
      >
        {/* Play/Pause */}
        <button
          type="button"
          onClick={handlePlayPause}
          data-ocid="miniplayer.toggle"
          aria-label={isPlaying ? "Pause" : "Play"}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            fontSize: 18,
            cursor: "pointer",
            padding: "0 4px",
            lineHeight: 1,
            touchAction: "auto",
            flexShrink: 0,
          }}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        {/* Now Playing label */}
        <span
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 10,
            flex: 1,
            textAlign: "center",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          Now Playing
        </span>

        {/* PiP button */}
        <button
          type="button"
          onClick={handlePiP}
          data-ocid="miniplayer.pip_button"
          aria-label="Picture in Picture"
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            fontSize: 16,
            cursor: "pointer",
            padding: "0 4px",
            lineHeight: 1,
            touchAction: "auto",
            flexShrink: 0,
          }}
        >
          🖼
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={handleClose}
          data-ocid="miniplayer.close_button"
          aria-label="Close"
          style={{
            background: "none",
            border: "none",
            color: "#ccc",
            fontSize: 20,
            cursor: "pointer",
            padding: "0 2px",
            flexShrink: 0,
            lineHeight: 1,
            touchAction: "auto",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [apiReady, setApiReady] = useState(hasApiKey);
  const [navStack, setNavStack] = useState<NavState[]>(loadPersistedState);
  const [backgroundNavStack, setBackgroundNavStack] =
    useState<NavState[]>(loadBgState);
  const [activeVideo, setActiveVideo] = useState<{
    videoId: string;
    startTime: number;
  } | null>(() => {
    // Restore active video from session if nav stack has a watch page
    const stack = loadPersistedState();
    const top = stack[stack.length - 1];
    if (top.page === "watch" && top.watchId) {
      return { videoId: top.watchId, startTime: top.watchStartTime || 0 };
    }
    return null;
  });
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { canInstall, install } = usePwaInstall();
  // Track if we're mid-minimize-animation to avoid flicker

  const current = navStack[navStack.length - 1];
  const currentPage = current.page;
  const channelId = current.channelId ?? "";
  const searchQuery = current.searchQuery ?? "";

  const isWatchPage = currentPage === "watch";

  // Persist nav stack
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(navStack));
    } catch {}
  }, [navStack]);

  // Persist background nav stack
  useEffect(() => {
    try {
      sessionStorage.setItem(
        BG_SESSION_KEY,
        JSON.stringify(backgroundNavStack),
      );
    } catch {}
  }, [backgroundNavStack]);

  // Android back button
  useEffect(() => {
    window.history.pushState({ depth: 0 }, "");
    const handlePopState = () => {
      setNavStack((prev) => {
        if (prev.length > 1) {
          window.history.pushState({ depth: prev.length - 2 }, "");
          const next = prev.slice(0, -1);
          // If we're popping off a watch page, keep activeVideo (miniplayer remains)
          return next;
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

  const handleNavigate = useCallback((page: string) => {
    setNavStack([{ page: page as Page }]);
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      pushPage({ page: "search", searchQuery: query });
    },
    [pushPage],
  );

  const handleWatch = useCallback((id: string, resumeTime?: number) => {
    const st = resumeTime || 0;
    // Save current (non-watch) stack as background before going to watch
    setNavStack((prev) => {
      const isCurrentlyWatch = prev[prev.length - 1].page === "watch";
      if (!isCurrentlyWatch) {
        setBackgroundNavStack([...prev]);
      }
      return [...prev, { page: "watch", watchId: id, watchStartTime: st }];
    });
    setActiveVideo({ videoId: id, startTime: st });
    window.history.pushState({ depth: 1 }, "");
  }, []);

  const handleChannelClick = useCallback(
    (id: string, _title: string) => {
      pushPage({ page: "channel", channelId: id });
    },
    [pushPage],
  );

  const handleMinimize = useCallback(() => {
    setNavStack((prev) => {
      if (prev.length > 1) return prev.slice(0, -1);
      // If only watch page in stack, go back to background
      return backgroundNavStack.length > 0
        ? backgroundNavStack
        : [{ page: "home" }];
    });
  }, [backgroundNavStack]);

  const handleExpand = useCallback(() => {
    if (!activeVideo) return;
    setNavStack((prev) => {
      const top = prev[prev.length - 1];
      if (top.page === "watch") return prev;
      // Save current as background
      setBackgroundNavStack([...prev]);
      return [
        ...prev,
        {
          page: "watch",
          watchId: activeVideo.videoId,
          watchStartTime: activeVideo.startTime,
        },
      ];
    });
    window.history.pushState({ depth: 1 }, "");
  }, [activeVideo]);

  const handleClose = useCallback(() => {
    setActiveVideo(null);
    setNavStack((prev) => {
      const nonWatch = prev.filter((s) => s.page !== "watch");
      return nonWatch.length > 0 ? nonWatch : [{ page: "home" }];
    });
  }, []);

  if (!apiReady) {
    return (
      <>
        <SetupPage onSetup={() => setApiReady(true)} />
        <Toaster />
      </>
    );
  }

  // Render page behind the watch overlay (background page when watch is active)
  function renderBackgroundPage(state: NavState) {
    const { page, channelId: cId, searchQuery: sq } = state;
    if (page === "channel" && cId) {
      return (
        <ChannelPage
          channelId={cId}
          onWatch={handleWatch}
          onBack={() =>
            setNavStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))
          }
          onChannelClick={handleChannelClick}
        />
      );
    }
    if (page === "search") {
      return (
        <SearchPage
          query={sq || ""}
          onWatch={handleWatch}
          onChannelClick={handleChannelClick}
        />
      );
    }
    if (page === "settings") {
      return <SettingsPage onClearKey={() => setApiReady(false)} />;
    }
    if (page === "history") {
      return (
        <HistoryPage
          onWatch={handleWatch}
          onChannelClick={handleChannelClick}
        />
      );
    }
    if (page === "trending") {
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

  function renderPage() {
    if (currentPage === "watch") {
      // Render background page behind the overlay
      const bgState = backgroundNavStack[backgroundNavStack.length - 1] || {
        page: "home",
      };
      return renderBackgroundPage(bgState);
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

  // Bottom nav: show background page's page when watch is active
  const navPage = isWatchPage
    ? backgroundNavStack[backgroundNavStack.length - 1]?.page || "home"
    : currentPage;

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
          paddingBottom: isWatchPage
            ? 0
            : "calc(60px + env(safe-area-inset-bottom, 0px))",
          minHeight: "100vh",
        }}
      >
        {renderPage()}
      </main>

      {/* Full-screen WatchPage overlay — only visible when isWatchPage */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%) scale(0.95) translateZ(0); opacity: 0; }
          to   { transform: translateY(0) scale(1) translateZ(0); opacity: 1; }
        }
        .watch-page-enter { animation: slideUp 0.35s cubic-bezier(0.32,0.72,0,1) forwards; }
      `}</style>
      {activeVideo && (
        <div
          data-ocid="player.panel"
          key={activeVideo.videoId}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 400,
            display: isWatchPage ? "flex" : "none",
            flexDirection: "column",
            willChange: "transform",
            background: "#000",
          }}
          className={isWatchPage ? "watch-page-enter" : ""}
        >
          <div
            style={{
              position: "relative",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <WatchPage
              videoId={activeVideo.videoId}
              onWatch={handleWatch}
              onChannelClick={handleChannelClick}
              startTime={activeVideo.startTime}
              isMini={false}
              onMinimize={handleMinimize}
              onExpand={handleExpand}
              onClose={handleClose}
            />
          </div>
        </div>
      )}

      {/* Floating MiniPlayerCard — shown when video is active but not on watch page */}
      {activeVideo && !isWatchPage && (
        <MiniPlayerCard
          videoId={activeVideo.videoId}
          onExpand={handleExpand}
          onClose={handleClose}
        />
      )}

      <BottomNav currentPage={navPage} onNavigate={handleNavigate} />
      <Toaster />
    </div>
  );
}
