import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { Toaster } from "@/components/ui/sonner";
import { hasApiKey } from "@/lib/youtube";
import { HomePage } from "@/pages/HomePage";
import { SearchPage } from "@/pages/SearchPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SetupPage } from "@/pages/SetupPage";
import { WatchPage } from "@/pages/WatchPage";
import { useCallback, useState } from "react";

type Page =
  | "home"
  | "trending"
  | "music"
  | "gaming"
  | "news"
  | "sports"
  | "settings"
  | "search"
  | "history"
  | "watch";

export default function App() {
  const [apiReady, setApiReady] = useState(hasApiKey);
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [watchId, setWatchId] = useState("");

  const handleNavigate = useCallback((page: string) => {
    setCurrentPage(page as Page);
    if (page !== "search") setSearchQuery("");
    if (page !== "watch") setWatchId("");
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage("search");
    setWatchId("");
  }, []);

  const handleWatch = useCallback((id: string) => {
    setWatchId(id);
    setCurrentPage("watch");
  }, []);

  if (!apiReady) {
    return (
      <>
        <SetupPage onSetup={() => setApiReady(true)} />
        <Toaster />
      </>
    );
  }

  function renderPage() {
    if (currentPage === "watch" && watchId) {
      return <WatchPage videoId={watchId} onWatch={handleWatch} />;
    }
    if (currentPage === "search") {
      return <SearchPage query={searchQuery} onWatch={handleWatch} />;
    }
    if (currentPage === "settings") {
      return <SettingsPage onClearKey={() => setApiReady(false)} />;
    }
    if (currentPage === "history") {
      return (
        <div className="p-8 text-center" style={{ paddingTop: 48 }}>
          <p style={{ color: "#717171", fontSize: 15 }}>
            Watch history coming soon.
          </p>
        </div>
      );
    }
    return <HomePage onWatch={handleWatch} />;
  }

  return (
    <div className="min-h-screen" style={{ background: "#000000" }}>
      <TopBar
        onSearch={handleSearch}
        onNavigate={handleNavigate}
        currentQuery={searchQuery}
      />
      <main
        style={{
          paddingTop: "calc(64px + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
          minHeight: "100vh",
        }}
      >
        {renderPage()}
      </main>
      <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
      <Toaster />
    </div>
  );
}
