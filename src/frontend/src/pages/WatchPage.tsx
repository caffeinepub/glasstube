import { formatLikes, formatViews, timeAgo } from "@/lib/format";
import {
  type HistoryEntry,
  getHistory,
  saveToHistory,
  updateResumeTime,
} from "@/lib/history";
import {
  type YouTubeComment,
  type YouTubeSearchResult,
  type YouTubeVideo,
  fetchInterestVideos,
  fetchVideoComments,
  fetchVideoDetails,
  getApiKey,
  getYtThumbnail,
} from "@/lib/youtube";
import { useEffect, useRef, useState } from "react";

interface WatchPageProps {
  videoId: string;
  onWatch: (id: string, resumeTime?: number) => void;
  onChannelClick?: (channelId: string, channelTitle: string) => void;
  startTime?: number;
  isMini?: boolean;
  onMinimize?: () => void;
  onExpand?: () => void;
  onClose?: () => void;
}

const AVATAR_COLORS = [
  "#ff0000",
  "#ff5722",
  "#e91e63",
  "#9c27b0",
  "#3f51b5",
  "#2196f3",
  "#009688",
  "#4caf50",
];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function useAmbientMode(
  videoId: string,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";

    function paintAmbient(image: HTMLImageElement) {
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;

      const offscreen = document.createElement("canvas");
      offscreen.width = 16;
      offscreen.height = 9;
      const oc = offscreen.getContext("2d");
      if (!oc) return;
      oc.drawImage(image, 0, 0, 16, 9);

      const regions = [
        { x: 1, y: 1 },
        { x: 8, y: 1 },
        { x: 14, y: 1 },
        { x: 1, y: 5 },
        { x: 14, y: 5 },
      ];
      const colors = regions.map((r) => {
        const d = oc.getImageData(r.x, r.y, 1, 1).data;
        return `rgba(${d[0]},${d[1]},${d[2]},0.9)`;
      });

      ctx.clearRect(0, 0, w, h);

      const positions = [
        { cx: 0.15, cy: 0.3 },
        { cx: 0.5, cy: 0.1 },
        { cx: 0.85, cy: 0.3 },
        { cx: 0.2, cy: 0.8 },
        { cx: 0.8, cy: 0.8 },
      ];

      for (let i = 0; i < colors.length; i++) {
        const pos = positions[i];
        const grad = ctx.createRadialGradient(
          pos.cx * w,
          pos.cy * h,
          0,
          pos.cx * w,
          pos.cy * h,
          w * 0.6,
        );
        grad.addColorStop(0, colors[i]);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }
    }

    function tryLoad(url: string, fallback?: string) {
      img.onload = () => paintAmbient(img);
      img.onerror = () => {
        if (fallback) {
          img.src = fallback;
          img.onerror = null;
        }
      };
      img.src = url;
    }

    tryLoad(
      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    );
  }, [videoId, canvasRef]);
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const PAGE_SIZE = 10;

