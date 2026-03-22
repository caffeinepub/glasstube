# GlassTube — Version 53

## Current State
Full YouTube-inspired mobile app with: home feed, search (videos only), watch page (4 action buttons: likes, duration, publish date, download), history, trending, settings, miniplayer, responsive tablet/desktop layouts.

## Requested Changes (Diff)

### Add
- `src/frontend/src/lib/library.ts` — localStorage library helpers (save/remove videos & playlists, check saved state)
- `src/frontend/src/pages/LibraryPage.tsx` — Library page showing saved videos and playlists in two tabs
- Playlist search support in `youtube.ts` — `searchPlaylists()` function + `YouTubePlaylist` type

### Modify
- `BottomNav.tsx` — Replace TRENDING with LIBRARY (new library icon)
- `App.tsx` — Add `"library"` to Page type, render LibraryPage, update nav routing
- `SearchPage.tsx` — Add filter tabs: All | Videos | Playlists; filter Shorts (duration ≤ 60s) from Videos tab; show playlist cards in Playlists tab with save-to-library button
- `WatchPage.tsx` — Replace publish date action button with Save/Saved toggle button; connect to library.ts
- `TopBar.tsx` — Fix logo: change `objectFit: contain` → `objectFit: cover` and add `borderRadius: "50%"` to the img element so the image fills the circle cleanly

### Remove
- Nothing removed

## Implementation Plan
1. Create `lib/library.ts` with save/remove/check helpers for videos and playlists using localStorage
2. Create `YouTubePlaylist` interface and `searchPlaylists()` in `youtube.ts`
3. Create `LibraryPage.tsx` with two tabs: Saved Videos | Saved Playlists, with remove buttons
4. Update `BottomNav.tsx`: replace TRENDING item with LIBRARY (bookmark icon)
5. Update `App.tsx`: add `"library"` page type, render LibraryPage for both renderPage and renderBackgroundPage
6. Update `SearchPage.tsx`: add filter tabs (All/Videos/Playlists), filter out shorts in Videos tab, show playlist cards in Playlists tab
7. Update `WatchPage.tsx`: replace publish date button with Save/Saved toggle, use library.ts to persist
8. Update `TopBar.tsx`: fix logo img to use `objectFit: cover` + `borderRadius: 50%` for true circular clip
