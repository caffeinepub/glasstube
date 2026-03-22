import type { YouTubeSearchResult, YouTubeVideo } from "@/lib/youtube";
import { VideoCard, VideoCardSkeleton } from "./VideoCard";

type VideoData = YouTubeVideo | YouTubeSearchResult;

interface VideoGridProps {
  videos: VideoData[];
  loading?: boolean;
  error?: string | null;
  onWatch: (id: string) => void;
  onChannelClick?: (channelId: string, channelTitle: string) => void;
  emptyMessage?: string;
}

export function VideoGrid({
  videos,
  loading,
  error,
  onWatch,
  onChannelClick,
  emptyMessage,
}: VideoGridProps) {
  if (error) {
    return (
      <div
        className="mx-4 mt-6 p-6 text-center"
        style={{
          background: "#0d0d0d",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
        data-ocid="video.error_state"
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ background: "rgba(255,0,0,0.12)" }}
        >
          <svg
            aria-hidden="true"
            className="w-7 h-7"
            fill="none"
            stroke="#ff5555"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <h3
          style={{
            color: "#f1f1f1",
            fontWeight: 600,
            fontSize: 16,
            marginBottom: 6,
          }}
        >
          Something went wrong
        </h3>
        <p style={{ color: "#717171", fontSize: 13 }}>{error}</p>
        <p style={{ color: "#555", fontSize: 12, marginTop: 6 }}>
          Check your API key in Settings, or your quota may be exceeded.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="video-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="p-12 text-center" data-ocid="video.empty_state">
        <p style={{ color: "#717171", fontSize: 15 }}>
          {emptyMessage || "No videos found."}
        </p>
      </div>
    );
  }

  return (
    <div className="video-grid">
      {videos.map((v, i) => (
        <VideoCard
          key={v.id}
          video={v}
          onWatch={onWatch}
          onChannelClick={onChannelClick}
          index={i}
        />
      ))}
    </div>
  );
}