export function WatchPage({
  videoId,
  onWatch,
  onChannelClick,
  startTime = 0,
  isMini = false,
  onMinimize,
  onExpand: _onExpand,
  onClose: _onClose,
}: WatchPageProps) {
  const [video, setVideo] = useState<YouTubeVideo | null>(null);
  const [allRelated, setAllRelated] = useState<YouTubeSearchResult[]>([]);
  const [relatedPage, setRelatedPage] = useState(1);
  const [allComments, setAllComments] = useState<YouTubeComment[]>([]);
  const [commentsPage, setCommentsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [channelSubscriberCount, setChannelSubscriberCount] = useState<
    string | null
  >(null);
  const [playerHovered, setPlayerHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fsAnimating, setFsAnimating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerCardRef = useRef<HTMLDivElement>(null);
  const playerWrapRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const currentResumeRef = useRef<number>(startTime);
  const isPlayingRef = useRef<boolean>(false);
  const dragStartY = useRef(0);
  const hasScrolledRef = useRef(false);

  useAmbientMode(videoId, ambientCanvasRef);

  // Scroll-past-video miniplayer trigger
  useEffect(() => {
    const onScroll = () => {
      hasScrolledRef.current = true;
    };
    window.addEventListener("scroll", onScroll, { once: true, passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const card = playerCardRef.current;
    if (!card || !onMinimize) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && hasScrolledRef.current) {
          onMinimize?.();
        }
      },
      { threshold: 0 },
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, [onMinimize]);

  // Derived slices
  const related = allRelated.slice(0, relatedPage * PAGE_SIZE);
  const hasMoreRelated = allRelated.length > relatedPage * PAGE_SIZE;
  const comments = allComments.slice(0, commentsPage * PAGE_SIZE);
  const hasMoreComments = allComments.length > commentsPage * PAGE_SIZE;

  // Fullscreen state + smooth animation
  useEffect(() => {
    const handleFsChange = () => {
      const entering = !!document.fullscreenElement;
      setFsAnimating(true);
      setIsFullscreen(entering);
      setTimeout(() => setFsAnimating(false), 400);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  // Resume time tracking
  useEffect(() => {
    startTimeRef.current = Date.now();
    currentResumeRef.current = startTime;

    const interval = setInterval(() => {
      if (isPlayingRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const estimated = startTime + elapsed;
        currentResumeRef.current = estimated;
        updateResumeTime(videoId, estimated);
      }
    }, 5000);

    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "onStateChange") {
          if (data.info === 1) {
            isPlayingRef.current = true;
            startTimeRef.current =
              Date.now() - (currentResumeRef.current - startTime) * 1000;
          } else if (data.info === 2 || data.info === 0) {
            isPlayingRef.current = false;
          }
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      clearInterval(interval);
      window.removeEventListener("message", handleMessage);
      updateResumeTime(videoId, currentResumeRef.current);
    };
  }, [videoId, startTime]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRelatedLoading(true);
    setError(null);
    setVideo(null);
    setAllRelated([]);
    setRelatedPage(1);
    setAllComments([]);
    setCommentsPage(1);
    setCommentsOpen(false);
    setDescExpanded(false);
    setSubscribed(false);

    async function loadAll() {
      try {
        const data = await fetchVideoDetails(videoId);
        if (cancelled) return;
        setVideo(data);
        setLoading(false);

        // Fetch real subscriber count
        if (data?.channelId) {
          fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${data.channelId}&key=${getApiKey()}`,
          )
            .then((r) => r.json())
            .then((json) => {
              const count = json.items?.[0]?.statistics?.subscriberCount;
              if (count && !cancelled) {
                const n = Number.parseInt(count, 10);
                let formatted = "";
                if (n >= 1_000_000)
                  formatted = `${(n / 1_000_000).toFixed(1)}M subscribers`;
                else if (n >= 1_000)
                  formatted = `${(n / 1_000).toFixed(0)}K subscribers`;
                else formatted = `${n} subscribers`;
                setChannelSubscriberCount(formatted);
              }
            })
            .catch(() => {});
        }

        if (data) {
          const existing = getHistory().find(
            (e: HistoryEntry) => e.id === data.id,
          );
          saveToHistory({
            id: data.id,
            title: data.title,
            channelTitle: data.channelTitle,
            channelId: data.channelId,
            channelThumbnail: data.channelThumbnail,
            thumbnail: data.thumbnail,
            publishedAt: data.publishedAt,
            duration: data.duration,
            resumeTime: existing?.resumeTime ?? startTime,
          });
        }

        // Build recommendations from watch history (same as home feed)
        const history = getHistory();
        const historyTitles = history.map((h: HistoryEntry) => h.title);
        const historyCategoryIds: string[] = [];
        if (data?.categoryId) historyCategoryIds.push(data.categoryId);

        fetchInterestVideos(historyTitles, historyCategoryIds)
          .then((rel) => {
            if (!cancelled) {
              // Exclude current video
              const filtered = rel.filter((v) => v.id !== videoId);
              setAllRelated(filtered);
              setRelatedLoading(false);
            }
          })
          .catch(() => {
            if (!cancelled) setRelatedLoading(false);
          });
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
          setRelatedLoading(false);
        }
      }
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [videoId, startTime]);

  // Load comments when section is opened
  async function handleToggleComments() {
    const willOpen = !commentsOpen;
    setCommentsOpen(willOpen);
    if (willOpen && allComments.length === 0 && !commentsLoading) {
      setCommentsLoading(true);
      const result = await fetchVideoComments(videoId);
      setAllComments(result);
      setCommentsLoading(false);
    }
  }

  async function handleFullscreen() {
    const el = playerCardRef.current as
      | (HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void>;
          mozRequestFullScreen?: () => Promise<void>;
        })
      | null;
    if (!el) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        if (
          screen.orientation &&
          (screen.orientation as ScreenOrientation & { unlock?: () => void })
            .unlock
        ) {
          (screen.orientation as ScreenOrientation & { unlock?: () => void })
            .unlock!();
        }
      } else {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        } else if (el.mozRequestFullScreen) {
          await el.mozRequestFullScreen();
        }
        if (
          (
            screen.orientation as ScreenOrientation & {
              lock?: (o: string) => Promise<void>;
            }
          )?.lock
        ) {
          try {
            await (
              screen.orientation as ScreenOrientation & {
                lock?: (o: string) => Promise<void>;
              }
            ).lock!("landscape");
          } catch {
            // Some browsers don't support lock; ignore
          }
        }
      }
    } catch {
      // Ignore fullscreen errors
    }
  }

  async function handleCopyLink() {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }

  // Swipe-down to minimize gesture (whole page)
  const swipeDragX = useRef(0);
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const swipeAnimating = useRef(false);

  const handleSwipeTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    swipeDragX.current = e.touches[0].clientX;
    swipeAnimating.current = false;
    if (swipeContainerRef.current) {
      swipeContainerRef.current.style.transition = "none";
    }
  };

  const handleSwipeTouchMove = (e: React.TouchEvent) => {
    const el = swipeContainerRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop || 0;
    const deltaY = e.touches[0].clientY - dragStartY.current;
    const deltaX = Math.abs(e.touches[0].clientX - swipeDragX.current);
    // Only intercept downward swipes at top of scroll and more vertical than horizontal
    if (deltaY > 0 && scrollTop <= 0 && deltaY > deltaX) {
      const translateY = Math.min(deltaY * 0.4, 80);
      el.style.transform = `translateY(${translateY}px) translateZ(0)`;
    }
  };

  const handleSwipeTouchEnd = (e: React.TouchEvent) => {
    const el = swipeContainerRef.current;
    if (!el) return;
    const deltaY = e.changedTouches[0].clientY - dragStartY.current;
    if (deltaY > 80) {
      onMinimize?.();
      el.style.transition = "none";
      el.style.transform = "translateZ(0)";
    } else {
      el.style.transition = "transform 0.3s cubic-bezier(0.32,0.72,0,1)";
      el.style.transform = "translateY(0) translateZ(0)";
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center" data-ocid="video.error_state">
        <p style={{ color: "#ff5555" }}>{error}</p>
      </div>
    );
  }

  const avatarColor = video ? getAvatarColor(video.channelTitle) : "#ff0000";

  const iframeSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1&enablejsapi=1${startTime > 0 ? `&start=${startTime}` : ""}`;

  return (
    <div
      ref={swipeContainerRef}
      className="animate-fade-in"
      onTouchStart={handleSwipeTouchStart}
      onTouchMove={handleSwipeTouchMove}
      onTouchEnd={handleSwipeTouchEnd}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "visible",
        position: "relative",
        willChange: "transform",
        transform: "translateZ(0)",
      }}
    >
      <div style={{ flexShrink: 0 }}>
        {/* Fullscreen transition overlay */}
        <style>{`
        @keyframes fs-enter {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fs-exit {
          from { opacity: 0; transform: scale(1.04); }
          to   { opacity: 1; transform: scale(1); }
        }
        .fs-animating-enter { animation: fs-enter 0.38s cubic-bezier(0.22,1,0.36,1) forwards; }
        .fs-animating-exit  { animation: fs-exit  0.38s cubic-bezier(0.22,1,0.36,1) forwards; }
        #player-card-inner:-webkit-full-screen { background: transparent; }
        #player-card-inner:fullscreen { background: transparent; }
      `}</style>

        {/* Outer ambient + player wrapper */}
        <div
          ref={playerWrapRef}
          className={
            fsAnimating
              ? isFullscreen
                ? "fs-animating-enter"
                : "fs-animating-exit"
              : ""
          }
          style={{
            position: "relative",
            padding: "12px 12px 0",
            paddingTop: isMini ? 0 : 12,
            transition: "padding 0.38s cubic-bezier(0.22,1,0.36,1)",
            willChange: "transform, opacity",
          }}
        >
          {/* Ambient canvas */}
          <canvas
            ref={ambientCanvasRef}
            width={640}
            height={360}
            style={{
              position: "absolute",
              top: -60,
              left: "-10%",
              width: "120%",
              height: "calc(100% + 120px)",
              filter: "blur(80px)",
              opacity: isMini ? 0 : 0.65,
              zIndex: 0,
              pointerEvents: "none",
              willChange: "opacity",
              transform: "translateZ(0)",
              transition: "opacity 0.3s ease",
            }}
          />

          {/* 3D card player */}
          <div
            onMouseEnter={() => setPlayerHovered(true)}
            onMouseLeave={() => setPlayerHovered(false)}
            style={{
              position: "relative",
              zIndex: 1,
              perspective: "1000px",
            }}
          >
            <div
              ref={playerCardRef}
              id="player-card-inner"
              style={{
                borderRadius: isMini ? 0 : 12,
                overflow: "hidden",
                border: isMini ? "none" : "1px solid rgba(255,255,255,0.12)",
                boxShadow: playerHovered
                  ? "0 24px 60px rgba(0,0,0,0.9), 0 8px 24px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)"
                  : "0 16px 40px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
                transform: playerHovered
                  ? "rotateX(2deg) translateY(-2px) scale(1.005)"
                  : "rotateX(0deg) translateY(0) scale(1)",
                transformStyle: "preserve-3d",
                transition:
                  "transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 0.35s cubic-bezier(0.25,0.46,0.45,0.94)",
                willChange: "transform, box-shadow",
                aspectRatio: "16/9",
                background: "#000",
                position: "relative",
              }}
            >
              {/* Reflective top-edge highlight */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), rgba(255,255,255,0.08), transparent)",
                  zIndex: 10,
                  pointerEvents: "none",
                }}
              />

              {/* iframe */}
              <iframe
                ref={iframeRef}
                src={iframeSrc}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; autoplay"
                allowFullScreen
                className="w-full h-full"
                style={{ position: "relative", zIndex: 1 }}
                title="YouTube video player"
              />

              {/* Miniplayer button overlay */}
              {!isMini && onMinimize && (
                <button
                  type="button"
                  onClick={onMinimize}
                  aria-label="Miniplayer"
                  data-ocid="player.miniplayer.button"
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    zIndex: 20,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    border: "1px solid rgba(255,255,255,0.22)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    letterSpacing: "0.03em",
                  }}
                >
                  ⊟ Mini
                </button>
              )}

              {/* Fullscreen button overlay */}
              {!isMini && (
                <button
                  type="button"
                  onClick={handleFullscreen}
                  aria-label="Fullscreen"
                  data-ocid="player.fullscreen.button"
                  style={{
                    position: "absolute",
                    bottom: 8,
                    right: 8,
                    zIndex: 20,
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "background 0.2s ease, transform 0.2s ease",
                  }}
                >
                  {isFullscreen ? (
                    <svg
                      aria-hidden="true"
                      width="14"
                      height="14"
                      fill="#ffffff"
                      viewBox="0 0 24 24"
                    >
                      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                    </svg>
                  ) : (
                    <svg
                      aria-hidden="true"
                      width="14"
                      height="14"
                      fill="#ffffff"
                      viewBox="0 0 24 24"
                    >
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* end fixed player section */}

      {/* Scrollable content — hidden when mini */}
      <div
        style={{
          flex: 1,
          overflowY: isMini ? "hidden" : "auto",
          WebkitOverflowScrolling: "touch",
          opacity: isMini ? 0 : 1,
          transition: "opacity 0.25s ease",
          pointerEvents: isMini ? "none" : "auto",
        }}
      >
        {/* Video info */}
        <div
          className="px-3 pt-0"
          style={{ position: "relative", zIndex: 1, marginTop: -4 }}
        >
          {loading ? (
            <div className="space-y-3" data-ocid="video.loading_state">
              <div
                className="yt-skeleton h-6 w-4/5"
                style={{ borderRadius: 4 }}
              />
              <div
                className="yt-skeleton h-4 w-1/2"
                style={{ borderRadius: 4 }}
              />
            </div>
          ) : video ? (
            <>
              {/* Clickable title toggles description */}
              <button
                type="button"
                className="w-full text-left flex items-start gap-2"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  marginBottom: 4,
                  marginTop: 20,
                }}
                onClick={() => setDescExpanded((d) => !d)}
                data-ocid="player.description.toggle"
              >
                <h1
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: "#f1f1f1",
                    lineHeight: "24px",
                    flex: 1,
                  }}
                >
                  {video.title}
                </h1>
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  fill="#888"
                  viewBox="0 0 24 24"
                  style={{
                    flexShrink: 0,
                    marginTop: 3,
                    transition:
                      "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)",
                    transform: descExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    willChange: "transform",
                  }}
                >
                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                </svg>
              </button>

              {/* Description */}
              {descExpanded && (
                <div
                  className="mb-4 animate-fade-in"
                  style={{
                    background: "#0d0d0d",
                    borderRadius: 12,
                    padding: "12px",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                  data-ocid="player.description.panel"
                >
                  <p
                    style={{ fontSize: 13, color: "#717171", marginBottom: 8 }}
                  >
                    {formatViews(video.viewCount)} views &bull;{" "}
                    {timeAgo(video.publishedAt)}
                  </p>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#f1f1f1",
                      lineHeight: "20px",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {video.description || "No description available."}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDescExpanded(false)}
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#f1f1f1",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Show less
                  </button>
                </div>
              )}

              {/* Channel row */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  className="flex items-center gap-3"
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: onChannelClick ? "pointer" : "default",
                  }}
                  onClick={() =>
                    onChannelClick &&
                    video &&
                    onChannelClick(video.channelId, video.channelTitle)
                  }
                  data-ocid="player.channel.button"
                >
                  {video.channelThumbnail ? (
                    <img
                      src={video.channelThumbnail}
                      alt={video.channelTitle}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "1px solid rgba(255,255,255,0.1)",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: avatarColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {video.channelTitle[0]?.toUpperCase()}
                    </div>
                  )}
                  <div style={{ textAlign: "left" }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#f1f1f1",
                        lineHeight: 1.3,
                      }}
                    >
                      {video.channelTitle}
                    </div>
                    {channelSubscriberCount && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#717171",
                          marginTop: 1,
                          textAlign: "left",
                        }}
                      >
                        {channelSubscriberCount}
                      </div>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSubscribed((s) => !s)}
                  data-ocid="player.subscribe.toggle"
                  style={{
                    background: subscribed
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(255,0,0,0.85)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 20,
                    padding: "7px 16px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "background 0.2s ease",
                    flexShrink: 0,
                  }}
                >
                  {subscribed ? "Subscribed" : "Subscribe"}
                </button>
              </div>

              {/* Action buttons */}
              <div
                className="pb-3"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  width: "100%",
                }}
              >
                {/* Likes */}
                <div
                  className="flex items-center gap-1"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    padding: "7px 4px",
                    background: "#1a1a1a",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#f1f1f1",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  <svg
                    aria-hidden="true"
                    width="13"
                    height="13"
                    fill="#f1f1f1"
                    viewBox="0 0 24 24"
                  >
                    <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
                  </svg>
                  <span
                    style={{ overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {formatLikes(video.likeCount)}
                  </span>
                </div>

                {/* Duration */}
                <div
                  className="flex items-center gap-1"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    padding: "7px 4px",
                    background: "#1a1a1a",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#f1f1f1",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  <svg
                    aria-hidden="true"
                    width="13"
                    height="13"
                    fill="#f1f1f1"
                    viewBox="0 0 24 24"
                  >
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
                  </svg>
                  <span
                    style={{ overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {video.duration || "--:--"}
                  </span>
                </div>

                {/* Date */}
                <div
                  className="flex items-center gap-1"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    padding: "7px 4px",
                    background: "#1a1a1a",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#f1f1f1",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontSize: 11,
                    }}
                  >
                    {formatDate(video.publishedAt)}
                  </span>
                </div>

                {/* Copy Link */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    padding: "7px 4px",
                    background: copySuccess ? "#1a3a1a" : "#1a1a1a",
                    borderRadius: 20,
                    border: `1px solid ${copySuccess ? "rgba(0,200,0,0.3)" : "rgba(255,255,255,0.08)"}`,
                    fontSize: 11,
                    fontWeight: 500,
                    color: copySuccess ? "#4caf50" : "#f1f1f1",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                    transition:
                      "background 0.2s ease, color 0.2s ease, border-color 0.2s ease",
                  }}
                  data-ocid="player.secondary_button"
                  aria-label="Copy video link"
                >
                  {copySuccess ? (
                    <svg
                      aria-hidden="true"
                      width="12"
                      height="12"
                      fill="#4caf50"
                      viewBox="0 0 24 24"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  ) : (
                    <svg
                      aria-hidden="true"
                      width="12"
                      height="12"
                      fill="#f1f1f1"
                      viewBox="0 0 24 24"
                    >
                      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                    </svg>
                  )}
                  <span
                    style={{ overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {copySuccess ? "Copied!" : "Copy Link"}
                  </span>
                </button>
              </div>
            </>
          ) : null}
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.06)",
            margin: "0 12px",
          }}
        />

        {/* Comments section (collapsible) */}
        <div data-ocid="comments.panel">
          <button
            type="button"
            className="w-full flex items-center justify-between"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "10px 12px 8px",
            }}
            onClick={handleToggleComments}
            data-ocid="comments.toggle"
          >
            <div className="flex items-center gap-2">
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                fill="#f1f1f1"
                viewBox="0 0 24 24"
              >
                <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#f1f1f1" }}>
                Comments
              </span>
            </div>
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              fill="#888"
              viewBox="0 0 24 24"
              style={{
                transition: "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)",
                transform: commentsOpen ? "rotate(180deg)" : "rotate(0deg)",
                willChange: "transform",
              }}
            >
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
            </svg>
          </button>

          {commentsOpen && (
            <div
              className="animate-fade-in"
              style={{ paddingBottom: 8 }}
              data-ocid="comments.list"
            >
              {commentsLoading ? (
                <div
                  style={{ padding: "8px 12px" }}
                  data-ocid="comments.loading_state"
                >
                  {Array.from({ length: 4 }).map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                    <CommentSkeleton key={i} />
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <p
                  style={{
                    fontSize: 13,
                    color: "#717171",
                    padding: "8px 12px 16px",
                  }}
                  data-ocid="comments.empty_state"
                >
                  No comments available.
                </p>
              ) : (
                <div style={{ padding: "0 12px" }}>
                  {comments.map((c, i) => (
                    <div
                      key={c.id}
                      className="flex gap-3"
                      style={{ marginBottom: 16 }}
                      data-ocid={i < 3 ? `comments.item.${i + 1}` : undefined}
                    >
                      {c.authorAvatar ? (
                        <img
                          src={c.authorAvatar}
                          alt={c.authorName}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: getAvatarColor(c.authorName),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#fff",
                            flexShrink: 0,
                          }}
                        >
                          {c.authorName[0]?.toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="flex items-center gap-2"
                          style={{ marginBottom: 3 }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#f1f1f1",
                            }}
                          >
                            {c.authorName}
                          </span>
                          <span style={{ fontSize: 11, color: "#717171" }}>
                            {timeAgo(c.publishedAt)}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#d0d0d0",
                            lineHeight: "18px",
                            wordBreak: "break-word",
                          }}
                          // biome-ignore lint/security/noDangerouslySetInnerHtml: YouTube comment HTML
                          dangerouslySetInnerHTML={{ __html: c.text }}
                        />
                        {c.likeCount > 0 && (
                          <div
                            className="flex items-center gap-1"
                            style={{ marginTop: 5 }}
                          >
                            <svg
                              aria-hidden="true"
                              width="12"
                              height="12"
                              fill="#717171"
                              viewBox="0 0 24 24"
                            >
                              <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
                            </svg>
                            <span style={{ fontSize: 11, color: "#717171" }}>
                              {c.likeCount.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Load more comments */}
                  {hasMoreComments && (
                    <button
                      type="button"
                      onClick={() => setCommentsPage((p) => p + 1)}
                      data-ocid="comments.pagination_next"
                      style={{
                        width: "100%",
                        padding: "10px",
                        marginBottom: 12,
                        background: "#1a1a1a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10,
                        color: "#f1f1f1",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Load more comments
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider before recommended */}
        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.06)",
            margin: "0 12px",
          }}
        />

        {/* Recommended videos */}
        <div className="pt-2">
          <h2
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#f1f1f1",
              padding: "8px 12px 4px",
            }}
          >
            Recommended
          </h2>
          {relatedLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
              <RelatedSkeleton key={i} />
            ))
          ) : related.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: "#717171",
                padding: "8px 12px 16px",
              }}
              data-ocid="related.empty_state"
            >
              No recommendations available.
            </p>
          ) : (
            <>
              {related.map((v, i) => (
                <button
                  type="button"
                  key={v.id}
                  className="flex gap-2 w-full text-left px-3 py-2"
                  style={{
                    cursor: "pointer",
                    background: "transparent",
                    border: "none",
                    transition: "background 0.15s ease",
                  }}
                  onClick={() => onWatch(v.id)}
                  data-ocid={i < 3 ? `related.item.${i + 1}` : undefined}
                >
                  <div
                    style={{
                      width: 160,
                      height: 90,
                      flexShrink: 0,
                      borderRadius: 8,
                      overflow: "hidden",
                      background: "#111",
                      position: "relative",
                    }}
                  >
                    <img
                      src={v.thumbnail || getYtThumbnail(v.id)}
                      alt={v.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        const fb = getYtThumbnail(v.id);
                        if (img.src !== fb) img.src = fb;
                      }}
                    />
                    {/* Duration badge on thumbnail */}
                    {v.duration && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: 4,
                          right: 4,
                          background: "rgba(0,0,0,0.82)",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: 3,
                          padding: "1px 4px",
                          lineHeight: 1.4,
                          letterSpacing: "0.02em",
                        }}
                      >
                        {v.duration}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <p
                      className="line-clamp-2"
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#f1f1f1",
                        lineHeight: "18px",
                        marginBottom: 3,
                      }}
                    >
                      {v.title}
                    </p>
                    <p style={{ fontSize: 12, color: "#717171" }}>
                      {v.channelTitle}
                    </p>
                    <p style={{ fontSize: 12, color: "#717171" }}>
                      {timeAgo(v.publishedAt)}
                    </p>
                  </div>
                </button>
              ))}

              {/* Load more recommended */}
              {hasMoreRelated && (
                <div style={{ padding: "4px 12px 12px" }}>
                  <button
                    type="button"
                    onClick={() => setRelatedPage((p) => p + 1)}
                    data-ocid="related.pagination_next"
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "#1a1a1a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      color: "#f1f1f1",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 text-center">
          <p style={{ fontSize: 11, color: "#444" }}>
            &copy; {new Date().getFullYear()}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#555" }}
            >
              Built with caffeine.ai
            </a>
          </p>
        </div>
      </div>
      {/* end scrollable section */}
    </div>
  );
}

function RelatedSkeleton() {
  return (
    <div className="flex gap-2 px-3 py-2">
      <div
        className="yt-skeleton flex-shrink-0"
        style={{ width: 160, height: 90, borderRadius: 8 }}
      />
      <div className="flex-1 pt-1 space-y-2">
        <div className="yt-skeleton h-3.5 w-full" style={{ borderRadius: 4 }} />
        <div className="yt-skeleton h-3 w-3/4" style={{ borderRadius: 4 }} />
        <div className="yt-skeleton h-3 w-1/2" style={{ borderRadius: 4 }} />
      </div>
    </div>
  );
}

function CommentSkeleton() {
  return (
    <div className="flex gap-3" style={{ marginBottom: 16 }}>
      <div
        className="yt-skeleton flex-shrink-0"
        style={{ width: 32, height: 32, borderRadius: "50%" }}
      />
      <div className="flex-1 pt-1 space-y-2">
        <div className="yt-skeleton h-3 w-1/3" style={{ borderRadius: 4 }} />
        <div className="yt-skeleton h-3 w-full" style={{ borderRadius: 4 }} />
        <div className="yt-skeleton h-3 w-3/4" style={{ borderRadius: 4 }} />
      </div>
    </div>
  );
}
