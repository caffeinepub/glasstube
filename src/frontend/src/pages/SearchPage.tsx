import { VideoGrid } from "@/components/VideoGrid";
import { type YouTubeSearchResult, searchVideos } from "@/lib/youtube";
import { useEffect, useState } from "react";

interface SearchPageProps {
  query: string;
  onWatch: (id: string) => void;
}

export function SearchPage({ query, onWatch }: SearchPageProps) {
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="animate-fade-in">
      {/* Search header */}
      <div
        className="px-3 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 400, color: "#717171" }}>
          Results for &ldquo;
          <span style={{ color: "#f1f1f1", fontWeight: 500 }}>{query}</span>
          &rdquo;
        </h2>
      </div>
      <VideoGrid
        videos={results}
        loading={loading}
        error={error}
        onWatch={onWatch}
        emptyMessage="No results found. Try a different search term."
      />
    </div>
  );
}
