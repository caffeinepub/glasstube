interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  collapsed: boolean;
}

const navItems = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "trending", label: "Trending", icon: TrendingIcon },
  { id: "music", label: "Music", icon: MusicIcon },
  { id: "gaming", label: "Gaming", icon: GamingIcon },
  { id: "news", label: "News", icon: NewsIcon },
  { id: "sports", label: "Sports", icon: SportsIcon },
];

const bottomItems = [{ id: "settings", label: "Settings", icon: SettingsIcon }];

export function Sidebar({ currentPage, onNavigate, collapsed }: SidebarProps) {
  if (collapsed) {
    return (
      <aside
        className="fixed left-0 top-14 h-full z-40 flex flex-col pt-3"
        style={{ width: 72, background: "#0f0f0f" }}
      >
        {[...navItems, ...bottomItems].map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onNavigate(item.id)}
            data-ocid={`nav.${item.id}.link`}
            className={`yt-nav-mini ${currentPage === item.id ? "active" : ""}`}
            aria-label={item.label}
          >
            <item.icon active={currentPage === item.id} />
            <span style={{ fontSize: 10 }}>{item.label}</span>
          </button>
        ))}
      </aside>
    );
  }

  return (
    <aside
      className="fixed left-0 top-14 h-full z-40 flex flex-col overflow-y-auto pt-3 pb-4"
      style={{ width: 240, background: "#0f0f0f" }}
    >
      {/* Main nav */}
      <div className="px-3">
        {navItems.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onNavigate(item.id)}
            data-ocid={`nav.${item.id}.link`}
            className={`yt-nav-item ${currentPage === item.id ? "active" : ""}`}
            aria-label={item.label}
          >
            <item.icon active={currentPage === item.id} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: "#3f3f3f", margin: "12px 0" }} />

      {/* Bottom nav */}
      <div className="px-3">
        {bottomItems.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onNavigate(item.id)}
            data-ocid={`nav.${item.id}.link`}
            className={`yt-nav-item ${currentPage === item.id ? "active" : ""}`}
            aria-label={item.label}
          >
            <item.icon active={currentPage === item.id} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div style={{ height: 1, background: "#3f3f3f", margin: "12px 0" }} />

      {/* Footer */}
      <div className="px-4 mt-2">
        <p style={{ fontSize: 12, color: "#717171", lineHeight: 1.8 }}>
          &copy; {new Date().getFullYear()}{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#717171" }}
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </aside>
  );
}

function HomeIcon({ active }: { active?: boolean }) {
  return active ? (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="#f1f1f1"
    >
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="#f1f1f1"
    >
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5zm2-18l8 7.5V20h-3v-6H9v6H6v-10.5L12 2z" />
    </svg>
  );
}

function TrendingIcon({ active: _active }: { active?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="#f1f1f1"
    >
      <path d="M17.2 6.3L13.7 9.8 11 7.1 6 12.1l1.4 1.4 3.6-3.6 2.7 2.7 4.9-4.9L17.2 6.3zM4 18h16v2H4z" />
    </svg>
  );
}

function MusicIcon({ active: _active }: { active?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="#f1f1f1"
    >
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
  );
}

function GamingIcon({ active: _active }: { active?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="#f1f1f1"
    >
      <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H9v2H7v-2H5v-2h2V9h2v2h2v2zm4.5 1c-.83 0-1.5-.67-1.5-1.5S14.67 11 15.5 11s1.5.67 1.5 1.5S16.33 14 15.5 14zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 8 18.5 8s1.5.67 1.5 1.5S19.33 11 18.5 11z" />
    </svg>
  );
}

function NewsIcon({ active: _active }: { active?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="#f1f1f1"
    >
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z" />
    </svg>
  );
}

function SportsIcon({ active: _active }: { active?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="#f1f1f1"
    >
      <path d="M20.56 18H3.44C2.65 16.56 2 14.84 2 13c0-5.52 4.48-10 10-10s10 4.48 10 10c0 1.84-.65 3.56-1.44 5zm-8.56-2l6-8h-3l-3 4-3-4H6l6 8z" />
    </svg>
  );
}

function SettingsIcon({ active: _active }: { active?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="#f1f1f1"
    >
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  );
}
