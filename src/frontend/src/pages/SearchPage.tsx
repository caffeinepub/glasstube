import { VideoGrid } from "@/components/VideoGrid";
import {
  type LibraryPlaylist,
  isPlaylistSaved,
  removePlaylist,
  savePlaylist,
} from "@/lib/library";
import {
  type YouTubePlaylist,
  type YouTubeSearchResult,
  searchPlaylists,
  searchVideos,
} from "@/lib/youtube";
import { useEffect, useState } from "react";

interface SearchPageProps {
  query: string;
  onWatch: (id: string) => void;
  onChannelClick?: (channelId: string, channelTitle: string) => void;
}

type SearchTab = "all" | "videos" | "playlists";

function parseDurationSeconds(dur: string): number {
  if (!dur) return Number.POSITIVE_INFINITY;
  const parts = dur.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(parts[0]) || 0;
}

export function SearchPage({
  query,
  onWatch,
  onChannelClick,
}: SearchPageProps) {
  const [tab, setTab] = useState<SearchTab>("all");
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPlaylists, setSavedPlaylists] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setResults([]);
    searchVideos(query)
      .then((data) => {
        if (!cancelled) {
          setResults(data);
          setLoading(false);
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
  }, [query]);

  useEffect(() => {
    if (tab !== "playlists" || !query) return;
    let cancelled = false;
    setPlaylistsLoading(true);
    searchPlaylists(query)
      .then((data) => {
        if (!cancelled) {
          setPlaylists(data);
          const savedMap: Record<string, boolean> = {};
          for (const pl of data) {
            savedMap[pl.id] = isPlaylistSaved(pl.id);
          }
          setSavedPlaylists(savedMap);
          setPlaylistsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setPlaylistsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, query]);

  const filteredResults = results.filter(
    (v) => parseDurationSeconds(v.duration || "") > 60,
  );

  function handleToggleSavePlaylist(pl: YouTubePlaylist) {
    const isSaved = savedPlaylists[pl.id];
    if (isSaved) {
      removePlaylist(pl.id);
    } else {
      const toSave: LibraryPlaylist = {
        id: pl.id,
        title: pl.title,
        channelTitle: pl.channelTitle,
        thumbnail: pl.thumbnail,
        videoCount: pl.videoCount,
        savedAt: Date.now(),
      };
      savePlaylist(toSave);
    }
    setSavedPlaylists((prev) => ({ ...prev, [pl.id]: !isSaved }));
  }

  const tabs: { id: SearchTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "videos", label: "Videos" },
    { id: "playlists", label: "Playlists" },
  ];

  return (
    <div className="animate-fade-in">
      <div
        className="px-3 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <h2
          style={{
            fontSize: 14,
            fontWeight: 400,
            color: "#717171",
            marginBottom: 10,
          }}
        >
          Results for &ldquo;
          <span style={{ color: "#f1f1f1", fontWeight: 500 }}>{query}</span>
          &rdquo;
        </h2>
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
          data-ocid="search.filter.tab"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: "6px 16px",
                borderRadius: 20,
                border: "1px solid",
                borderColor:
                  tab === t.id ? "#FF0000" : "rgba(255,255,255,0.15)",
                background:
                  tab === t.id
                    ? "rgba(255,0,0,0.15)"
                    : "rgba(255,255,255,0.05)",
                color: tab === t.id ? "#FF0000" : "#aaa",
                fontSize: 12,
                fontWeight: tab === t.id ? 700 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                transition: "all 0.15s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "playlists" ? (
        <PlaylistResults
          playlists={playlists}
          loading={playlistsLoading}
          savedPlaylists={savedPlaylists}
          onToggleSave={handleToggleSavePlaylist}
        />
      ) : (
        <VideoGrid
          videos={filteredResults}
          loading={loading}
          error={error}
          onWatch={onWatch}
          onChannelClick={onChannelClick}
          emptyMessage="No results found. Try a different search term."
        />
      )}
    </div>
  );
}

function PlaylistResults({
  playlists,
  loading,
  savedPlaylists,
  onToggleSave,
}: {
  playlists: YouTubePlaylist[];
  loading: boolean;
  savedPlaylists: Record<string, boolean>;
  onToggleSave: (pl: YouTubePlaylist) => void;
}) {
  if (loading) {
    return (
      <div
        data-ocid="search.playlists.loading_state"
        style={{ padding: "40px 20px", textAlign: "center", color: "#717171" }}
      >
        Loading playlists...
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div
        data-ocid="search.playlists.empty_state"
        style={{ padding: "40px 20px", textAlign: "center", color: "#717171" }}
      >
        No playlists found for this query.
      </div>
    );
  }

  return (
    <div>
      {playlists.map((pl, idx) => (
        <PlaylistCard
          key={pl.id}
          playlist={pl}
          index={idx + 1}
          saved={!!savedPlaylists[pl.id]}
          onToggleSave={onToggleSave}
        />
      ))}
    </div>
  );
}

function PlaylistCard({
  playlist,
  index,
  saved,
  onToggleSave,
}: {
  playlist: YouTubePlaylist;
  index: number;
  saved: boolean;
  onToggleSave: (pl: YouTubePlaylist) => void;
}) {
  return (
    <div
      data-ocid={`search.playlist.item.${index}`}
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        alignItems: "flex-start",
      }}
    >
      {/* Thumbnail (clickable) */}
      <button
        type="button"
        style={{
          position: "relative",
          flexShrink: 0,
          width: 120,
          height: 68,
          borderRadius: 8,
          overflow: "hidden",
          background: "#111",
          cursor: "pointer",
          padding: 0,
          border: "none",
        }}
        onClick={() =>
          window.open(
            `https://www.youtube.com/playlist?list=${playlist.id}`,
            "_blank",
          )
        }
        aria-label={`Open playlist ${playlist.title}`}
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
            width: 38,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            color: "#fff",
            fontWeight: 700,
            gap: 2,
          }}
        >
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 9H10V9h8v2zm-4 4H10v-2h4v2zm4-8H10V5h8v2z" />
          </svg>
          <span>{playlist.videoCount}</span>
        </div>
      </button>

      {/* Info (clickable) */}
      <button
        type="button"
        style={{
          flex: 1,
          minWidth: 0,
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          padding: 0,
        }}
        onClick={() =>
          window.open(
            `https://www.youtube.com/playlist?list=${playlist.id}`,
            "_blank",
          )
        }
      >
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
        <p style={{ color: "#aaa", fontSize: 11, marginBottom: 4 }}>
          {playlist.channelTitle}
        </p>
        <p
          style={{
            color: "#717171",
            fontSize: 10,
            background: "rgba(255,255,255,0.06)",
            display: "inline-block",
            padding: "1px 6px",
            borderRadius: 4,
          }}
        >
          {playlist.videoCount} videos
        </p>
      </button>

      {/* Save button */}
      <button
        type="button"
        onClick={() => onToggleSave(playlist)}
        data-ocid={`search.playlist.toggle.${index}`}
        aria-label={saved ? "Remove from library" : "Save to library"}
        style={{
          background: saved ? "rgba(255,0,0,0.15)" : "rgba(255,255,255,0.06)",
          border: "1px solid",
          borderColor: saved ? "rgba(255,0,0,0.4)" : "rgba(255,255,255,0.15)",
          borderRadius: 8,
          cursor: "pointer",
          padding: 7,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s",
        }}
      >
        {saved ? (
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="#FF0000"
          >
            <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="#aaa"
          >
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" />
          </svg>
        )}
      </button>
    </div>
  );
}
