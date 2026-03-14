import { VideoGrid } from "@/components/VideoGrid";
import { type YouTubeSearchResult, fetchChannelVideos } from "@/lib/youtube";
import { useEffect, useRef, useState } from "react";

interface ChannelInfo {
  id: string;
  title: string;
  thumbnail: string;
  description: string;
  subscriberCount: string;
}

interface ChannelPageProps {
  channelId: string;
  onWatch: (id: string, resumeTime?: number) => void;
  onBack: () => void;
  onChannelClick: (channelId: string, channelTitle: string) => void;
}

function formatSubscribers(count: string): string {
  const n = Number.parseInt(count, 10);
  if (Number.isNaN(n)) return "0 subscribers";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M subscribers`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K subscribers`;
  return `${n} subscribers`;
}

export function ChannelPage({
  channelId,
  onWatch,
  onBack,
  onChannelClick,
}: ChannelPageProps) {
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [videos, setVideos] = useState<YouTubeSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setChannel(null);
    setVideos([]);

    fetchChannelVideos(channelId)
      .then(({ channel: ch, videos: vids }) => {
        if (!cancelled) {
          setChannel(ch);
          setVideos(vids);
          setLoading(false);

          // Paint ambient from channel avatar
          if (ch.thumbnail) {
            const canvas = ambientCanvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const offscreen = document.createElement("canvas");
              offscreen.width = 4;
              offscreen.height = 4;
              const oc = offscreen.getContext("2d");
              if (!oc) return;
              oc.drawImage(img, 0, 0, 4, 4);
              const d = oc.getImageData(2, 2, 1, 1).data;
              const w = canvas.width;
              const h = canvas.height;
              ctx.clearRect(0, 0, w, h);
              const grad = ctx.createRadialGradient(
                w * 0.5,
                h * 0.4,
                0,
                w * 0.5,
                h * 0.4,
                w * 0.8,
              );
              grad.addColorStop(0, `rgba(${d[0]},${d[1]},${d[2]},0.7)`);
              grad.addColorStop(1, "transparent");
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, w, h);
            };
            img.src = ch.thumbnail;
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [channelId]);

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

  const avatarColor = channel ? getAvatarColor(channel.title) : "#ff0000";

  return (
    <div className="animate-fade-in" data-ocid="channel.panel">
      {/* Channel header with ambient background */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        {/* Ambient canvas behind header */}
        <canvas
          ref={ambientCanvasRef}
          width={640}
          height={200}
          style={{
            position: "absolute",
            top: 0,
            left: "-10%",
            width: "120%",
            height: "100%",
            filter: "blur(60px)",
            opacity: 0.55,
            zIndex: 0,
            pointerEvents: "none",
          }}
        />

        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            color: "#f1f1f1",
            fontSize: 13,
            fontWeight: 500,
            padding: "6px 14px 6px 10px",
            cursor: "pointer",
            margin: "12px 14px 0",
            backdropFilter: "blur(8px)",
          }}
          data-ocid="channel.secondary_button"
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            fill="#f1f1f1"
            viewBox="0 0 24 24"
          >
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Back
        </button>

        {/* Channel info */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "20px 16px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* Avatar */}
          {loading ? (
            <div
              className="yt-skeleton"
              style={{ width: 80, height: 80, borderRadius: "50%" }}
              data-ocid="channel.loading_state"
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                overflow: "hidden",
                border: "3px solid rgba(255,255,255,0.2)",
                background: channel?.thumbnail ? "transparent" : avatarColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
                boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              }}
            >
              {channel?.thumbnail ? (
                <img
                  src={channel.thumbnail}
                  alt={channel?.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                channel?.title?.charAt(0).toUpperCase() || "C"
              )}
            </div>
          )}

          {/* Channel name + subs */}
          {loading ? (
            <div style={{ textAlign: "center" }}>
              <div
                className="yt-skeleton h-5 w-40 mx-auto mb-2"
                style={{ borderRadius: 4 }}
              />
              <div
                className="yt-skeleton h-3.5 w-28 mx-auto"
                style={{ borderRadius: 4 }}
              />
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#f1f1f1",
                  marginBottom: 4,
                  lineHeight: "1.2",
                }}
              >
                {channel?.title}
              </h1>
              <p style={{ fontSize: 13, color: "#aaa" }}>
                {channel ? formatSubscribers(channel.subscriberCount) : ""}
              </p>
              {channel?.description && (
                <p
                  className="line-clamp-2"
                  style={{
                    fontSize: 12,
                    color: "#717171",
                    marginTop: 6,
                    maxWidth: 300,
                    lineHeight: "1.5",
                  }}
                >
                  {channel.description}
                </p>
              )}
            </div>
          )}

          {/* Subscribe button */}
          {!loading && (
            <button
              type="button"
              onClick={() => setSubscribed((s) => !s)}
              style={{
                padding: "9px 24px",
                borderRadius: 20,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                border: "none",
                background: subscribed ? "#272727" : "#f1f1f1",
                color: subscribed ? "#f1f1f1" : "#000",
                transition: "all 0.15s",
                boxShadow: subscribed
                  ? "none"
                  : "0 2px 8px rgba(255,255,255,0.15)",
              }}
              data-ocid="channel.primary_button"
            >
              {subscribed ? "Subscribed" : "Subscribe"}
            </button>
          )}
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.08)",
            margin: "0 14px",
          }}
        />
      </div>

      {/* Section header */}
      {!loading && !error && (
        <div style={{ padding: "14px 14px 6px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#f1f1f1" }}>
            Videos
          </h2>
          {videos.length > 0 && (
            <p style={{ fontSize: 12, color: "#717171", marginTop: 2 }}>
              {videos.length} videos
            </p>
          )}
        </div>
      )}

      {error && (
        <div
          className="mx-4 mt-4 p-5 text-center"
          style={{
            background: "#0d0d0d",
            borderRadius: 12,
            border: "1px solid rgba(255,0,0,0.2)",
          }}
          data-ocid="channel.error_state"
        >
          <p style={{ color: "#ff5555", fontSize: 14 }}>{error}</p>
        </div>
      )}

      {/* Videos grid */}
      <VideoGrid
        videos={videos}
        loading={loading}
        error={null}
        onWatch={onWatch}
        onChannelClick={onChannelClick}
        emptyMessage="This channel has no public videos."
      />

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
