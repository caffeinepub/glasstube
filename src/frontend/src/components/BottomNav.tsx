interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const NAV_ITEMS = [
  { id: "home", label: "HOME", icon: HomeIcon },
  { id: "library", label: "LIBRARY", icon: LibraryIcon },
  { id: "history", label: "HISTORY", icon: HistoryIcon },
  { id: "settings", label: "SETTINGS", icon: SettingsIcon },
];

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center w-full" style={{ height: 60 }}>
        {NAV_ITEMS.map((item) => {
          const active =
            currentPage === item.id ||
            (item.id === "home" &&
              ["home", "music", "gaming", "news", "sports"].includes(
                currentPage,
              ));
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onNavigate(item.id)}
              data-ocid={`nav.${item.id}.link`}
              className="flex-1 flex flex-col items-center justify-center gap-1 relative"
              style={{ height: 60 }}
              aria-label={item.label}
            >
              {/* Red top indicator bar */}
              {active && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "20%",
                    width: "60%",
                    height: 3,
                    borderRadius: "0 0 3px 3px",
                    background: "#FF0000",
                  }}
                />
              )}
              <item.icon active={active} />
              <span
                style={{
                  fontSize: 9,
                  fontWeight: active ? 700 : 400,
                  color: active ? "#FF0000" : "#717171",
                  letterSpacing: "0.5px",
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? "#FF0000" : "#717171"}
    >
      {active ? (
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      ) : (
        <path d="M12 5.69l5 4.5V18h-2v-6H9v6H7v-7.81l5-4.5M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" />
      )}
    </svg>
  );
}

function LibraryIcon({ active }: { active?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? "#FF0000" : "#717171"}
    >
      {active ? (
        <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z" />
      ) : (
        <>
          <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z" />
          <path d="M9 9h6v2H9zm0 3h6v2H9zm0-6h6v2H9z" />
        </>
      )}
    </svg>
  );
}

function HistoryIcon({ active }: { active?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? "#FF0000" : "#717171"}
    >
      <path d="M13 3a9 9 0 100 18A9 9 0 0013 3zm0 16a7 7 0 110-14 7 7 0 010 14zm.5-11H12v6l5.25 3.15.75-1.23-4.5-2.67V8z" />
    </svg>
  );
}

function SettingsIcon({ active }: { active?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? "#FF0000" : "#717171"}
    >
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  );
}
