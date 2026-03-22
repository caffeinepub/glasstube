import {
  type LibraryPlaylist,
  type LibraryVideo,
  getSavedPlaylists,
  getSavedVideos,
  removePlaylist,
  removeVideo,
} from "@/lib/library";
import { useState } from "react";

interface LibraryPageProps {
  onWatch: (id: string) => void;
}

export function LibraryPage({ onWatch }: LibraryPageProps) {
  const [tab, setTab] = useState<"videos" | "playlists">("videos");
  const [videos, setVideos] = useState<LibraryVideo[]>(getSavedVideos);
  const [playlists, setPlaylists] =
    useState<LibraryPlaylist[]>(getSavedPlaylists);

  function handleRemoveVideo(id: string) {
    removeVideo(id);
    setVideos(getSavedVideos());
  }

  function handleRemovePlaylist(id: string) {
    removePlaylist(id);
    setPlaylists(getSavedPlaylists());
  }

  return (
    <div style={{ minHeight: "100vh", padding: "0 0 20px" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px 12px 0",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <h1
          style={{
            color: "#f1f1f1",
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          Library
        </h1>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, paddingBottom: 1 }}>
          {(["videos", "playlists"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              data-ocid={`library.${t}.tab`}
              style={{
                padding: "6px 18px",
                borderRadius: 20,
                border: "1px solid",
                borderColor: tab === t ? "#FF0000" : "rgba(255,255,255,0.15)",
                background:
                  tab === t ? "rgba(255,0,0,0.15)" : "rgba(255,255,255,0.05)",
                color: tab === t ? "#FF0000" : "#aaa",
                fontSize: 13,
                fontWeight: tab === t ? 700 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {t === "videos" ? "Saved Videos" : "Saved Playlists"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "8px 0" }}>
        {tab === "videos" &&
          (videos.length === 0 ? (
            <div
              data-ocid="library.videos.empty_state"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 20px",
                gap: 12,
              }}
            >
              <svg
                aria-hidden="true"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="rgba(255,255,255,0.2)"
              >
                <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" />
              </svg>
              <p
                style={{
                  color: "#717171",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                No saved videos yet. Tap Save on any video to add it here.
              </p>
            </div>
          ) : (
            <div>
              {videos.map((video, idx) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  index={idx + 1}
                  onWatch={onWatch}
                  onRemove={handleRemoveVideo}
                />
              ))}
            </div>
          ))}

        {tab === "playlists" &&
          (playlists.length === 0 ? (
            <div
              data-ocid="library.playlists.empty_state"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 20px",
                gap: 12,
              }}
            >
              <svg
                aria-hidden="true"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="rgba(255,255,255,0.2)"
              >
                <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z" />
              </svg>
              <p
                style={{
                  color: "#717171",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                No saved playlists yet. Save playlists from search results.
              </p>
            </div>
          ) : (
            <div>
              {playlists.map((playlist, idx) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  index={idx + 1}
                  onRemove={handleRemovePlaylist}
                />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

function VideoCard({
  video,
  index,
  onWatch,
  onRemove,
}: {
  video: LibraryVideo;
  index: number;
  onWatch: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <button
      type="button"
      data-ocid={`library.video.item.${index}`}
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 12px",
        cursor: "pointer",
        alignItems: "flex-start",
        width: "100%",
        background: "none",
        border: "none",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        textAlign: "left",
        transition: "background 0.15s",
      }}
      onClick={() => onWatch(video.id)}
    >
      {/* Thumbnail */}
      <div
        style={{
          position: "relative",
          flexShrink: 0,
          width: 120,
          height: 68,
          borderRadius: 8,
          overflow: "hidden",
          background: "#111",
        }}
      >
        <img
          src={video.thumbnail}
          alt={video.title}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {video.duration && (
          <span
            style={{
              position: "absolute",
              bottom: 4,
              right: 4,
              background: "rgba(0,0,0,0.8)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 600,
              padding: "1px 4px",
              borderRadius: 3,
            }}
          >
            {video.duration}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            color: "#f1f1f1",
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.3,
            marginBottom: 4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {video.title}
        </p>
        <p style={{ color: "#aaa", fontSize: 11 }}>{video.channelTitle}</p>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(video.id);
        }}
        data-ocid={`library.video.delete_button.${index}`}
        aria-label="Remove from library"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 6,
          flexShrink: 0,
          color: "rgba(255,80,80,0.7)",
        }}
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
      </button>
    </button>
  );
}

function PlaylistCard({
  playlist,
  index,
  onRemove,
}: {
  playlist: LibraryPlaylist;
  index: number;
  onRemove: (id: string) => void;
}) {
  return (
    <button
      type="button"
      data-ocid={`library.playlist.item.${index}`}
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 12px",
        cursor: "pointer",
        alignItems: "flex-start",
        width: "100%",
        background: "none",
        border: "none",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        textAlign: "left",
      }}
      onClick={() =>
        window.open(
          `https://www.youtube.com/playlist?list=${playlist.id}`,
          "_blank",
        )
      }
    >
      {/* Thumbnail */}
      <div
        style={{
          position: "relative",
          flexShrink: 0,
          width: 120,
          height: 68,
          borderRadius: 8,
          overflow: "hidden",
          background: "#111",
        }}
      >
        <img
          src={playlist.thumbnail}
          alt={playlist.title}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 36,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 9,
            color: "#fff",
            fontWeight: 600,
            gap: 2,
          }}
        >
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 9H10V9h8v2zm-4 4H10v-2h4v2zm4-8H10V5h8v2z" />
          </svg>
          <span>{playlist.videoCount}</span>
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            color: "#f1f1f1",
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.3,
            marginBottom: 4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {playlist.title}
        </p>
        <p style={{ color: "#aaa", fontSize: 11 }}>{playlist.channelTitle}</p>
        <p
          style={{
            color: "#717171",
            fontSize: 10,
            marginTop: 2,
            background: "rgba(255,255,255,0.06)",
            display: "inline-block",
            padding: "1px 6px",
            borderRadius: 4,
          }}
        >
          {playlist.videoCount} videos
        </p>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(playlist.id);
        }}
        data-ocid={`library.playlist.delete_button.${index}`}
        aria-label="Remove from library"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 6,
          flexShrink: 0,
          color: "rgba(255,80,80,0.7)",
        }}
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
      </button>
    </button>
  );
}
