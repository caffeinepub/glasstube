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

// SVG Icons for miniplayer controls
const IconPlay = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M8 5v14l11-7z" />
  </svg>
);

const IconPause = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const IconClose = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

const IconExpand = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
  </svg>
);

// Floating draggable mini player card
function MiniPlayerCard({
  videoId,
  startTime,
  onExpand,
  onClose,
}: {
  videoId: string;
  startTime: number;
  onExpand: () => void;
  onClose: () => void;
}) {
  const MINI_W = window.innerWidth < 400 ? 200 : 260;
  const VIDEO_H = Math.round((MINI_W * 9) / 16);
  const CONTROLS_H = 40;
  const MINI_H = VIDEO_H + CONTROLS_H;

  // Default position: bottom-right above nav bar
  const [pos, setPos] = useState({
    x: window.innerWidth - MINI_W - 10,
    y: window.innerHeight - MINI_H - 86,
  });
  const [isPlaying, setIsPlaying] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const miniIframeRef = useRef<HTMLIFrameElement>(null);
  const dragging = useRef(false);
  const startTouch = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const totalDrag = useRef(0);
  const seekDoneRef = useRef(false);

  // Listen for YouTube API messages to seek on ready
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        // YouTube fires onReady when the player is ready
        if (data?.event === "onReady" && !seekDoneRef.current) {
          seekDoneRef.current = true;
          if (startTime > 0) {
            // Seek to the correct position immediately
            miniIframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({
                event: "command",
                func: "seekTo",
                args: [startTime, true],
              }),
              "*",
            );
            // Then ensure it plays
            setTimeout(() => {
              miniIframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({
                  event: "command",
                  func: "playVideo",
                  args: "",
                }),
                "*",
              );
            }, 150);
          }
          setPlayerReady(true);
        }
        // Track play/pause state from API
        if (data?.event === "onStateChange") {
          if (data.info === 1) setIsPlaying(true); // playing
          if (data.info === 2) setIsPlaying(false); // paused
        }
      } catch {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [startTime]);

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

  const sendIframeCommand = (func: string, args?: unknown) => {
    miniIframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args: args ?? "" }),
      "*",
    );
  };

  const handlePlayPause = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      sendIframeCommand("pauseVideo");
      setIsPlaying(false);
    } else {
      sendIframeCommand("playVideo");
      setIsPlaying(true);
    }
  };

  const handleClose = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setExiting(true);
    setTimeout(() => onClose(), 280);
  };

  const handleExpand = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    onExpand();
  };

  // Use &start= as a hint; seekTo on onReady handles the precise seek
  const iframeSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&mute=0&playsinline=1${startTime > 0 ? `&start=${Math.floor(startTime)}` : ""}&origin=${encodeURIComponent(window.location.origin)}`;

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
        zIndex: 500,
        borderRadius: 18,
        overflow: "hidden",
        touchAction: "none",
        willChange: "transform",
        transform: "translateZ(0)",
        animation: exiting
          ? "miniOut 0.28s cubic-bezier(0.32,0.72,0,1) forwards"
          : "miniIn 0.32s cubic-bezier(0.32,0.72,0,1)",
        userSelect: "none",
        WebkitUserSelect: "none",
        // Glass card
        background: "rgba(12,12,12,0.75)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow:
          "0 12px 40px rgba(0,0,0,0.75), 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <style>{`
        @keyframes miniIn {
          from { transform: scale(0.82) translateY(28px) translateZ(0); opacity: 0; }
          to   { transform: scale(1) translateY(0) translateZ(0); opacity: 1; }
        }
        @keyframes miniOut {
          from { transform: scale(1) translateY(0) translateZ(0); opacity: 1; }
          to   { transform: scale(0.82) translateY(28px) translateZ(0); opacity: 0; }
        }
        .mini-ctrl-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          touch-action: auto;
          -webkit-tap-highlight-color: transparent;
        }
        .mini-ctrl-btn:active {
          transform: scale(0.88);
        }
      `}</style>

      {/* Video iframe area — tap to expand */}
      <button
        type="button"
        onClick={handleTap}
        style={{
          width: "100%",
          height: VIDEO_H,
          display: "block",
          position: "relative",
          cursor: "pointer",
          background: "#000",
          border: "none",
          padding: 0,
          flexShrink: 0,
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
        {/* Loading overlay — hide once player ready */}
        {!playerReady && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                border: "2.5px solid rgba(255,255,255,0.15)",
                borderTopColor: "rgba(255,255,255,0.8)",
                borderRadius: "50%",
                animation: "miniSpin 0.7s linear infinite",
              }}
            />
            <style>
              {"@keyframes miniSpin { to { transform: rotate(360deg); } }"}
            </style>
          </div>
        )}
      </button>

      {/* Glass controls bar */}
      <div
        style={{
          height: CONTROLS_H,
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          gap: 4,
          background: "rgba(255,255,255,0.06)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Play/Pause */}
        <button
          type="button"
          className="mini-ctrl-btn"
          onClick={handlePlayPause}
          data-ocid="miniplayer.toggle"
          aria-label={isPlaying ? "Pause" : "Play"}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "rgba(255,255,255,0.12)",
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {isPlaying ? <IconPause /> : <IconPlay />}
        </button>

        {/* Now Playing label */}
        <span
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: 10,
            fontWeight: 500,
            flex: 1,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            letterSpacing: "0.02em",
            paddingLeft: 4,
          }}
        >
          Now Playing
        </span>

        {/* Expand button */}
        <button
          type="button"
          className="mini-ctrl-btn"
          onClick={handleExpand}
          data-ocid="miniplayer.expand_button"
          aria-label="Expand"
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.75)",
            flexShrink: 0,
          }}
        >
          <IconExpand />
        </button>

        {/* Close */}
        <button
          type="button"
          className="mini-ctrl-btn"
          onClick={handleClose}
          data-ocid="miniplayer.close_button"
          aria-label="Close"
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "rgba(255,80,80,0.18)",
            color: "rgba(255,255,255,0.85)",
            flexShrink: 0,
          }}
        >
          <IconClose />
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

  const handleMinimize = useCallback(
    (currentTime: number) => {
      setActiveVideo((prev) =>
        prev ? { ...prev, startTime: currentTime } : null,
      );
      setNavStack((prev) => {
        if (prev.length > 1) return prev.slice(0, -1);
        // If only watch page in stack, go back to background
        return backgroundNavStack.length > 0
          ? backgroundNavStack
          : [{ page: "home" }];
      });
    },
    [backgroundNavStack],
  );

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
              isVisible={isWatchPage}
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
          key={`${activeVideo.videoId}-${activeVideo.startTime}`}
          videoId={activeVideo.videoId}
          startTime={activeVideo.startTime}
          onExpand={handleExpand}
          onClose={handleClose}
        />
      )}

      <BottomNav currentPage={navPage} onNavigate={handleNavigate} />
      <Toaster />
    </div>
  );
}
