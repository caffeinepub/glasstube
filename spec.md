# GlassTube

## Current State
App uses a flat pure black (`#000000`) background across all pages and surfaces. Header and category bar are solid black. Video cards have a slight glass frosted finish. Bottom nav has a subtle blur. No gradient exists on any surface.

## Requested Changes (Diff)

### Add
- Global dark gradient background: `#000000` (top) → `#0d0305` (bottom) — a near-imperceptible warm charcoal-red, applied to `<body>` and the root app `<div>` via `background-attachment: fixed` so it doesn't scroll
- CSS variable `--app-gradient` for reuse across components

### Modify
- `index.css`: body background changed from `#000000` to the fixed gradient
- `App.tsx` root div: `background` from `#000000` to the gradient
- `TopBar.tsx`: header background changed from `#000000` to `rgba(0,0,0,0.55)` with `backdrop-filter: blur(20px) saturate(180%)` (frosted glass matching bottom nav)
- `BottomNav.tsx`: already has glass — no change needed
- `VideoCard.tsx`: glass effect already present — no change needed, gradient background will show through the blur
- All pages (HomePage, WatchPage, SettingsPage, HistoryPage, SearchPage, ChannelPage, SetupPage, TrendingPage): ensure their container backgrounds are `transparent` or removed so the gradient shows through
- Category bar (inside pages): ensure `background` is `rgba(0,0,0,0.55)` with `backdrop-filter: blur(20px)` for glass feel, not solid black

### Remove
- Solid `#000000` background declarations on the header and category bar surfaces (replace with glass)

## Implementation Plan
1. Update `index.css`: set `body` background to the fixed gradient
2. Update `App.tsx`: root div background to the gradient, or `transparent` with a pseudo-element
3. Update `TopBar.tsx`: switch header `background` from `#000000` to `rgba(0,0,0,0.55)` + `backdrop-filter`
4. Update category bar component(s) in the page files to use glass background instead of solid black
5. Ensure all page containers are `transparent` so gradient bleeds through
