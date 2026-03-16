# Phase 0 Design — iPod Shell + Click Wheel + Haptics + Menu Navigation

> 0Pod · Phase 0 · March 2026
>
> No audio — pure iPod experience: shell, screen, wheel, haptics, menus.

---

## 1. Project Foundation

**Monorepo (Turborepo + pnpm)**

```
0pod/
  ├── apps/
  │   ├── web/                    # React 18 + TypeScript + Vite
  │   │   ├── src/
  │   │   │   ├── components/
  │   │   │   │   ├── iPod/       # Shell, Bezel, LCD screen
  │   │   │   │   ├── ClickWheel/ # Touch wheel + zone detection
  │   │   │   │   ├── Menu/       # Hierarchy + slide transitions
  │   │   │   │   └── StatusBar/  # iPod status bar
  │   │   │   ├── hooks/
  │   │   │   │   ├── useClickWheel.ts
  │   │   │   │   └── useHaptics.ts
  │   │   │   ├── stores/         # Zustand (menu state, settings)
  │   │   │   ├── styles/         # CSS Modules + iPod theme vars
  │   │   │   └── App.tsx
  │   │   ├── public/             # PWA manifest, icons, click sounds
  │   │   └── vite.config.ts
  │   └── server/                 # Fastify (minimal scaffold)
  │       ├── src/
  │       │   └── index.ts        # Hello world + health check
  │       └── package.json
  ├── packages/
  │   ├── shared/                 # Types (Track, Quality, etc.)
  │   └── haptics/                # Haptic pattern library
  ├── turbo.json
  ├── pnpm-workspace.yaml
  └── package.json
```

**Tooling:** TypeScript strict mode, ESLint, Prettier, Vitest, pnpm workspaces, Turborepo.

The server is a stub — `GET /health` returning `{ ok: true }`. Exists so the monorepo structure is ready for Phase 1.

---

## 2. iPod Shell & LCD Screen

### Device Shell

Renders the full iPod Classic 6th gen body. Mobile: fills viewport. Desktop: centered at 1:1.8 aspect ratio with dark ambient background.

- **Bezel:** Brushed aluminum gradient (`#C0C0C0` to `#A8A8A8`) with CSS noise texture overlay at 3% opacity. Corner radius 24px. Subtle drop shadow.
- **Screen inset:** 2px dark border (`#333`), 1px inner shadow simulating recessed glass. Corner radius 8px.
- **Glass reflection:** Pseudo-element with 0.5px semi-transparent white highlight along top edge.

### LCD Screen

Warm, slightly green-tinted LCD — not a modern OLED:

- **Background:** `#E8E6D9` (warm off-white)
- **Pixel grid:** CSS `repeating-linear-gradient` at 2px intervals, 3% opacity, both axes
- **Backlight:** Radial gradient — brighter center, dimmer edges
- **Text rendering:** `-webkit-font-smoothing: none` for chunky pixelated text
- **Color palette:** Dark text `#1A1A1A`, selection highlight `#3B6EA5`, status icons dark grey

### Screen Layout (3 zones)

1. **StatusBar** — fixed top, 20px
2. **Content area** — scrollable menu list
3. No bottom bar — click wheel is physical, below screen

---

## 3. Click Wheel Engine

### Visual Design

- **Outer ring:** White/light grey (`#E8E8E8`) circular area with concentric groove texture
- **Center button:** 30% of wheel radius, slightly raised with inner shadow
- **Labels:** MENU (top), forward (right), back (left), play/pause (bottom) — small grey text/icons
- **Active state:** `scale(0.97)` + reduced shadow. Blue glow `#3B82F6` at 15% on touch.

### Touch Processing (`useClickWheel` hook)

1. `touchstart` — record position, angle from center, determine zone
2. `touchmove` — delta angle → scroll notches (1 notch = 15°), fire haptic tick per notch
3. `touchend` — if movement < 5°, treat as zone tap. Ring: calculate angular velocity, momentum scroll (friction 0.92/frame via `requestAnimationFrame`)

### Zone Detection

| Zone | Region | Action |
|------|--------|--------|
| Center | r < 30% | Select / Play-Pause |
| MENU | Top arc (315°-45°) | Go back |
| Forward | Right arc (45°-135°) | Next track |
| Play/Pause | Bottom arc (135°-225°) | Toggle playback |
| Back | Left arc (225°-315°) | Prev track |

### Performance

Runs outside React render cycle. Touch events update refs + `requestAnimationFrame`. React only re-renders on actual menu item change. Haptic latency < 5ms, 60fps guaranteed.

**Desktop fallback:** Mouse events + scroll wheel mapped to same logic.

---

## 4. Haptic Engine

### Standalone Package (`packages/haptics`)

Pure TypeScript, no framework dependency.

### Device Detection

