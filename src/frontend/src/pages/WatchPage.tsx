import { formatLikes, formatViews, timeAgo } from "@/lib/format";
import {
  type HistoryEntry,
  getHistory,
  saveToHistory,
  updateResumeTime,
} from "@/lib/history";
import {
  type YouTubeSearchResult,
  type YouTubeVideo,
  fetchRelatedVideos,
  fetchVideoDetails,
  getYtThumbnail,
} from "@/lib/youtube";
import { useEffect, useRef, useState } from "react";

interface WatchPageProps {
  videoId: string;
  onWatch: (id: string, resumeTime?: number) => void;
  onChannelClick?: (channelId: string, channelTitle: string) => void;
  startTime?: number;
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

export function WatchPage({
  videoId,
  onWatch,
  onChannelClick,
  startTime = 0,
}: WatchPageProps) {
  const [video, setVideo] = useState<YouTubeVideo | null>(null);
  const [related, setRelated] = useState<YouTubeSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [playerHovered, setPlayerHovered] = useState(false);
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerCardRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const currentResumeRef = useRef<number>(startTime);
  const isPlayingRef = useRef<boolean>(false);

  useAmbientMode(videoId, ambientCanvasRef);

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
    setRelated([]);
    setDescExpanded(false);
    setSubscribed(false);
    setLiked(false);

    fetchVideoDetails(videoId)
      .then((data) => {
        if (!cancelled) {
          setVideo(data);
          setLoading(false);

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

          fetchRelatedVideos(videoId, data?.categoryId)
            .then((rel) => {
              if (!cancelled) {
                setRelated(rel);
                setRelatedLoading(false);
              }
            })
            .catch(() => {
              if (!cancelled) setRelatedLoading(false);
            });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
          setRelatedLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [videoId, startTime]);

  function handleFullscreen() {
    const el = playerCardRef.current as
      | (HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void>;
          mozRequestFullScreen?: () => Promise<void>;
        })
      | null;
    if (!el) return;
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else if (el.mozRequestFullScreen) {
      el.mozRequestFullScreen();
    }
  }

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
    <div className="animate-fade-in" data-ocid="player.panel">
      {/* Outer ambient + player wrapper */}
      <div style={{ position: "relative", padding: "12px 12px 0" }}>
        {/* Ambient canvas — GPU-composited layer */}
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
            opacity: 0.65,
            zIndex: 0,
            pointerEvents: "none",
            willChange: "opacity",
            transform: "translateZ(0)",
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
            style={{
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
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
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              style={{ position: "relative", zIndex: 1 }}
              title="YouTube video player"
            />

            {/* Fullscreen button overlay */}
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
                transition: "background 0.15s ease",
              }}
            >
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                fill="#ffffff"
                viewBox="0 0 24 24"
              >
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

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

            {/* Views + time */}
            <p style={{ fontSize: 13, color: "#717171", marginBottom: 10 }}>
              {formatViews(video.viewCount)} views &bull;{" "}
              {timeAgo(video.publishedAt)}
            </p>

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
                onClick={() => {
                  if (onChannelClick && video.channelId) {
                    onChannelClick(video.channelId, video.channelTitle);
                  }
                }}
                data-ocid="player.channel.button"
                aria-label={`View ${video.channelTitle}'s channel`}
              >
                <div
                  className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-white font-bold"
                  style={{
                    background: video.channelThumbnail
                      ? "transparent"
                      : avatarColor,
                    border: "2px solid rgba(255,255,255,0.12)",
                    fontSize: 16,
                  }}
                >
                  {video.channelThumbnail ? (
                    <img
                      src={video.channelThumbnail}
                      alt={video.channelTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    video.channelTitle.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p
                    style={{ color: "#f1f1f1", fontWeight: 500, fontSize: 14 }}
                  >
                    {video.channelTitle}
                  </p>
                  <p style={{ color: "#717171", fontSize: 12 }}>
                    1.2M subscribers
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSubscribed((s) => !s)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 20,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  border: "none",
                  background: subscribed ? "#272727" : "#f1f1f1",
                  color: subscribed ? "#f1f1f1" : "#000",
                  transition: "background 0.2s ease, color 0.2s ease",
                  willChange: "background",
                }}
                data-ocid="player.subscribe.button"
              >
                {subscribed ? "Subscribed" : "Subscribe"}
              </button>
            </div>

            {/* Action buttons — single row, no wrap, no scroll needed */}
            <div
              className="pb-3"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                overflowX: "auto",
                msOverflowStyle: "none",
                scrollbarWidth: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {/* Like/dislike pill */}
              <div
                className="flex items-center"
                style={{
                  background: "#1a1a1a",
                  borderRadius: 20,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.08)",
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => setLiked((l) => !l)}
                  className="flex items-center gap-1"
                  style={{
                    padding: "5px 9px",
                    fontSize: 11,
                    fontWeight: 500,
                    color: liked ? "#fff" : "#f1f1f1",
                    background: "none",
                    borderRight: "1px solid rgba(255,255,255,0.08)",
                    cursor: "pointer",
                    transition: "color 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                  data-ocid="player.like.button"
                >
                  <svg
                    aria-hidden="true"
                    width="14"
                    height="14"
                    fill={liked ? "#fff" : "#f1f1f1"}
                    viewBox="0 0 24 24"
                  >
                    <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
                  </svg>
                  {formatLikes(video.likeCount)}
                </button>
                <button
                  type="button"
                  className="flex items-center"
                  style={{
                    padding: "5px 9px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                  aria-label="Dislike"
                  data-ocid="player.dislike.button"
                >
                  <svg
                    aria-hidden="true"
                    width="14"
                    height="14"
                    fill="#f1f1f1"
                    viewBox="0 0 24 24"
                  >
                    <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" />
                  </svg>
                </button>
              </div>

              {/* Share */}
              <button
                type="button"
                className="flex items-center gap-1"
                style={{
                  padding: "5px 9px",
                  background: "#1a1a1a",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#f1f1f1",
                  border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  transition: "background 0.15s ease",
                }}
                data-ocid="player.share.button"
              >
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  fill="#f1f1f1"
                  viewBox="0 0 24 24"
                >
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
                </svg>
                Share
              </button>

              {/* Save */}
              <button
                type="button"
                className="flex items-center gap-1"
                style={{
                  padding: "5px 9px",
                  background: "#1a1a1a",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#f1f1f1",
                  border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  transition: "background 0.15s ease",
                }}
                data-ocid="player.save.button"
              >
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  fill="#f1f1f1"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14l-4-4-4 4V5h12v12l-4-4-4 4z" />
                </svg>
                Save
              </button>

              {/* Download — icon only */}
              <button
                type="button"
                className="flex items-center"
                aria-label="Download"
                style={{
                  padding: "5px 10px",
                  background: "#1a1a1a",
                  borderRadius: 20,
                  color: "#f1f1f1",
                  border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "background 0.15s ease",
                }}
                data-ocid="player.secondary_button"
              >
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  fill="#f1f1f1"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
              </button>

              {/* Clip — icon only */}
              <button
                type="button"
                className="flex items-center"
                aria-label="Clip"
                style={{
                  padding: "5px 10px",
                  background: "#1a1a1a",
                  borderRadius: 20,
                  color: "#f1f1f1",
                  border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "background 0.15s ease",
                }}
                data-ocid="player.toggle"
              >
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  fill="#f1f1f1"
                  viewBox="0 0 24 24"
                >
                  <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
                </svg>
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

      {/* Related videos */}
      <div className="pt-2">
        <h2
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#f1f1f1",
            padding: "8px 12px 4px",
          }}
        >
          Up next
        </h2>
        {relatedLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
              <RelatedSkeleton key={i} />
            ))
          : related.map((v, i) => (
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
