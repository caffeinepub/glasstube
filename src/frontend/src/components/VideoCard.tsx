import { formatViews, timeAgo } from "@/lib/format";
import type { YouTubeSearchResult, YouTubeVideo } from "@/lib/youtube";

type VideoData = YouTubeVideo | YouTubeSearchResult;
interface VideoCardProps {
  video: VideoData;
  onWatch: (id: string) => void;
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

export function VideoCard({ video, onWatch, index }: VideoCardProps) {
  const ocid =
    index !== undefined && index < 3 ? `video.item.${index + 1}` : undefined;
  const avatarColor = getAvatarColor(video.channelTitle);
  const initial = video.channelTitle.charAt(0).toUpperCase();

  return (
    <button
      type="button"
      className="w-full text-left bg-transparent border-none p-0 block"
      style={{ cursor: "pointer" }}
      onClick={() => onWatch(video.id)}
      data-ocid={ocid}
      aria-label={video.title}
    >
      {/* Thumbnail with duration badge */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          background: "#111",
        }}
      >
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
            style={{ display: "block" }}
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "#111" }}
          >
            <svg
              aria-hidden="true"
              className="w-12 h-12"
              fill="#333"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}
        {/* Duration badge */}
        {video.duration && (
          <span
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              background: "rgba(0,0,0,0.85)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 500,
              padding: "2px 6px",
              borderRadius: 4,
              letterSpacing: "0.3px",
            }}
          >
            {video.duration}
          </span>
        )}
      </div>

      {/* Card info */}
      <div
        style={{
          background: "#0f0f0f",
          padding: "10px 12px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Channel avatar + channel name row */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold"
            style={{
              background: video.channelThumbnail ? "transparent" : avatarColor,
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
          <span style={{ fontSize: 13, color: "#aaaaaa", fontWeight: 400 }}>
            {video.channelTitle}
          </span>
        </div>

        {/* Title */}
        <h3
          className="line-clamp-2"
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#f1f1f1",
            lineHeight: "20px",
            marginBottom: 4,
          }}
        >
          {video.title}
        </h3>

        {/* Views + date */}
        <div style={{ fontSize: 13, color: "#717171" }}>
          {isFullVideo(video) && (
            <span>{formatViews(video.viewCount)} views &bull; </span>
          )}
          <span>{timeAgo(video.publishedAt)}</span>
        </div>
      </div>
    </button>
  );
}

export function VideoCardSkeleton() {
  return (
    <div data-ocid="video.loading_state">
      <div className="yt-skeleton w-full" style={{ aspectRatio: "16/9" }} />
      <div
        style={{
          background: "#0f0f0f",
          padding: "10px 12px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="yt-skeleton w-8 h-8 rounded-full flex-shrink-0" />
          <div className="yt-skeleton h-3 w-32" />
        </div>
        <div className="yt-skeleton h-4 w-full mb-2" />
        <div className="yt-skeleton h-3 w-3/4" />
      </div>
    </div>
  );
}
