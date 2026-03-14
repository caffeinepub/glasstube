import { formatLikes, formatViews, timeAgo } from "@/lib/format";
import {
  type YouTubeSearchResult,
  type YouTubeVideo,
  fetchRelatedVideos,
  fetchVideoDetails,
} from "@/lib/youtube";
import { useEffect, useState } from "react";

interface WatchPageProps {
  videoId: string;
  onWatch: (id: string) => void;
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

export function WatchPage({ videoId, onWatch }: WatchPageProps) {
  const [video, setVideo] = useState<YouTubeVideo | null>(null);
  const [related, setRelated] = useState<YouTubeSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [liked, setLiked] = useState(false);

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
  }, [videoId]);

  if (error) {
    return (
      <div className="p-8 text-center" data-ocid="video.error_state">
        <p style={{ color: "#ff5555" }}>{error}</p>
      </div>
    );
  }

  const avatarColor = video ? getAvatarColor(video.channelTitle) : "#ff0000";

  return (
    <div className="animate-fade-in" data-ocid="player.panel">
      {/* Full-width player */}
      <div style={{ aspectRatio: "16/9", background: "#000", width: "100%" }}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
          title="YouTube video player"
        />
      </div>

      {/* Video info */}
      <div className="px-3 pt-3">
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
            {/* Title */}
            <h1
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "#f1f1f1",
                lineHeight: "24px",
                marginBottom: 8,
              }}
            >
              {video.title}
            </h1>

            {/* Views + time */}
            <p style={{ fontSize: 13, color: "#717171", marginBottom: 12 }}>
              {formatViews(video.viewCount)} views &bull;{" "}
              {timeAgo(video.publishedAt)}
            </p>

            {/* Channel row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: avatarColor, fontSize: 16 }}
                >
                  {video.channelTitle.charAt(0).toUpperCase()}
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
              </div>
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
                  transition: "all 0.15s",
                }}
                data-ocid="player.subscribe.button"
              >
                {subscribed ? "Subscribed" : "Subscribe"}
              </button>
            </div>

            {/* Action pills row - horizontal scroll */}
            <div
              className="flex items-center gap-2 overflow-x-auto pb-3"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {/* Like/dislike pill */}
              <div
                className="flex items-center flex-shrink-0"
                style={{
                  background: "#1a1a1a",
                  borderRadius: 20,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setLiked((l) => !l)}
                  className="flex items-center gap-1.5 px-3 py-2 active:bg-white/10 transition-colors"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: liked ? "#fff" : "#f1f1f1",
                    borderRight: "1px solid rgba(255,255,255,0.08)",
                  }}
                  data-ocid="player.like.button"
                >
                  <svg
                    aria-hidden="true"
                    className="w-4 h-4"
                    fill={liked ? "#fff" : "#f1f1f1"}
                    viewBox="0 0 24 24"
                  >
                    <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
                  </svg>
                  {formatLikes(video.likeCount)}
                </button>
                <button
                  type="button"
                  className="flex items-center px-3 py-2 active:bg-white/10 transition-colors"
                  aria-label="Dislike"
                  data-ocid="player.dislike.button"
                >
                  <svg
                    aria-hidden="true"
                    className="w-4 h-4"
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
                className="flex items-center gap-1.5 px-3 py-2 flex-shrink-0 active:bg-white/10 transition-colors"
                style={{
                  background: "#1a1a1a",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#f1f1f1",
                  border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                }}
                data-ocid="player.share.button"
              >
                <svg
                  aria-hidden="true"
                  className="w-4 h-4"
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
                className="flex items-center gap-1.5 px-3 py-2 flex-shrink-0 active:bg-white/10 transition-colors"
                style={{
                  background: "#1a1a1a",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#f1f1f1",
                  border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                }}
                data-ocid="player.save.button"
              >
                <svg
                  aria-hidden="true"
                  className="w-4 h-4"
                  fill="#f1f1f1"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14l-4-4-4 4V5h12v12l-4-4-4 4z" />
                </svg>
                Save
              </button>

              {/* Download */}
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-2 flex-shrink-0 active:bg-white/10 transition-colors"
                style={{
                  background: "#1a1a1a",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#f1f1f1",
                  border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                }}
              >
                <svg
                  aria-hidden="true"
                  className="w-4 h-4"
                  fill="#f1f1f1"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                Download
              </button>
            </div>

            {/* Description */}
            <button
              type="button"
              className="w-full text-left px-3 py-3 mb-4"
              style={{
                background: "#0d0d0d",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
              }}
              onClick={() => setDescExpanded((d) => !d)}
              data-ocid="player.description.toggle"
            >
              <div
                style={{
                  fontSize: 13,
                  color: "#f1f1f1",
                  lineHeight: "20px",
                  whiteSpace: "pre-wrap",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: descExpanded
                    ? ("unset" as unknown as number)
                    : 3,
                }}
              >
                {video.description || "No description available."}
              </div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#f1f1f1",
                  marginTop: 6,
                }}
              >
                {descExpanded ? "Show less" : "...more"}
              </p>
            </button>
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
                className="flex gap-2 w-full text-left px-3 py-2 active:bg-white/5 transition-colors"
                style={{
                  cursor: "pointer",
                  background: "transparent",
                  border: "none",
                }}
                onClick={() => onWatch(v.id)}
                data-ocid={i < 3 ? `related.item.${i + 1}` : undefined}
              >
                {/* Thumbnail */}
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
                  {v.thumbnail ? (
                    <img
                      src={v.thumbnail}
                      alt={v.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ background: "#111" }}
                    />
                  )}
                </div>
                {/* Text */}
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
