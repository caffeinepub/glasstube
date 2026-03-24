import { VideoGrid } from "@/components/VideoGrid";
import { getHistory } from "@/lib/history";
import {
  type YouTubeSearchResult,
  type YouTubeVideo,
  fetchInterestVideos,
  fetchTrending,
} from "@/lib/youtube";
import { useEffect, useState } from "react";

const CHIPS = [
  { label: "Home", emoji: "🏠", id: "home" },
  { label: "Trending", emoji: "🔥", id: "trending" },
  { label: "Music", emoji: "🎵", id: "music" },
  { label: "Gaming", emoji: "🎮", id: "gaming" },
  { label: "News", emoji: "📰", id: "news" },
  { label: "Sports", emoji: "⚽", id: "sports" },
  { label: "Live", emoji: "📡", id: "live" },
  { label: "Podcasts", emoji: "🎙️", id: "podcasts" },
  { label: "Cooking", emoji: "🍳", id: "cooking" },
  { label: "Tech", emoji: "💻", id: "tech" },
  { label: "Fashion", emoji: "👗", id: "fashion" },
];

const CATEGORY_IDS: Record<string, string | undefined> = {
  music: "10",
  gaming: "20",
  news: "25",
  sports: "17",
};

const SECTION_TITLES: Record<string, string> = {
  home: "For You",
  trending: "Trending",
  music: "Music",
  gaming: "Gaming",
  news: "News",
  sports: "Sports",
  live: "Live",
  podcasts: "Podcasts",
  cooking: "Cooking",
  tech: "Technology",
  fashion: "Fashion",
};

const SECTION_EMOJIS: Record<string, string> = {
  home: "🏠",
  trending: "🔥",
  music: "🎵",
  gaming: "🎮",
  news: "📰",
  sports: "⚽",
  live: "📡",
  podcasts: "🎙️",
  cooking: "🍳",
  tech: "💻",
  fashion: "👗",
};

interface HomePageProps {
  onWatch: (id: string, resumeTime?: number) => void;
  onChannelClick?: (channelId: string, channelTitle: string) => void;
  initialChip?: string;
}

export function HomePage({
  onWatch,
  onChannelClick,
  initialChip,
}: HomePageProps) {
  const [videos, setVideos] = useState<(YouTubeVideo | YouTubeSearchResult)[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChip, setActiveChip] = useState(initialChip || "home");
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasHistory, setHasHistory] = useState(false);

  // Refresh when user navigates back to home
  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const catId = CATEGORY_IDS[activeChip];

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey intentionally triggers re-fetch
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setVideos([]);

    async function load() {
      try {
        if (activeChip === "home") {
          const history = getHistory();
          setHasHistory(history.length > 0);
          if (history.length > 0) {
            const historyTitles = history.slice(0, 5).map((h) => h.title);
            const historyCategoryIds = history
              .slice(0, 5)
              .map((h) => (h as any).categoryId || "")
              .filter(Boolean);
            const results = await fetchInterestVideos(
              historyTitles,
              historyCategoryIds,
            );
            if (!cancelled) {
              if (results.length >= 6) {
                setVideos(results);
              } else {
                const trending = await fetchTrending(undefined);
                const resultIds = new Set(results.map((v) => v.id));
                const padded = trending.filter((v) => !resultIds.has(v.id));
                setVideos([...results, ...padded]);
              }
              setLoading(false);
            }
          } else {
            const data = await fetchTrending(undefined);
            if (!cancelled) {
              setVideos(data);
              setLoading(false);
            }
          }
        } else {
          const data = await fetchTrending(catId);
          if (!cancelled) {
            setHasHistory(false);
            setVideos(data);
            setLoading(false);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeChip, catId, refreshKey]);

  const baseSectionTitle = SECTION_TITLES[activeChip] || "For You";
  const sectionTitle =
    activeChip === "home" && hasHistory ? "Recommended" : baseSectionTitle;
  const sectionEmoji = SECTION_EMOJIS[activeChip] || "🏠";

  return (
    <div className="animate-fade-in">
      {/* Category chips — pure black sticky bar, inner scrollable container */}
      <div
        style={{
          position: "sticky",
          top: "calc(64px + env(safe-area-inset-top, 0px))",
          zIndex: 10,
          background: "#000000",
          touchAction: "pan-x",
        }}
      >
        <div
          data-ocid="home.filter.tab"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "8px 10px",
            flexWrap: "nowrap",
            overflowX: "scroll",
            overflowY: "hidden",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-x",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {CHIPS.map((chip) => {
            const isActive = activeChip === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setActiveChip(chip.id)}
                style={{
                  flexShrink: 0,
                  padding: "5px 9px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? "#FF0000" : "rgba(255,255,255,0.1)",
                  color: isActive ? "#fff" : "#e0e0e0",
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>{chip.emoji}</span>
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section header */}
      {!loading && !error && (
        <div style={{ padding: "16px 14px 8px" }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#f1f1f1",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{sectionEmoji}</span> {sectionTitle}
          </h2>
          {videos.length > 0 && (
            <p style={{ fontSize: 13, color: "#717171", marginTop: 2 }}>
              {videos.length} videos
            </p>
          )}
        </div>
      )}

      <VideoGrid
        videos={videos}
        loading={loading}
        error={error}
        onWatch={onWatch}
        onChannelClick={onChannelClick}
      />
    </div>
  );
}
