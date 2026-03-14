import { setApiKey } from "@/lib/youtube";
import { useState } from "react";

interface SetupPageProps {
  onSetup: () => void;
}

export function SetupPage({ onSetup }: SetupPageProps) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed || trimmed.length < 10) {
      setError("Please enter a valid API key.");
      return;
    }
    setApiKey(trimmed);
    onSetup();
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#0f0f0f" }}
    >
      <div
        className="w-full max-w-md animate-fade-in"
        style={{
          background: "#212121",
          borderRadius: 12,
          padding: 32,
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <svg
            aria-hidden="true"
            width="48"
            height="34"
            viewBox="0 0 48 34"
            fill="none"
          >
            <rect width="48" height="34" rx="8" fill="#FF0000" />
            <path d="M20 10L32 17L20 24V10Z" fill="white" />
          </svg>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#f1f1f1",
              letterSpacing: "-0.5px",
            }}
          >
            GlassTube
          </h1>
        </div>

        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "#f1f1f1",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Enter your API Key
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "#aaa",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          A YouTube Data API v3 key is required to load videos.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            id="api-key-input"
            className="w-full px-4 py-3 text-sm outline-none"
            style={{
              background: "#121212",
              border: "1px solid #3f3f3f",
              borderRadius: 8,
              color: "#f1f1f1",
              fontSize: 14,
              marginBottom: 8,
            }}
            placeholder="AIza...your-api-key"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setError("");
            }}
            data-ocid="apikey.setup.input"
          />
          {error && (
            <p
              style={{ color: "#ff5555", fontSize: 13, marginBottom: 8 }}
              data-ocid="apikey.error_state"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full py-3 font-semibold"
            style={{
              background: "#f1f1f1",
              color: "#0f0f0f",
              border: "none",
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            data-ocid="apikey.setup.submit_button"
          >
            Get Started
          </button>
        </form>

        <p
          style={{
            fontSize: 13,
            color: "#717171",
            textAlign: "center",
            marginTop: 20,
          }}
        >
          Don&apos;t have an API key?{" "}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#3ea6ff", textDecoration: "none" }}
          >
            Get one from Google Cloud Console
          </a>
        </p>

        <div
          className="mt-6 space-y-1"
          style={{
            background: "#2d2d2d",
            borderRadius: 8,
            padding: 16,
            fontSize: 13,
            color: "#aaa",
          }}
        >
          <p style={{ fontWeight: 600, color: "#f1f1f1", marginBottom: 8 }}>
            Quick steps:
          </p>
          <p>1. Go to Google Cloud Console</p>
          <p>2. Create a project &amp; enable YouTube Data API v3</p>
          <p>3. Create credentials &rarr; API Key</p>
          <p>4. Paste it above and click Get Started</p>
        </div>
      </div>
    </div>
  );
}
