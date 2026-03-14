import { clearApiKey, getApiKey, setApiKey } from "@/lib/youtube";
import { useState } from "react";

interface SettingsPageProps {
  onClearKey: () => void;
}

export function SettingsPage({ onClearKey }: SettingsPageProps) {
  const currentKey = getApiKey();
  const [newKey, setNewKey] = useState("");
  const [saved, setSaved] = useState(false);

  function maskedKey(k: string) {
    if (k.length <= 8) return "•".repeat(8);
    return k.slice(0, 8) + "•".repeat(k.length - 12) + k.slice(-4);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (newKey.trim().length > 5) {
      setApiKey(newKey.trim());
      setSaved(true);
      setNewKey("");
      setTimeout(() => setSaved(false), 3000);
    }
  }

  function handleClear() {
    clearApiKey();
    onClearKey();
  }

  const sectionStyle = {
    background: "#212121",
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 720 }}>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: "#f1f1f1",
          marginBottom: 20,
        }}
      >
        Settings
      </h2>

      <div style={sectionStyle}>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: "#f1f1f1",
            marginBottom: 4,
          }}
        >
          YouTube API Key
        </h3>
        <p style={{ fontSize: 14, color: "#aaa", marginBottom: 16 }}>
          Manage your YouTube Data API v3 key.
        </p>

        {currentKey && (
          <div
            style={{
              background: "#2d2d2d",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>
              Current Key
            </p>
            <p
              style={{
                fontFamily: "monospace",
                fontSize: 14,
                color: "#f1f1f1",
              }}
            >
              {maskedKey(currentKey)}
            </p>
          </div>
        )}

        <form onSubmit={handleSave}>
          <label
            htmlFor="new-api-key"
            style={{
              display: "block",
              fontSize: 14,
              color: "#f1f1f1",
              marginBottom: 8,
            }}
          >
            Update API Key
          </label>
          <input
            id="new-api-key"
            className="w-full px-4 py-3 outline-none"
            style={{
              background: "#121212",
              border: "1px solid #3f3f3f",
              borderRadius: 8,
              color: "#f1f1f1",
              fontSize: 14,
              marginBottom: 12,
            }}
            placeholder="Enter new API key..."
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            data-ocid="settings.api_key.input"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              style={{
                padding: "10px 20px",
                background: "#f1f1f1",
                color: "#0f0f0f",
                border: "none",
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
              data-ocid="settings.save_button"
            >
              Save Key
            </button>
            {saved && (
              <span
                style={{ color: "#4caf50", fontSize: 14 }}
                data-ocid="settings.success_state"
              >
                ✓ Saved successfully
              </span>
            )}
          </div>
        </form>
      </div>

      <div style={sectionStyle}>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: "#f1f1f1",
            marginBottom: 4,
          }}
        >
          Danger Zone
        </h3>
        <p style={{ fontSize: 14, color: "#aaa", marginBottom: 16 }}>
          This will clear your API key and return to setup.
        </p>
        <button
          type="button"
          onClick={handleClear}
          style={{
            padding: "10px 20px",
            background: "transparent",
            color: "#ff5555",
            border: "1px solid rgba(255,85,85,0.4)",
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
          data-ocid="settings.clear_button"
        >
          Clear API Key &amp; Reset
        </button>
      </div>

      <div style={sectionStyle}>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: "#f1f1f1",
            marginBottom: 8,
          }}
        >
          About GlassTube
        </h3>
        <p style={{ fontSize: 14, color: "#aaa", lineHeight: 1.6 }}>
          GlassTube is a YouTube browsing experience. All video playback is
          powered by the YouTube embed player.
        </p>
        <p style={{ fontSize: 13, color: "#717171", marginTop: 12 }}>
          &copy; {new Date().getFullYear()}. Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#3ea6ff", textDecoration: "none" }}
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
