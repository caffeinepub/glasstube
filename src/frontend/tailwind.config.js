/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Roboto", "sans-serif"],
        display: ["Roboto", "sans-serif"],
      },
      colors: {
        "yt-bg": "#0f0f0f",
        "yt-surface": "#212121",
        "yt-surface2": "#272727",
        "yt-border": "#3f3f3f",
        "yt-text": "#f1f1f1",
        "yt-secondary": "#aaaaaa",
        "yt-red": "#ff0000",
      },
      borderColor: {
        border: "oklch(var(--border))",
      },
      backgroundColor: {
        background: "oklch(var(--background))",
      },
      textColor: {
        foreground: "oklch(var(--foreground))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
