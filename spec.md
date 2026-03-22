# GlassTube

## Current State
Mobile-first single-column video grid. Header has safe-area padding. index.html already has viewport-fit=cover and iOS meta tags.

## Requested Changes (Diff)

### Add
- Responsive grid: 1-col mobile, 3-col tablet (768px+), 4-col desktop (1280px+)
- Max-width content container on wide screens
- TopBar inner layout constrained to max-width, background stays full-bleed

### Modify
- VideoGrid.tsx: responsive CSS grid
- VideoCard.tsx: work inside grid columns
- TopBar.tsx: max-width inner wrapper
- App.tsx: responsive main padding/max-width

### Remove
- Nothing

## Implementation Plan
1. VideoGrid: CSS grid with responsive columns
2. VideoCard: remove forced full-width so grid columns control width
3. TopBar: max-width inner div on wide viewports, background still full-bleed
4. App.tsx main area: max-width centering
5. index.css: media query helpers for grid
