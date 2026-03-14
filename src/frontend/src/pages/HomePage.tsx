import { VideoGrid } from "@/components/VideoGrid";
import { type YouTubeVideo, fetchTrending } from "@/lib/youtube";
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
  onWatch: (id: string) => void;
}

export function HomePage({ onWatch }: HomePageProps) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChip, setActiveChip] = useState("home");

  const catId = CATEGORY_IDS[activeChip];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setVideos([]);
    fetchTrending(catId)
      .then((data) => {
        if (!cancelled) {
          setVideos(data);
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
  }, [catId]);

  const sectionTitle = SECTION_TITLES[activeChip] || "For You";
  const sectionEmoji = SECTION_EMOJIS[activeChip] || "🏠";

  return (
    <div className="animate-fade-in">
      {/* Category chips - glass blur */}
      <div
        className="flex items-center gap-2 overflow-x-auto px-3 py-3"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          position: "sticky",
          top: "calc(64px + env(safe-area-inset-top, 0px))",
          zIndex: 10,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
        data-ocid="home.filter.tab"
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
                padding: "7px 14px",
                borderRadius: 20,
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                background: isActive ? "#FF0000" : "rgba(255,255,255,0.1)",
                color: isActive ? "#fff" : "#e0e0e0",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span>{chip.emoji}</span>
              <span>{chip.label}</span>
            </button>
          );
        })}
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
      />
    </div>
  );
}
