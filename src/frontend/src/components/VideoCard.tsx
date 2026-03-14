import { formatViews, timeAgo } from "@/lib/format";
import {
  type YouTubeSearchResult,
  type YouTubeVideo,
  getYtThumbnail,
} from "@/lib/youtube";

type VideoData = YouTubeVideo | YouTubeSearchResult;
interface VideoCardProps {
  video: VideoData;
  onWatch: (id: string) => void;
  onChannelClick?: (channelId: string, channelTitle: string) => void;
  index?: number;
}
function isFullVideo(v: VideoData): v is YouTubeVideo {
  return "viewCount" in v;
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

export function VideoCard({
  video,
  onWatch,
  onChannelClick,
  index,
}: VideoCardProps) {
  const ocid =
    index !== undefined && index < 3 ? `video.item.${index + 1}` : undefined;
  const avatarColor = getAvatarColor(video.channelTitle);
  const initial = video.channelTitle.charAt(0).toUpperCase();
  const fallbackThumb = getYtThumbnail(video.id);

  return (
    <div
      style={{
        padding: "0 12px",
        marginBottom: 14,
      }}
    >
      {/* Glass card wrapper */}
      <div
        style={{
          borderRadius: 16,
          overflow: "hidden",
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(18px) saturate(160%)",
          WebkitBackdropFilter: "blur(18px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow:
            "0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10)",
        }}
      >
        {/* Thumbnail */}
        <button
          type="button"
          className="w-full"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "block",
          }}
          onClick={() => onWatch(video.id)}
          data-ocid={ocid}
          aria-label={video.title}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "16/9",
              background: "#111",
            }}
          >
            <img
              src={video.thumbnail || fallbackThumb}
              alt={video.title}
              className="w-full h-full object-cover"
              style={{ display: "block" }}
              loading="lazy"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src !== fallbackThumb) img.src = fallbackThumb;
              }}
            />
            {/* Duration badge */}
            {video.duration && (
              <span
                style={{
                  position: "absolute",
                  bottom: 8,
                  right: 8,
                  background: "rgba(0,0,0,0.82)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "2px 7px",
                  borderRadius: 5,
                  letterSpacing: "0.3px",
                  backdropFilter: "blur(4px)",
                }}
              >
                {video.duration}
              </span>
            )}
          </div>
        </button>

        {/* Card info */}
        <div
          style={{
            padding: "10px 12px 12px",
            background: "rgba(0,0,0,0.35)",
          }}
        >
          {/* Channel avatar + name */}
          <button
            type="button"
            className="flex items-center gap-2 mb-2 w-full text-left"
            onClick={() => {
              if (onChannelClick) {
                onChannelClick(video.channelId, video.channelTitle);
              }
            }}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: onChannelClick ? "pointer" : "default",
            }}
            aria-label={`View ${video.channelTitle}'s channel`}
          >
            <div
              className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-bold"
              style={{
                background: video.channelThumbnail
                  ? "transparent"
                  : avatarColor,
                border: "1.5px solid rgba(255,255,255,0.15)",
              }}
              aria-hidden="true"
            >
              {video.channelThumbnail ? (
                <img
                  src={video.channelThumbnail}
                  alt={video.channelTitle}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                initial
              )}
            </div>
            <span
              style={{
                fontSize: 12.5,
                color: onChannelClick ? "#ccc" : "#aaa",
                fontWeight: 400,
              }}
            >
              {video.channelTitle}
            </span>
          </button>

          {/* Title */}
          <button
            type="button"
            className="w-full text-left"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
            onClick={() => onWatch(video.id)}
            aria-label={video.title}
          >
            <h3
              className="line-clamp-2"
              style={{
                fontSize: 14.5,
                fontWeight: 600,
                color: "#f1f1f1",
                lineHeight: "20px",
                marginBottom: 4,
              }}
            >
              {video.title}
            </h3>
            <div style={{ fontSize: 12, color: "#717171" }}>
              {isFullVideo(video) && (
                <span>{formatViews(video.viewCount)} views &bull; </span>
              )}
              <span>{timeAgo(video.publishedAt)}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export function VideoCardSkeleton() {
  return (
    <div
      data-ocid="video.loading_state"
      style={{ padding: "0 12px", marginBottom: 14 }}
    >
      <div
        style={{
          borderRadius: 16,
          overflow: "hidden",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div className="yt-skeleton w-full" style={{ aspectRatio: "16/9" }} />
        <div
          style={{ padding: "10px 12px 12px", background: "rgba(0,0,0,0.3)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="yt-skeleton w-7 h-7 rounded-full flex-shrink-0" />
            <div className="yt-skeleton h-3 w-32" />
          </div>
          <div className="yt-skeleton h-4 w-full mb-2" />
          <div className="yt-skeleton h-3 w-3/4" />
        </div>
      </div>
    </div>
  );
}
