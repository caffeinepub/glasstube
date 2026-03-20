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

// Mini-player dimensions
const MINI_W = 260;
const MINI_H = Math.round((MINI_W * 9) / 16); // 146px — pure 16:9 video

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

export default function App() {
  const [apiReady, setApiReady] = useState(hasApiKey);
  const [navStack, setNavStack] = useState<NavState[]>(loadPersistedState);
  const [backgroundNavStack, setBackgroundNavStack] =
    useState<NavState[]>(loadBgState);
  const [activeVideo, setActiveVideo] = useState<{
    videoId: string;
    startTime: number;
  } | null>(() => {
    const stack = loadPersistedState();
    const top = stack[stack.length - 1];
    if (top.page === "watch" && top.watchId) {
      return { videoId: top.watchId, startTime: top.watchStartTime || 0 };
    }
    return null;
  });
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { canInstall, install } = usePwaInstall();

  // Mini-player drag state — use ref for position during drag, state only on end
  const [miniPos, setMiniPos] = useState(() => ({
    x: window.innerWidth - MINI_W - 10,
    y: window.innerHeight - MINI_H - 86,
  }));
  // isDragging as state so the container style re-renders to remove transition
  const [isDragging, setIsDragging] = useState(false);
  const [miniPlaying, setMiniPlaying] = useState(true);
  const miniRef = useRef<HTMLDivElement>(null);
  const miniControlsRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const miniDragging = useRef(false);
  const miniDragStart = useRef({ tx: 0, ty: 0, px: 0, py: 0 });
  const miniDragTotal = useRef(0);
  // Tracks when we're in the middle of an expand animation so we skip the
  // watch-enter slide-up (which conflicts with the clip-path expand transition)
  const expandingFromMiniRef = useRef(false);

  const current = navStack[navStack.length - 1];
  const currentPage = current.page;
  const channelId = current.channelId ?? "";
  const searchQuery = current.searchQuery ?? "";
  const isWatchPage = currentPage === "watch";
  const miniScale =
    MINI_W / (typeof window !== "undefined" ? window.innerWidth : 390);
  const watchId = current.watchId ?? "";

  // Persist nav stack
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(navStack));
    } catch {}
  }, [navStack]);

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
    setNavStack((prev) => {
      const isCurrentlyWatch = prev[prev.length - 1].page === "watch";
      if (!isCurrentlyWatch) {
        setBackgroundNavStack([...prev]);
      }
      return [...prev, { page: "watch", watchId: id, watchStartTime: st }];
    });
    setActiveVideo({ videoId: id, startTime: st });
    // Reset mini position to default bottom-right for the new video
    setMiniPos({
      x: window.innerWidth - MINI_W - 10,
      y: window.innerHeight - MINI_H - 86,
    });
    window.history.pushState({ depth: 1 }, "");
  }, []);

  const handleChannelClick = useCallback(
    (id: string, _title: string) => {
      pushPage({ page: "channel", channelId: id });
    },
    [pushPage],
  );

  // Minimize: just pop nav stack — do NOT change startTime or reload iframe
  const handleMinimize = useCallback(
    (_currentTime: number) => {
      setMiniPlaying(true);
      // Reset mini card position to bottom-right
      const newPos = {
        x: window.innerWidth - MINI_W - 10,
        y: window.innerHeight - MINI_H - 86,
      };
      setMiniPos(newPos);
      // Also immediately update the ref'd element position if it exists
      if (miniRef.current) {
        miniRef.current.style.left = `${newPos.x}px`;
        miniRef.current.style.top = `${newPos.y}px`;
      }
      setNavStack((prev) => {
        if (prev.length > 1) return prev.slice(0, -1);
        return backgroundNavStack.length > 0
          ? backgroundNavStack
          : [{ page: "home" }];
      });
    },
    [backgroundNavStack],
  );

  // Expand: push watch page back — use same startTime so iframe src doesn't change
  const handleExpand = useCallback(() => {
    // Mark that we're expanding from mini so the watch-enter animation is suppressed
    // (it conflicts with the clip-path expand transition and causes jank)
    expandingFromMiniRef.current = true;
    setTimeout(() => {
      expandingFromMiniRef.current = false;
    }, 300);
    if (!activeVideo) return;
    setNavStack((prev) => {
      const top = prev[prev.length - 1];
      if (top.page === "watch") return prev;
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

  // Mini-player drag handlers — DOM manipulation during drag, state update only on end
  const handleMiniTouchStart = useCallback(
    (e: React.TouchEvent) => {
      miniDragging.current = true;
      miniDragTotal.current = 0;
      miniDragStart.current = {
        tx: e.touches[0].clientX,
        ty: e.touches[0].clientY,
        px: miniPos.x,
        py: miniPos.y,
      };
      setIsDragging(true);
    },
    [miniPos],
  );

  const handleMiniTouchMove = useCallback((e: React.TouchEvent) => {
    if (!miniDragging.current) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - miniDragStart.current.tx;
    const dy = e.touches[0].clientY - miniDragStart.current.ty;
    miniDragTotal.current = Math.sqrt(dx * dx + dy * dy);
    const newX = Math.max(
      0,
      Math.min(window.innerWidth - MINI_W, miniDragStart.current.px + dx),
    );
    const newY = Math.max(
      0,
      Math.min(window.innerHeight - MINI_H - 60, miniDragStart.current.py + dy),
    );
    const scale = MINI_W / window.innerWidth;
    const iw = window.innerWidth;
    const ih = window.innerHeight;
    // Direct DOM manipulation — zero React re-render overhead
    if (miniRef.current) {
      miniRef.current.style.left = `${newX}px`;
      miniRef.current.style.top = `${newY}px`;
    }
    if (miniControlsRef.current) {
      miniControlsRef.current.style.left = `${newX}px`;
      miniControlsRef.current.style.top = `${newY + MINI_H - 48}px`;
    }
    if (innerRef.current) {
      innerRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0) scale(${scale})`;
    }
    const outerDiv = innerRef.current?.parentElement;
    if (outerDiv) {
      outerDiv.style.clipPath = `inset(${newY}px ${Math.max(0, iw - newX - MINI_W)}px ${Math.max(0, ih - newY - MINI_H)}px ${newX}px round 16px)`;
    }
  }, []);

  const handleMiniTouchEnd = useCallback(() => {
    miniDragging.current = false;
    setIsDragging(false);
    // Sync state with current DOM position so next render is correct
    if (miniRef.current) {
      const left =
        Number.parseFloat(miniRef.current.style.left) ||
        miniDragStart.current.px;
      const top =
        Number.parseFloat(miniRef.current.style.top) ||
        miniDragStart.current.py;
      setMiniPos({ x: left, y: top });
    }
  }, []);

  const handleMiniTap = useCallback(() => {
    if (miniDragTotal.current < 8) {
      handleExpand();
    }
  }, [handleExpand]);

  if (!apiReady) {
    return (
      <>
        <SetupPage onSetup={() => setApiReady(true)} />
        <Toaster />
      </>
    );
  }

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

  const navPage = isWatchPage
    ? backgroundNavStack[backgroundNavStack.length - 1]?.page || "home"
    : currentPage;

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(180deg, #000000 0%, #0d0305 100%)",
        backgroundAttachment: "fixed",
        overscrollBehavior: "none",
      }}
    >
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

      {/* Persistent WatchPage overlay — animates between full-screen and mini-card.
          NEVER unmounts when activeVideo exists (same videoId) — this keeps the
          iframe alive and playing with zero restart or buffering. */}
      <style>{`
        html, body { overscroll-behavior: none; }
        @keyframes slideUp {
          from { transform: translateY(100%) scale(0.95) translateZ(0); opacity: 0; }
          to   { transform: translateY(0) scale(1) translateZ(0); opacity: 1; }
        }
        .watch-enter { animation: slideUp 0.22s ease-out forwards; }
      `}</style>

      {activeVideo && (
        <>
          {/* OUTER: always fixed full-screen. clip-path transitions the visible area.
              Uses translateZ(0) to force its own GPU compositing layer.
              contain: layout style reduces repaint area during animation. */}
          <div
            data-ocid="player.panel"
            className={
              isWatchPage && !expandingFromMiniRef.current ? "watch-enter" : ""
            }
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              zIndex: 400,
              pointerEvents: isWatchPage ? "auto" : "none",
              clipPath: isWatchPage
                ? "inset(0px 0px 0px 0px round 0px)"
                : `inset(${miniPos.y}px ${Math.max(0, window.innerWidth - miniPos.x - MINI_W)}px ${Math.max(0, window.innerHeight - miniPos.y - MINI_H)}px ${miniPos.x}px round 16px)`,
              transition: isDragging ? "none" : "clip-path 0.18s ease-out",
              willChange: "clip-path",
              transform: "translateZ(0)",
              contain: "layout style",
            }}
          >
            {/* INNER: full-screen size always, transform scales+moves content to mini */}
            <div
              ref={innerRef}
              key={activeVideo.videoId}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "#000",
                transformOrigin: "top left",
                transform: isWatchPage
                  ? "translate3d(0,0,0) scale(1)"
                  : `translate3d(${miniPos.x}px, ${miniPos.y}px, 0) scale(${miniScale})`,
                transition: isDragging ? "none" : "transform 0.18s ease-out",
                willChange: "transform",
                overflow: "hidden",
                ...(isWatchPage
                  ? {
                      borderRadius: 0,
                      boxShadow: "none",
                      border: "none",
                    }
                  : {
                      borderRadius: `${16 / miniScale}px`,
                      border: `${1 / miniScale}px solid rgba(255,255,255,0.14)`,
                      boxShadow: `0 ${12 / miniScale}px ${40 / miniScale}px rgba(0,0,0,0.8)`,
                    }),
              }}
            >
              <WatchPage
                videoId={watchId || activeVideo.videoId}
                startTime={current.watchStartTime ?? activeVideo.startTime}
                isMini={!isWatchPage}
                onWatch={handleWatch}
                onChannelClick={handleChannelClick}
                onMinimize={handleMinimize}
                onExpand={handleExpand}
                onClose={handleClose}
              />
            </div>
          </div>

          {/* MINI OVERLAY: transparent interaction layer for drag/tap when in mini mode */}
          {!isWatchPage && (
            <div
              ref={miniRef}
              style={{
                position: "fixed",
                top: miniPos.y,
                left: miniPos.x,
                width: MINI_W,
                height: MINI_H,
                zIndex: 401,
                background: "transparent",
                cursor: isDragging ? "grabbing" : "grab",
                touchAction: "none",
                borderRadius: 16,
              }}
              onTouchStart={handleMiniTouchStart}
              onTouchMove={handleMiniTouchMove}
              onTouchEnd={handleMiniTouchEnd}
              onClick={handleMiniTap}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleMiniTap();
              }}
              role="button"
              tabIndex={0}
              aria-label="Expand player"
            />
          )}

          {/* Mini controls rendered in App — above drag overlay so clicks reach them */}
          {!isWatchPage && activeVideo && (
            <div
              ref={miniControlsRef}
              style={{
                position: "fixed",
                left: miniPos.x,
                top: miniPos.y + MINI_H - 48,
                width: MINI_W,
                height: 48,
                zIndex: 402,
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.88), transparent)",
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 10px",
                pointerEvents: "auto",
                gap: 6,
              }}
            >
              {/* Play/Pause */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const iframe = document.querySelector(
                    '[data-ocid="player.panel"] iframe',
                  ) as HTMLIFrameElement;
                  if (iframe?.contentWindow) {
                    if (miniPlaying) {
                      iframe.contentWindow.postMessage(
                        JSON.stringify({
                          event: "command",
                          func: "pauseVideo",
                          args: "",
                        }),
                        "*",
                      );
                      setMiniPlaying(false);
                    } else {
                      iframe.contentWindow.postMessage(
                        JSON.stringify({
                          event: "command",
                          func: "playVideo",
                          args: "",
                        }),
                        "*",
                      );
                      setMiniPlaying(true);
                    }
                  }
                }}
                aria-label={miniPlaying ? "Pause" : "Play"}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {miniPlaying ? (
                  <svg
                    aria-hidden="true"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="white"
                  >
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg
                    aria-hidden="true"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="white"
                  >
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                )}
              </button>

              {/* Spacer */}
              <span style={{ flex: 1 }} />

              {/* Expand */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExpand();
                }}
                aria-label="Expand"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <svg
                  aria-hidden="true"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                >
                  <polyline points="15,3 21,3 21,9" />
                  <polyline points="9,21 3,21 3,15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                aria-label="Close"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <svg
                  aria-hidden="true"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}

      <BottomNav currentPage={navPage as Page} onNavigate={handleNavigate} />
      <Toaster />
    </div>
  );
}