- Samsung S23 (`/SM-S91[1-6]/`) — optimized fine-grain patterns (min pulse 3ms)
- Generic Android — longer minimum pulse (10ms)
- iOS / unsupported — haptics disabled gracefully

### Pattern Library

| Action | Pattern (ms) | Trigger |
|--------|-------------|---------|
| Wheel tick | `[5]` | Each 15° notch |
| Fast scroll | `[3, 2]` repeating | High angular velocity |
| Menu select | `[12]` | Center tap |
| Menu button | `[8]` | MENU tap |
| Play/Pause | `[15, 30, 15]` | Play zone tap |
| Skip forward | `[5, 20, 10]` | Forward tap |
| Skip backward | `[10, 20, 5]` | Back tap |
| Long press | `[5, 5, 5, 5, 40]` | Hold center > 800ms |
| Volume notch | `[6]` | Wheel on Now Playing |
| Lock toggle | `[20, 40, 20]` | Hold switch |
| Error | `[100]` | Scroll past boundary |
| Song loaded | `[8, 15, 8]` | Track begins (Phase 1) |

### Intensity Scaling

Off (0x) / Light (0.5x) / Medium (1.0x) / Strong (1.5x) — multiplier on all durations, clamped to device min/max.

### API

```typescript
haptics.play('wheelTick');
haptics.setIntensity('medium');
haptics.isSupported();
```

---

## 5. Menu System & Navigation

### Menu Store (Zustand)

Stack-based navigation:

```typescript
menuStack: [
  { id: 'root', items: [...], selectedIndex: 0 },
  { id: 'music', items: [...], selectedIndex: 2 },
]
```

Push on drill-down, pop on MENU press. Cursor position preserved per screen.

### Menu Tree (Phase 0 — static data)

- **Music** → Playlists, Artists, Albums, Songs, Genres, Search → "No music yet"
- **Sources** → YouTube Music, Spotify, SoundCloud, Local Files → "Connect in Phase 1"
- **Now Playing** → Static placeholder with dummy album art
- **Shuffle Songs** → "No songs to shuffle"
- **Downloads** → "No downloads yet"
- **Settings** → Haptics, Display, About (functional)

### Slide Transitions

- **Drill down:** Current slides left, new from right — 250ms ease-in-out, CSS `translateX` only (GPU composited)
- **Go back:** Reverse — same timing
- Managed via CSS classes, not React state

### Scroll Behavior

- Click wheel rotation moves selectedIndex through current menu
- Selected item gets `#3B6EA5` full-width highlight bar
- List scrolls as group when selection exceeds visible area — no visible scrollbar

---

## 6. Status Bar & Settings

### Status Bar

Persistent 20px bar, every screen:

- **Left:** Screen title in bold, truncated with ellipsis
- **Center:** Play state icon — greyed out in Phase 0
- **Right:** Battery (4-segment decorative bar), connection dot (`navigator.onLine`)
- **Lock icon:** Shown when hold switch engaged

### Hold Switch (Lock)

- Long-press MENU zone (800ms+) or settings toggle
- Locked: all input ignored, lock icon shown, `lockToggle` haptic fires
- Unlock: same gesture

### Settings (Functional in Phase 0)

- **Haptics** → Off / Light / Medium / Strong — test vibration on select
- **Display** → Backlight brightness (3 levels), LCD flicker toggle
- **About** → "0Pod v0.1.0"

Settings persisted to `localStorage`, loaded into Zustand on start.

### PWA Manifest

Standalone, portrait locked, iPod icon, dark splash. Installable from Phase 0.

---

## 7. Component Summary

| Component | File | Responsibility |
|-----------|------|---------------|
| `IPodShell` | `components/iPod/IPodShell.tsx` | Bezel, layout, screen + wheel container |
| `LCDScreen` | `components/iPod/LCDScreen.tsx` | LCD effects, pixel grid, backlight |
| `ClickWheel` | `components/ClickWheel/ClickWheel.tsx` | Visual wheel + touch event handling |
| `useClickWheel` | `hooks/useClickWheel.ts` | Touch math, zone detection, momentum |
| `useHaptics` | `hooks/useHaptics.ts` | React wrapper around haptics package |
| `MenuList` | `components/Menu/MenuList.tsx` | Scrollable menu item list |
| `MenuScreen` | `components/Menu/MenuScreen.tsx` | Transition wrapper for slide animations |
| `StatusBar` | `components/StatusBar/StatusBar.tsx` | Title, play state, battery, lock |
| `useMenuStore` | `stores/menuStore.ts` | Zustand stack-based navigation |
| `useSettingsStore` | `stores/settingsStore.ts` | Haptic/display preferences |
| `HapticEngine` | `packages/haptics/src/index.ts` | Device detection, pattern playback |
| `types` | `packages/shared/src/index.ts` | Track, Quality, Provider types |
