import { useEffect, useRef, useState } from "react";

const SEARCH_CACHE_KEY = "modxtube_search_cache";
const MAX_CACHE = 50;

function getSearchCache(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_CACHE_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {}
  return [];
}

function addToSearchCache(query: string) {
  const cache = getSearchCache();
  const filtered = cache.filter((q) => q.toLowerCase() !== query.toLowerCase());
  filtered.unshift(query);
  if (filtered.length > MAX_CACHE) filtered.length = MAX_CACHE;
  try {
    localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(filtered));
  } catch {}
}

interface TopBarProps {
  onSearch: (query: string) => void;
  onNavigate: (page: string) => void;
  currentQuery?: string;
}

export function TopBar({ onSearch, onNavigate, currentQuery }: TopBarProps) {
  const [query, setQuery] = useState(currentQuery || "");
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    const cache = getSearchCache();
    const q = query.toLowerCase();
    const matches = cache.filter(
      (item) => item.toLowerCase().includes(q) && item.toLowerCase() !== q,
    );
    setSuggestions(matches.slice(0, 6));
    setShowDropdown(matches.length > 0 && focused);
  }, [query, focused]);

  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      addToSearchCache(trimmed);
      setShowDropdown(false);
      onSearch(trimmed);
    }
  }

  function handleSuggestionClick(s: string) {
    setQuery(s);
    setShowDropdown(false);
    addToSearchCache(s);
    onSearch(s);
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "none",
        boxShadow: "none",
      }}
    >
      {/* 64px content row */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          height: 64,
          paddingLeft: 6,
          paddingRight: 10,
          boxSizing: "border-box",
          width: "100%",
          maxWidth: 1400,
          margin: "0 auto",
          overflow: "visible",
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
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "50%",
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

        {/* Spacer pushes search to the right */}
        <div style={{ flex: 1, minWidth: 0 }} />

        {/* Search bar wrapper — alignSelf:center + explicit height locks it to exact vertical center */}
        <div
          className="topbar-search"
          style={{
            flexShrink: 0,
            width: 170,
            height: 34,
            alignSelf: "center",
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255,255,255,0.07)",
              borderRadius: 24,
              height: 34,
              padding: "0 6px",
              gap: 4,
              border: focused
                ? "1.5px solid rgba(255,0,0,0.75)"
                : "1.5px solid rgba(255,0,0,0.3)",
              boxShadow: focused ? "0 0 8px rgba(255,0,0,0.18)" : "none",
              transition: "border 0.2s, box-shadow 0.2s",
              boxSizing: "border-box",
              width: "100%",
              margin: 0,
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
                lineHeight: "34px",
                height: "100%",
                padding: 0,
              }}
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                setFocused(true);
                if (query.trim()) {
                  const cache = getSearchCache();
                  const q = query.toLowerCase();
                  const matches = cache.filter(
                    (item) =>
                      item.toLowerCase().includes(q) &&
                      item.toLowerCase() !== q,
                  );
                  if (matches.length > 0) setShowDropdown(true);
                }
              }}
              onBlur={() => {
                setFocused(false);
                setTimeout(() => setShowDropdown(false), 150);
              }}
              data-ocid="search.search_input"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setShowDropdown(false);
                }}
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

          {/* Search suggestions dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              data-ocid="search.dropdown_menu"
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "rgba(18,18,18,0.97)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                overflow: "hidden",
                zIndex: 200,
                boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
              }}
            >
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSuggestionClick(s)}
                  data-ocid={`search.item.${i + 1}`}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    background: "transparent",
                    border: "none",
                    borderBottom:
                      i < suggestions.length - 1
                        ? "1px solid rgba(255,255,255,0.05)"
                        : "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <svg
                    aria-hidden="true"
                    width="11"
                    height="11"
                    fill="#555"
                    viewBox="0 0 24 24"
                  >
                    <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                  </svg>
                  <span
                    style={{
                      fontSize: 11,
                      color: "#d0d0d0",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
