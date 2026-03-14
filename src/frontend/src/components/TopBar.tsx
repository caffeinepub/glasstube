import { useRef, useState } from "react";

interface TopBarProps {
  onSearch: (query: string) => void;
  onNavigate: (page: string) => void;
  currentQuery?: string;
}

export function TopBar({ onSearch, onNavigate, currentQuery }: TopBarProps) {
  const [query, setQuery] = useState(currentQuery || "");
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
      <div className="flex items-center px-3 gap-2" style={{ height: 64 }}>
        {/* Logo */}
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="flex items-center gap-1 flex-shrink-0"
          data-ocid="topbar.logo.link"
          aria-label="Go to Home"
        >
          {/* Logo image with 'by Ayush' stacked below it */}
          <div className="flex flex-col items-center" style={{ gap: 1 }}>
            <img
              src="/assets/uploads/IMG_20260314_072526-1.png"
              alt="Modx Logo"
              style={{ width: 36, height: 36, objectFit: "contain" }}
            />
            <span
              style={{
                color: "#aaaaaa",
                fontSize: 9,
                fontWeight: 400,
                letterSpacing: "0.3px",
                lineHeight: 1,
              }}
            >
              by Ayush
            </span>
          </div>
          {/* Brand name */}
          <span
            style={{
              fontFamily: "Roboto, sans-serif",
              letterSpacing: "0.5px",
              marginLeft: 4,
            }}
          >
            <span style={{ color: "#FF0000", fontWeight: 800, fontSize: 18 }}>
              MODX
            </span>
            <span style={{ color: "#ffffff", fontWeight: 800, fontSize: 18 }}>
              TUBE
            </span>
          </span>
        </button>

        {/* Inline search bar */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex items-center"
          style={{
            background: "rgba(255,255,255,0.1)",
            borderRadius: 24,
            height: 40,
            padding: "0 12px",
            gap: 8,
          }}
        >
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-sm text-[#f1f1f1] placeholder-[#888]"
            style={{ fontSize: 14 }}
            placeholder="Search YouTube..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-ocid="search.search_input"
          />
          <button
            type="submit"
            aria-label="Search"
            data-ocid="search.submit_button"
            className="flex-shrink-0"
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              fill="#aaa"
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
