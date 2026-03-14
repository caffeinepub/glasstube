import { useRef, useState } from "react";

interface TopBarProps {
  onSearch: (query: string) => void;
  onNavigate: (page: string) => void;
  currentQuery?: string;
}

export function TopBar({ onSearch, onNavigate, currentQuery }: TopBarProps) {
  const [query, setQuery] = useState(currentQuery || "");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 64,
          paddingLeft: 6,
          paddingRight: 10,
          overflow: "hidden",
          boxSizing: "border-box",
          width: "100%",
        }}
      >
        {/* Logo + Brand */}
        <button
          type="button"
          onClick={() => onNavigate("home")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
          data-ocid="topbar.logo.link"
          aria-label="Go to Home"
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              border: "2px solid rgba(255,0,0,0.75)",
              overflow: "hidden",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.3)",
            }}
          >
            <img
              src="/assets/uploads/IMG_20260314_072526-1-1.png"
              alt="M"
              style={{
                width: 46,
                height: 46,
                objectFit: "contain",
                mixBlendMode: "screen",
                display: "block",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 0,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "baseline", lineHeight: 1 }}
            >
              <span
                style={{
                  color: "#FF0000",
                  fontWeight: 800,
                  fontSize: 19,
                  fontFamily: "Roboto, sans-serif",
                  letterSpacing: "0.3px",
                }}
              >
                Modx
              </span>
              <span
                style={{
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: 19,
                  fontFamily: "Roboto, sans-serif",
                  letterSpacing: "0.3px",
                }}
              >
                Tube
              </span>
            </div>
            <span
              style={{
                color: "#aaaaaa",
                fontSize: 9,
                fontWeight: 400,
                letterSpacing: "0.3px",
                lineHeight: 1,
                marginTop: 2,
                paddingLeft: 1,
              }}
            >
              by Ayush
            </span>
          </div>
        </button>

        {/* Search bar — constrained to remaining space, never overflows */}
        <form
          onSubmit={handleSubmit}
          style={{
            flex: "1 1 0",
            minWidth: 0,
            maxWidth: 180,
            marginLeft: 8,
            marginRight: 0,
            display: "flex",
            alignItems: "center",
            background: "rgba(255,255,255,0.07)",
            borderRadius: 24,
            height: 28,
            padding: "0 6px",
            gap: 4,
            border: focused
              ? "1.5px solid rgba(255,0,0,0.75)"
              : "1.5px solid rgba(255,0,0,0.3)",
            boxShadow: focused ? "0 0 8px rgba(255,0,0,0.18)" : "none",
            transition: "border 0.2s, box-shadow 0.2s",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            fill="#888"
            viewBox="0 0 24 24"
            style={{ flexShrink: 0 }}
          >
            <path d="M20.87 20.17l-5.59-5.59C16.35 13.35 17 11.75 17 10c0-3.87-3.13-7-7-7s-7 3.13-7 7 3.13 7 7 7c1.75 0 3.35-.65 4.58-1.71l5.59 5.59.7-.71zM10 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
          </svg>
          <input
            ref={inputRef}
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              outline: "none",
              border: "none",
              color: "#f1f1f1",
              fontSize: 11,
            }}
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            data-ocid="search.search_input"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear"
              style={{
                color: "#888",
                fontSize: 13,
                lineHeight: 1,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              ×
            </button>
          )}
          <button
            type="submit"
            aria-label="Search"
            data-ocid="search.submit_button"
            style={{
              background: "rgba(255,0,0,0.75)",
              borderRadius: 16,
              width: 20,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              border: "none",
              cursor: "pointer",
            }}
          >
            <svg
              aria-hidden="true"
              width="10"
              height="10"
              fill="#fff"
              viewBox="0 0 24 24"
            >
              <path d="M20.87 20.17l-5.59-5.59C16.35 13.35 17 11.75 17 10c0-3.87-3.13-7-7-7s-7 3.13-7 7 3.13 7 7 7c1.75 0 3.35-.65 4.58-1.71l5.59 5.59.7-.71zM10 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
            </svg>
          </button>
        </form>
      </div>
    </header>
  );
}
