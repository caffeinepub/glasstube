import { timeAgo } from "@/lib/format";
import { type HistoryEntry, clearHistory, getHistory } from "@/lib/history";
import { useCallback, useState } from "react";

interface HistoryPageProps {
  onWatch: (id: string, resumeTime?: number) => void;
  onChannelClick?: (channelId: string, channelTitle: string) => void;
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function HistoryPage({ onWatch, onChannelClick }: HistoryPageProps) {
  const [history, setHistory] = useState<HistoryEntry[]>(() => getHistory());

  const handleClear = useCallback(() => {
    clearHistory();
    setHistory([]);
  }, []);

  if (history.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ paddingTop: 80 }}
        data-ocid="history.empty_state"
      >
        <svg
          aria-hidden="true"
          width="64"
          height="64"
          fill="#333"
          viewBox="0 0 24 24"
          style={{ marginBottom: 16 }}
        >
          <path d="M13 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7v3l4-4-4-4v3zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
        </svg>
        <p style={{ color: "#717171", fontSize: 16, fontWeight: 500 }}>
          No watch history yet.
        </p>
        <p style={{ color: "#555", fontSize: 13, marginTop: 6 }}>
          Videos you watch will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-ocid="history.panel">
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{ padding: "16px 14px 8px" }}
      >
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
          <span>🕐</span> Watch History
        </h2>
        <button
          type="button"
          onClick={handleClear}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#f1f1f1",
            padding: "6px 14px",
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
          data-ocid="history.delete_button"
        >
          Clear All
        </button>
      </div>

      {/* History list */}
      <div className="px-3">
        {history.map((entry, i) => {
          const resumeStr = formatTime(entry.resumeTime);
          return (
            <div
              key={entry.id}
              className="flex gap-3 w-full py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              {/* Thumbnail — clicking watches the video */}
              <button
                type="button"
                className="flex-shrink-0"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
                onClick={() =>
                  onWatch(
                    entry.id,
                    entry.resumeTime > 0 ? entry.resumeTime : undefined,
                  )
                }
                data-ocid={i < 3 ? `history.item.${i + 1}` : undefined}
              >
                <div
                  style={{
                    width: 160,
                    height: 90,
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "#111",
                    position: "relative",
                  }}
                >
                  {entry.thumbnail ? (
                    <img
                      src={entry.thumbnail}
                      alt={entry.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ background: "#111" }}
                    />
                  )}
                  {entry.duration && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 5,
                        right: 5,
                        background: "rgba(0,0,0,0.82)",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "1px 5px",
                        borderRadius: 4,
                      }}
                    >
                      {entry.duration}
                    </span>
                  )}
                </div>
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0 py-1">
                <button
                  type="button"
                  className="text-left w-full"
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    onWatch(
                      entry.id,
                      entry.resumeTime > 0 ? entry.resumeTime : undefined,
                    )
                  }
                >
                  <p
                    className="line-clamp-2"
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#f1f1f1",
                      lineHeight: "18px",
                      marginBottom: 4,
                    }}
                  >
                    {entry.title}
                  </p>
                </button>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: onChannelClick ? "pointer" : "default",
                    textAlign: "left",
                  }}
                  onClick={() => {
                    if (onChannelClick && entry.channelId) {
                      onChannelClick(entry.channelId, entry.channelTitle);
                    }
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      color: onChannelClick ? "#ccc" : "#717171",
                      marginBottom: 3,
                    }}
                  >
                    {entry.channelTitle}
                  </p>
                </button>
                <p style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>
                  {timeAgo(new Date(entry.watchedAt).toISOString())}
                </p>
                {resumeStr && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: "rgba(255,0,0,0.15)",
                      border: "1px solid rgba(255,0,0,0.3)",
                      color: "#ff6666",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 12,
                    }}
                  >
                    ▶ Resume at {resumeStr}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
