# Phase 0 Implementation Plan — iPod Shell + Click Wheel + Haptics + Menu Navigation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a fully interactive iPod Classic PWA shell with pixel-perfect visuals, click wheel with haptic feedback, and hierarchical menu navigation — no audio.

**Architecture:** Turborepo monorepo with React 18 frontend (Vite), minimal Fastify backend stub, and two shared packages (types + haptics). Click wheel runs outside React render cycle for 60fps performance. Menu navigation uses a Zustand stack-based store. All styling via CSS Modules with iPod-specific custom properties.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, CSS Modules, Vitest, Turborepo, pnpm, Fastify

---

## Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.prettierrc`
- Create: `.eslintrc.json`

**Step 1: Create root package.json**

```json
{
  "name": "0pod",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "format": "prettier --write \"**/*.{ts,tsx,json,css,md}\""
  },
  "devDependencies": {
    "turbo": "^2.4.0",
    "prettier": "^3.5.0",
    "typescript": "^5.7.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

**Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Step 4: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Step 5: Create .gitignore**

```
node_modules/
dist/
.turbo/
*.local
.env
.env.*
```

**Step 6: Create .prettierrc**

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all"
}
```

**Step 7: Install dependencies**

Run: `pnpm install`
Expected: lockfile created, turbo + prettier + typescript installed

**Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold monorepo with Turborepo + pnpm"
```

---

## Task 2: Shared Types Package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types.ts`

**Step 1: Create package.json**

```json
{
  "name": "@0pod/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

**Step 3: Create types.ts**

```typescript
// Music source providers
export type ProviderName = 'youtube' | 'spotify' | 'soundcloud' | 'local';

export interface Track {
  id: string;
  source: ProviderName;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  artworkUrl?: string;
  artworkColors?: {
    primary: string;
    secondary: string;
  };
}

export interface StreamInfo {
  url: string;
  quality: Quality;
  format: 'opus' | 'aac' | 'mp3' | 'ogg' | 'flac';
  bitrate: number;
  expiresAt?: number;
}

export type QualityTier = 'low' | 'normal' | 'high' | 'lossless';

export interface Quality {
  tier: QualityTier;
  bitrate: number;
  format: string;
  estimatedSize?: number;
}

// Menu system types
export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  action?: 'navigate' | 'execute';
  submenuId?: string;
}

export interface MenuScreen {
  id: string;
  title: string;
  items: MenuItem[];
  selectedIndex: number;
}

// Settings types
export type HapticIntensity = 'off' | 'light' | 'medium' | 'strong';
export type BacklightLevel = 'low' | 'medium' | 'high';

export interface Settings {
  hapticIntensity: HapticIntensity;
  backlightLevel: BacklightLevel;
  lcdFlicker: boolean;
}

// Click wheel types
export type WheelZone = 'center' | 'menu' | 'forward' | 'back' | 'playPause' | 'ring';

export interface WheelEvent {
  zone: WheelZone;
  type: 'tap' | 'longPress' | 'rotate';
  direction?: 'cw' | 'ccw';
  notches?: number;
}
```

**Step 4: Create index.ts**

```typescript
export * from './types';
```

**Step 5: Verify build**

Run: `cd packages/shared && pnpm run lint`
Expected: No errors

**Step 6: Commit**

```bash
git add packages/shared
git commit -m "feat: add shared types package with Track, Menu, and Settings types"
```

---

## Task 3: Haptics Package

**Files:**
- Create: `packages/haptics/package.json`
- Create: `packages/haptics/tsconfig.json`
- Create: `packages/haptics/src/index.ts`
- Create: `packages/haptics/src/patterns.ts`
- Create: `packages/haptics/src/engine.ts`
- Create: `packages/haptics/src/__tests__/engine.test.ts`

**Step 1: Create package.json**

```json
{
  "name": "@0pod/haptics",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  },
  "dependencies": {
    "@0pod/shared": "workspace:*"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

**Step 3: Create patterns.ts**

```typescript
export type HapticPatternName =
  | 'wheelTick'
  | 'wheelFastTick'
  | 'menuSelect'
  | 'menuButton'
  | 'playPause'
  | 'skipForward'
  | 'skipBackward'
  | 'longPress'
  | 'volumeNotch'
  | 'lockToggle'
  | 'error'
  | 'songLoaded';

export const HAPTIC_PATTERNS: Record<HapticPatternName, number[]> = {
  wheelTick: [5],
  wheelFastTick: [3, 2],
  menuSelect: [12],
  menuButton: [8],
  playPause: [15, 30, 15],
  skipForward: [5, 20, 10],
  skipBackward: [10, 20, 5],
  longPress: [5, 5, 5, 5, 40],
  volumeNotch: [6],
  lockToggle: [20, 40, 20],
  error: [100],
  songLoaded: [8, 15, 8],
} as const;
```

**Step 4: Create engine.ts**

```typescript
import type { HapticIntensity } from '@0pod/shared';
import { HAPTIC_PATTERNS, type HapticPatternName } from './patterns';

interface DeviceProfile {
  minPulse: number;
  maxPulse: number;
  supportsPattern: boolean;
}

const PROFILES: Record<string, DeviceProfile> = {
  samsung_flagship: { minPulse: 3, maxPulse: 200, supportsPattern: true },
  android_generic: { minPulse: 10, maxPulse: 200, supportsPattern: true },
  unsupported: { minPulse: 0, maxPulse: 0, supportsPattern: false },
};

const INTENSITY_MULTIPLIERS: Record<HapticIntensity, number> = {
  off: 0,
  light: 0.5,
  medium: 1.0,
  strong: 1.5,
};

function detectDevice(): DeviceProfile {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) {
    return PROFILES.unsupported;
  }
  const ua = navigator.userAgent;
  if (/SM-S91[1-6]/.test(ua)) {
    return PROFILES.samsung_flagship;
  }
  if (/Android/.test(ua)) {
    return PROFILES.android_generic;
  }
  return PROFILES.unsupported;
}

export class HapticEngine {
  private profile: DeviceProfile;
  private intensity: HapticIntensity = 'medium';

  constructor() {
    this.profile = detectDevice();
  }

  isSupported(): boolean {
    return this.profile.supportsPattern;
  }

  setIntensity(intensity: HapticIntensity): void {
    this.intensity = intensity;
  }

  getIntensity(): HapticIntensity {
    return this.intensity;
  }

  play(name: HapticPatternName): void {
    if (!this.isSupported() || this.intensity === 'off') return;

    const pattern = HAPTIC_PATTERNS[name];
    const scaled = this.scalePattern(pattern);

    try {
      navigator.vibrate(scaled);
    } catch {
      // Silently fail — haptics are non-critical
    }
  }

  stop(): void {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate(0);
    } catch {
      // Silently fail
    }
  }

  private scalePattern(pattern: number[]): number[] {
    const multiplier = INTENSITY_MULTIPLIERS[this.intensity];
    return pattern.map((duration) => {
      const scaled = Math.round(duration * multiplier);
      return Math.max(this.profile.minPulse, Math.min(this.profile.maxPulse, scaled));
    });
  }
}
```

**Step 5: Create index.ts**

```typescript
export { HapticEngine } from './engine';
export { HAPTIC_PATTERNS, type HapticPatternName } from './patterns';
```

**Step 6: Write tests**

Create `packages/haptics/src/__tests__/engine.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HapticEngine } from '../engine';

// Mock navigator.vibrate
const mockVibrate = vi.fn(() => true);

beforeEach(() => {
  vi.stubGlobal('navigator', {
    vibrate: mockVibrate,
    userAgent: 'Android SM-S911B',
  });
  mockVibrate.mockClear();
});

describe('HapticEngine', () => {
  it('detects Samsung S23 as supported', () => {
    const engine = new HapticEngine();
    expect(engine.isSupported()).toBe(true);
  });

  it('plays a pattern via navigator.vibrate', () => {
    const engine = new HapticEngine();
    engine.play('wheelTick');
    expect(mockVibrate).toHaveBeenCalledWith([5]);
  });

  it('scales pattern with light intensity (0.5x)', () => {
    const engine = new HapticEngine();
    engine.setIntensity('light');
    engine.play('menuSelect');
    // 12 * 0.5 = 6, clamped to min 3
    expect(mockVibrate).toHaveBeenCalledWith([6]);
  });

  it('scales pattern with strong intensity (1.5x)', () => {
    const engine = new HapticEngine();
    engine.setIntensity('strong');
    engine.play('menuSelect');
    // 12 * 1.5 = 18
    expect(mockVibrate).toHaveBeenCalledWith([18]);
  });

  it('does not vibrate when intensity is off', () => {
    const engine = new HapticEngine();
    engine.setIntensity('off');
    engine.play('wheelTick');
    expect(mockVibrate).not.toHaveBeenCalled();
  });

  it('clamps to device min pulse', () => {
    const engine = new HapticEngine();
    engine.setIntensity('light');
    engine.play('wheelFastTick');
    // [3, 2] * 0.5 = [1.5, 1] → clamped to [3, 3] (samsung min is 3)
    expect(mockVibrate).toHaveBeenCalledWith([3, 3]);
  });

  it('stops vibration', () => {
    const engine = new HapticEngine();
    engine.stop();
    expect(mockVibrate).toHaveBeenCalledWith(0);
  });
});
```

**Step 7: Run tests**

Run: `cd packages/haptics && pnpm run test`
Expected: All 7 tests pass

**Step 8: Commit**

```bash
git add packages/haptics
git commit -m "feat: add haptics package with pattern library, device detection, and intensity scaling"
```

---

## Task 4: Server Stub

**Files:**
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/src/index.ts`

**Step 1: Create package.json**

```json
{
  "name": "@0pod/server",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "fastify": "^5.2.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.19.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

**Step 3: Create src/index.ts**

```typescript
import Fastify from 'fastify';

const server = Fastify({ logger: true });

server.get('/health', async () => {
  return { ok: true, version: '0.1.0' };
});

const start = async () => {
  try {
    await server.listen({ port: 3001, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
```

**Step 4: Verify it compiles**

Run: `cd apps/server && pnpm run lint`
Expected: No errors

**Step 5: Commit**

```bash
git add apps/server
git commit -m "feat: add Fastify server stub with health endpoint"
```

---

## Task 5: Web App Scaffold

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tsconfig.node.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/vite-env.d.ts`
- Create: `apps/web/src/styles/global.css`
- Create: `apps/web/src/styles/ipod-theme.css`
- Create: `apps/web/public/manifest.json`

**Step 1: Create package.json**

```json
{
  "name": "@0pod/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^5.0.0",
    "@0pod/shared": "workspace:*",
    "@0pod/haptics": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.7.0",
    "vite": "^6.2.0",
    "vitest": "^3.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Step 3: Create tsconfig.node.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

**Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
});
```

**Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#C0C0C0" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="manifest" href="/manifest.json" />
    <title>0Pod</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 6: Create src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />
```

**Step 7: Create src/styles/ipod-theme.css**

```css
:root {
  /* Bezel */
  --ipod-bezel-light: #C0C0C0;
  --ipod-bezel-dark: #A8A8A8;
  --ipod-bezel-radius: 24px;
  --ipod-screen-radius: 8px;
  --ipod-screen-border: #333333;

  /* LCD Screen */
  --ipod-lcd-bg: #E8E6D9;
  --ipod-lcd-text: #1A1A1A;
  --ipod-lcd-highlight: #3B6EA5;
  --ipod-lcd-highlight-text: #FFFFFF;
  --ipod-lcd-icon: #555555;

  /* Click Wheel */
  --ipod-wheel-bg: #E8E8E8;
  --ipod-wheel-center: #F0F0F0;
  --ipod-wheel-label: #888888;
  --ipod-wheel-glow: rgba(59, 130, 246, 0.15);

  /* Status Bar */
  --ipod-status-height: 20px;

  /* Transitions */
  --ipod-transition-duration: 250ms;
  --ipod-transition-easing: ease-in-out;

  /* Backlight levels */
  --ipod-backlight-opacity: 1;
}

[data-backlight="low"] {
  --ipod-backlight-opacity: 0.6;
}

[data-backlight="medium"] {
  --ipod-backlight-opacity: 0.8;
}

[data-backlight="high"] {
  --ipod-backlight-opacity: 1;
}
```

**Step 8: Create src/styles/global.css**

```css
@import './ipod-theme.css';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  user-select: none;
}

html, body, #root {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #1A1A1A;
  font-family: 'Chicago', 'Geneva', 'Helvetica Neue', Helvetica, sans-serif;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: unset;
}

body {
  position: fixed;
  touch-action: none;
  overscroll-behavior: none;
}
```

**Step 9: Create src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

**Step 10: Create src/App.tsx (placeholder)**

```tsx
export function App() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <p style={{ color: '#C0C0C0', fontSize: '14px' }}>0Pod loading...</p>
    </div>
  );
}
```

**Step 11: Create public/manifest.json**

```json
{
  "name": "0Pod",
  "short_name": "0Pod",
  "description": "Zero Limits. All Music.",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#C0C0C0",
  "background_color": "#1A1A1A",
  "icons": []
}
```

**Step 12: Install all dependencies**

Run: `cd <root> && pnpm install`
Expected: All workspaces resolved

**Step 13: Verify dev server starts**

Run: `cd apps/web && pnpm run dev`
Expected: Vite dev server running on port 3000

**Step 14: Commit**

```bash
git add apps/web
git commit -m "feat: scaffold React web app with Vite, PWA manifest, and iPod theme variables"
```

---

## Task 6: Zustand Stores (Menu + Settings)

**Files:**
- Create: `apps/web/src/stores/menuStore.ts`
- Create: `apps/web/src/stores/settingsStore.ts`
- Create: `apps/web/src/stores/menuData.ts`
- Create: `apps/web/src/stores/__tests__/menuStore.test.ts`
- Create: `apps/web/src/stores/__tests__/settingsStore.test.ts`

**Step 1: Create menuData.ts — static menu tree**

```typescript
import type { MenuItem, MenuScreen } from '@0pod/shared';

const menuItems: Record<string, MenuItem[]> = {
  root: [
    { id: 'music', label: 'Music', action: 'navigate', submenuId: 'music' },
    { id: 'sources', label: 'Sources', action: 'navigate', submenuId: 'sources' },
    { id: 'nowPlaying', label: 'Now Playing', action: 'navigate', submenuId: 'nowPlaying' },
    { id: 'shuffle', label: 'Shuffle Songs', action: 'execute' },
    { id: 'downloads', label: 'Downloads', action: 'navigate', submenuId: 'downloads' },
    { id: 'settings', label: 'Settings', action: 'navigate', submenuId: 'settings' },
  ],
  music: [
    { id: 'playlists', label: 'Playlists', action: 'navigate', submenuId: 'placeholder' },
    { id: 'artists', label: 'Artists', action: 'navigate', submenuId: 'placeholder' },
    { id: 'albums', label: 'Albums', action: 'navigate', submenuId: 'placeholder' },
    { id: 'songs', label: 'Songs', action: 'navigate', submenuId: 'placeholder' },
    { id: 'genres', label: 'Genres', action: 'navigate', submenuId: 'placeholder' },
    { id: 'search', label: 'Search', action: 'navigate', submenuId: 'placeholder' },
  ],
  sources: [
    { id: 'youtube', label: 'YouTube Music', action: 'navigate', submenuId: 'comingSoon' },
    { id: 'spotify', label: 'Spotify', action: 'navigate', submenuId: 'comingSoon' },
    { id: 'soundcloud', label: 'SoundCloud', action: 'navigate', submenuId: 'comingSoon' },
    { id: 'localFiles', label: 'Local Files', action: 'navigate', submenuId: 'comingSoon' },
  ],
  settings: [
    { id: 'haptics', label: 'Haptics', action: 'navigate', submenuId: 'settingsHaptics' },
    { id: 'display', label: 'Display', action: 'navigate', submenuId: 'settingsDisplay' },
    { id: 'about', label: 'About', action: 'navigate', submenuId: 'settingsAbout' },
  ],
  settingsHaptics: [
    { id: 'haptic-off', label: 'Off', action: 'execute' },
    { id: 'haptic-light', label: 'Light', action: 'execute' },
    { id: 'haptic-medium', label: 'Medium', action: 'execute' },
    { id: 'haptic-strong', label: 'Strong', action: 'execute' },
  ],
  settingsDisplay: [
    { id: 'backlight-low', label: 'Backlight: Low', action: 'execute' },
    { id: 'backlight-medium', label: 'Backlight: Medium', action: 'execute' },
    { id: 'backlight-high', label: 'Backlight: High', action: 'execute' },
    { id: 'flicker-toggle', label: 'LCD Flicker: Off', action: 'execute' },
  ],
  settingsAbout: [
    { id: 'version', label: '0Pod v0.1.0', action: 'execute' },
    { id: 'phase', label: 'Phase 0 — Shell Only', action: 'execute' },
  ],
  placeholder: [
    { id: 'empty', label: 'No music yet', action: 'execute' },
  ],
  comingSoon: [
    { id: 'soon', label: 'Connect in Phase 1', action: 'execute' },
  ],
  nowPlaying: [
    { id: 'noTrack', label: 'No track playing', action: 'execute' },
  ],
  downloads: [
    { id: 'noDownloads', label: 'No downloads yet', action: 'execute' },
  ],
};

const MENU_TITLES: Record<string, string> = {
  root: '0Pod',
  music: 'Music',
  sources: 'Sources',
  settings: 'Settings',
  settingsHaptics: 'Haptics',
  settingsDisplay: 'Display',
  settingsAbout: 'About',
  placeholder: 'Music',
  comingSoon: 'Sources',
  nowPlaying: 'Now Playing',
  downloads: 'Downloads',
};

export function getMenuScreen(id: string): MenuScreen {
  return {
    id,
    title: MENU_TITLES[id] || id,
    items: menuItems[id] || menuItems.placeholder,
    selectedIndex: 0,
  };
}
```

**Step 2: Create menuStore.ts**

```typescript
import { create } from 'zustand';
import type { MenuScreen } from '@0pod/shared';
import { getMenuScreen } from './menuData';

interface MenuState {
  stack: MenuScreen[];
  transitionDirection: 'forward' | 'back' | null;

  // Getters
  currentScreen: () => MenuScreen;
  currentTitle: () => string;
  canGoBack: () => boolean;

  // Actions
  navigate: (submenuId: string) => void;
  goBack: () => void;
  scrollUp: () => void;
  scrollDown: () => void;
  select: () => MenuItem | undefined;
}

import type { MenuItem } from '@0pod/shared';

export const useMenuStore = create<MenuState>((set, get) => ({
  stack: [getMenuScreen('root')],
  transitionDirection: null,

  currentScreen: () => {
    const { stack } = get();
    return stack[stack.length - 1];
  },

  currentTitle: () => {
    return get().currentScreen().title;
  },

  canGoBack: () => {
    return get().stack.length > 1;
  },

  navigate: (submenuId: string) => {
    const screen = getMenuScreen(submenuId);
    set((state) => ({
      stack: [...state.stack, screen],
      transitionDirection: 'forward',
    }));
  },

  goBack: () => {
    if (!get().canGoBack()) return;
    set((state) => ({
      stack: state.stack.slice(0, -1),
      transitionDirection: 'back',
    }));
  },

  scrollUp: () => {
    set((state) => {
      const stack = [...state.stack];
      const current = { ...stack[stack.length - 1] };
      if (current.selectedIndex > 0) {
        current.selectedIndex -= 1;
        stack[stack.length - 1] = current;
      }
      return { stack };
    });
  },

  scrollDown: () => {
    set((state) => {
      const stack = [...state.stack];
      const current = { ...stack[stack.length - 1] };
      if (current.selectedIndex < current.items.length - 1) {
        current.selectedIndex += 1;
        stack[stack.length - 1] = current;
      }
      return { stack };
    });
  },

  select: () => {
    const screen = get().currentScreen();
    const item = screen.items[screen.selectedIndex];
    if (item?.action === 'navigate' && item.submenuId) {
      get().navigate(item.submenuId);
    }
    return item;
  },
}));
```

**Step 3: Create settingsStore.ts**

```typescript
import { create } from 'zustand';
import type { HapticIntensity, BacklightLevel, Settings } from '@0pod/shared';

const STORAGE_KEY = '0pod-settings';

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore parse errors
  }
  return {
    hapticIntensity: 'medium',
    backlightLevel: 'high',
    lcdFlicker: false,
  };
}

function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

interface SettingsState extends Settings {
  isLocked: boolean;
  setHapticIntensity: (intensity: HapticIntensity) => void;
  setBacklightLevel: (level: BacklightLevel) => void;
  toggleLcdFlicker: () => void;
  toggleLock: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const initial = loadSettings();
  return {
    ...initial,
    isLocked: false,

    setHapticIntensity: (hapticIntensity) => {
      set({ hapticIntensity });
      saveSettings({ ...get(), hapticIntensity });
    },

    setBacklightLevel: (backlightLevel) => {
      set({ backlightLevel });
      saveSettings({ ...get(), backlightLevel });
    },

    toggleLcdFlicker: () => {
      const lcdFlicker = !get().lcdFlicker;
      set({ lcdFlicker });
      saveSettings({ ...get(), lcdFlicker });
    },

    toggleLock: () => {
      set((state) => ({ isLocked: !state.isLocked }));
    },
  };
});
```

**Step 4: Write menu store tests**

Create `apps/web/src/stores/__tests__/menuStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useMenuStore } from '../menuStore';

beforeEach(() => {
  useMenuStore.setState({
    stack: [{ id: 'root', title: '0Pod', items: [
      { id: 'music', label: 'Music', action: 'navigate', submenuId: 'music' },
      { id: 'sources', label: 'Sources', action: 'navigate', submenuId: 'sources' },
      { id: 'settings', label: 'Settings', action: 'navigate', submenuId: 'settings' },
    ], selectedIndex: 0 }],
    transitionDirection: null,
  });
});

describe('useMenuStore', () => {
  it('starts at root screen', () => {
    const screen = useMenuStore.getState().currentScreen();
    expect(screen.id).toBe('root');
  });

  it('navigates forward to a submenu', () => {
    useMenuStore.getState().navigate('music');
    const screen = useMenuStore.getState().currentScreen();
    expect(screen.id).toBe('music');
    expect(useMenuStore.getState().stack.length).toBe(2);
    expect(useMenuStore.getState().transitionDirection).toBe('forward');
  });

  it('goes back to previous screen', () => {
    useMenuStore.getState().navigate('music');
    useMenuStore.getState().goBack();
    const screen = useMenuStore.getState().currentScreen();
    expect(screen.id).toBe('root');
    expect(useMenuStore.getState().transitionDirection).toBe('back');
  });

  it('does not go back past root', () => {
    useMenuStore.getState().goBack();
    expect(useMenuStore.getState().stack.length).toBe(1);
  });

  it('scrolls down through items', () => {
    useMenuStore.getState().scrollDown();
    expect(useMenuStore.getState().currentScreen().selectedIndex).toBe(1);
  });

  it('scrolls up through items', () => {
    useMenuStore.getState().scrollDown();
    useMenuStore.getState().scrollUp();
    expect(useMenuStore.getState().currentScreen().selectedIndex).toBe(0);
  });

  it('does not scroll past boundaries', () => {
    useMenuStore.getState().scrollUp();
    expect(useMenuStore.getState().currentScreen().selectedIndex).toBe(0);
  });

  it('selects a navigable item and drills down', () => {
    useMenuStore.getState().select();
    expect(useMenuStore.getState().currentScreen().id).toBe('music');
  });
});
```

**Step 5: Write settings store tests**

Create `apps/web/src/stores/__tests__/settingsStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from '../settingsStore';

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
  });
  useSettingsStore.setState({
    hapticIntensity: 'medium',
    backlightLevel: 'high',
    lcdFlicker: false,
    isLocked: false,
  });
});

describe('useSettingsStore', () => {
  it('has sensible defaults', () => {
    const state = useSettingsStore.getState();
    expect(state.hapticIntensity).toBe('medium');
    expect(state.backlightLevel).toBe('high');
    expect(state.lcdFlicker).toBe(false);
    expect(state.isLocked).toBe(false);
  });

  it('updates haptic intensity', () => {
    useSettingsStore.getState().setHapticIntensity('strong');
    expect(useSettingsStore.getState().hapticIntensity).toBe('strong');
  });

  it('updates backlight level', () => {
    useSettingsStore.getState().setBacklightLevel('low');
    expect(useSettingsStore.getState().backlightLevel).toBe('low');
  });

  it('toggles LCD flicker', () => {
    useSettingsStore.getState().toggleLcdFlicker();
    expect(useSettingsStore.getState().lcdFlicker).toBe(true);
    useSettingsStore.getState().toggleLcdFlicker();
    expect(useSettingsStore.getState().lcdFlicker).toBe(false);
  });

  it('toggles lock state', () => {
    useSettingsStore.getState().toggleLock();
    expect(useSettingsStore.getState().isLocked).toBe(true);
  });
});
```

**Step 6: Run tests**

Run: `cd apps/web && pnpm run test`
Expected: All tests pass

**Step 7: Commit**

```bash
git add apps/web/src/stores
git commit -m "feat: add Zustand stores for menu navigation and settings persistence"
```

---

## Task 7: iPod Shell & LCD Screen Components

**Files:**
- Create: `apps/web/src/components/iPod/IPodShell.tsx`
- Create: `apps/web/src/components/iPod/IPodShell.module.css`
- Create: `apps/web/src/components/iPod/LCDScreen.tsx`
- Create: `apps/web/src/components/iPod/LCDScreen.module.css`

**Step 1: Create IPodShell.module.css**

```css
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #1A1A1A;
}

.shell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 380px;
  height: 100%;
  max-height: 684px;
  background: linear-gradient(180deg, var(--ipod-bezel-light) 0%, var(--ipod-bezel-dark) 100%);
  border-radius: var(--ipod-bezel-radius);
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    inset 0 -1px 0 rgba(0, 0, 0, 0.15);
  padding: 24px 20px 20px;
  overflow: hidden;
}

/* Noise texture overlay for brushed aluminum effect */
.shell::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--ipod-bezel-radius);
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  background-size: 128px 128px;
  pointer-events: none;
  z-index: 1;
}

.screenArea {
  width: 100%;
  flex: 0 0 auto;
  aspect-ratio: 4 / 3;
  margin-bottom: 16px;
  position: relative;
  z-index: 2;
}

.wheelArea {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  position: relative;
  z-index: 2;
}

/* Desktop: constrain to iPod proportions */
@media (min-width: 768px) {
  .shell {
    height: auto;
    aspect-ratio: 1 / 1.8;
    border-radius: var(--ipod-bezel-radius);
  }
}

/* Mobile: fill viewport */
@media (max-width: 767px) {
  .shell {
    max-width: 100%;
    max-height: 100%;
    border-radius: 0;
  }
}
```

**Step 2: Create IPodShell.tsx**

```tsx
import type { ReactNode } from 'react';
import styles from './IPodShell.module.css';

interface IPodShellProps {
  screen: ReactNode;
  wheel: ReactNode;
}

export function IPodShell({ screen, wheel }: IPodShellProps) {
  return (
    <div className={styles.container}>
      <div className={styles.shell}>
        <div className={styles.screenArea}>{screen}</div>
        <div className={styles.wheelArea}>{wheel}</div>
      </div>
    </div>
  );
}
```

**Step 3: Create LCDScreen.module.css**

```css
.screen {
  width: 100%;
  height: 100%;
  background-color: var(--ipod-lcd-bg);
  border: 2px solid var(--ipod-screen-border);
  border-radius: var(--ipod-screen-radius);
  box-shadow:
    inset 0 1px 3px rgba(0, 0, 0, 0.3),
    inset 0 0 1px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Pixel grid overlay */
.screen::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 1px,
      rgba(0, 0, 0, 0.03) 1px,
      rgba(0, 0, 0, 0.03) 2px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 1px,
      rgba(0, 0, 0, 0.03) 1px,
      rgba(0, 0, 0, 0.03) 2px
    );
  pointer-events: none;
  z-index: 3;
}

/* Glass reflection highlight */
.screen::after {
  content: '';
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.5) 30%,
    rgba(255, 255, 255, 0.5) 70%,
    transparent 100%
  );
  z-index: 4;
}

/* Backlight effect */
.backlight {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    rgba(255, 255, 255, 0.08) 0%,
    transparent 70%
  );
  opacity: var(--ipod-backlight-opacity);
  pointer-events: none;
  z-index: 2;
}

/* LCD flicker effect */
.flicker {
  animation: lcdFlicker 16.67ms infinite alternate;
}

@keyframes lcdFlicker {
  from { opacity: var(--ipod-backlight-opacity); }
  to { opacity: calc(var(--ipod-backlight-opacity) - 0.005); }
}

.content {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  color: var(--ipod-lcd-text);
  font-size: 13px;
  line-height: 1.3;
}
```

**Step 4: Create LCDScreen.tsx**

```tsx
import type { ReactNode } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import styles from './LCDScreen.module.css';

interface LCDScreenProps {
  children: ReactNode;
}

export function LCDScreen({ children }: LCDScreenProps) {
  const backlightLevel = useSettingsStore((s) => s.backlightLevel);
  const lcdFlicker = useSettingsStore((s) => s.lcdFlicker);

  return (
    <div className={styles.screen} data-backlight={backlightLevel}>
      <div className={`${styles.backlight} ${lcdFlicker ? styles.flicker : ''}`} />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add apps/web/src/components/iPod
git commit -m "feat: add IPodShell and LCDScreen components with pixel-perfect LCD effects"
```

---

## Task 8: Status Bar Component

**Files:**
- Create: `apps/web/src/components/StatusBar/StatusBar.tsx`
- Create: `apps/web/src/components/StatusBar/StatusBar.module.css`

**Step 1: Create StatusBar.module.css**

```css
.statusBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--ipod-status-height);
  padding: 0 6px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 11px;
  font-weight: bold;
  color: var(--ipod-lcd-text);
  flex-shrink: 0;
}

.left {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.center {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--ipod-lcd-icon);
}

.right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.playIcon {
  font-size: 9px;
  opacity: 0.4;
}

.lockIcon {
  font-size: 9px;
}

/* Battery segments */
.battery {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1px solid var(--ipod-lcd-text);
  border-radius: 2px;
  padding: 1px;
  height: 10px;
  width: 20px;
}

.battery::after {
  content: '';
  width: 2px;
  height: 6px;
  background: var(--ipod-lcd-text);
  border-radius: 0 1px 1px 0;
  margin-left: 1px;
}

.batterySegment {
  flex: 1;
  height: 100%;
  background: var(--ipod-lcd-text);
  margin-right: 1px;
}

.batterySegment:last-child {
  margin-right: 0;
}

/* Connection dot */
.connectionDot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ipod-lcd-text);
}

.connectionDot.offline {
  background: transparent;
  border: 1px solid var(--ipod-lcd-text);
}
```

**Step 2: Create StatusBar.tsx**

```tsx
import { useEffect, useState } from 'react';
import { useMenuStore } from '../../stores/menuStore';
import { useSettingsStore } from '../../stores/settingsStore';
import styles from './StatusBar.module.css';

export function StatusBar() {
  const title = useMenuStore((s) => s.currentTitle());
  const isLocked = useSettingsStore((s) => s.isLocked);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={styles.statusBar}>
      <div className={styles.left}>{title}</div>
      <div className={styles.center}>
        <span className={styles.playIcon}>▶</span>
        {isLocked && <span className={styles.lockIcon}>🔒</span>}
      </div>
      <div className={styles.right}>
        <div className={`${styles.connectionDot} ${!isOnline ? styles.offline : ''}`} />
        <div className={styles.battery}>
          <div className={styles.batterySegment} />
          <div className={styles.batterySegment} />
          <div className={styles.batterySegment} />
          <div className={styles.batterySegment} />
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/StatusBar
git commit -m "feat: add StatusBar with title, battery, connection status, and lock indicator"
```

---

## Task 9: Menu Components (List + Transitions)

**Files:**
- Create: `apps/web/src/components/Menu/MenuList.tsx`
- Create: `apps/web/src/components/Menu/MenuList.module.css`
- Create: `apps/web/src/components/Menu/MenuScreen.tsx`
- Create: `apps/web/src/components/Menu/MenuScreen.module.css`

**Step 1: Create MenuList.module.css**

```css
.list {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  font-size: 13px;
  color: var(--ipod-lcd-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 22px;
}

.item.selected {
  background-color: var(--ipod-lcd-highlight);
  color: var(--ipod-lcd-highlight-text);
}

.arrow {
  font-size: 10px;
  opacity: 0.6;
}

.item.selected .arrow {
  opacity: 1;
}
```

**Step 2: Create MenuList.tsx**

```tsx
import { useEffect, useRef } from 'react';
import type { MenuItem } from '@0pod/shared';
import styles from './MenuList.module.css';

interface MenuListProps {
  items: MenuItem[];
  selectedIndex: number;
}

export function MenuList({ items, selectedIndex }: MenuListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  return (
    <div className={styles.list} ref={listRef}>
      {items.map((item, index) => (
        <div
          key={item.id}
          ref={index === selectedIndex ? selectedRef : undefined}
          className={`${styles.item} ${index === selectedIndex ? styles.selected : ''}`}
        >
          <span>{item.label}</span>
          {item.action === 'navigate' && <span className={styles.arrow}>▶</span>}
        </div>
      ))}
    </div>
  );
}
```

**Step 3: Create MenuScreen.module.css**

```css
.screenContainer {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.screenWrapper {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
}

/* Slide transitions */
.slideEnterForward {
  animation: slideInFromRight var(--ipod-transition-duration) var(--ipod-transition-easing) forwards;
}

.slideExitForward {
  animation: slideOutToLeft var(--ipod-transition-duration) var(--ipod-transition-easing) forwards;
}

.slideEnterBack {
  animation: slideInFromLeft var(--ipod-transition-duration) var(--ipod-transition-easing) forwards;
}

.slideExitBack {
  animation: slideOutToRight var(--ipod-transition-duration) var(--ipod-transition-easing) forwards;
}

@keyframes slideInFromRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes slideOutToLeft {
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
}

@keyframes slideInFromLeft {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

@keyframes slideOutToRight {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}
```

**Step 4: Create MenuScreen.tsx**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useMenuStore } from '../../stores/menuStore';
import { MenuList } from './MenuList';
import styles from './MenuScreen.module.css';

interface ScreenState {
  id: string;
  items: { id: string; label: string; action?: string; submenuId?: string }[];
  selectedIndex: number;
  className: string;
}

export function MenuScreen() {
  const stack = useMenuStore((s) => s.stack);
  const direction = useMenuStore((s) => s.transitionDirection);
  const current = stack[stack.length - 1];
  const [screens, setScreens] = useState<ScreenState[]>([
    { ...current, className: '' },
  ]);
  const prevStackLenRef = useRef(stack.length);

  useEffect(() => {
    const prevLen = prevStackLenRef.current;
    prevStackLenRef.current = stack.length;

    if (direction === 'forward' && stack.length > prevLen) {
      // Entering: new screen slides in from right, old slides out left
      const prev = stack[stack.length - 2];
      setScreens([
        { ...prev, className: styles.slideExitForward },
        { ...current, className: styles.slideEnterForward },
      ]);
    } else if (direction === 'back' && stack.length < prevLen) {
      // Going back: old screen slides in from left, current slides out right
      setScreens((prev) => {
        const exiting = prev[prev.length - 1];
        return [
          { ...current, className: styles.slideEnterBack },
          { ...exiting, className: styles.slideExitBack },
        ];
      });
    } else {
      setScreens([{ ...current, className: '' }]);
    }

    // Clean up after animation
    const timer = setTimeout(() => {
      setScreens([{ ...current, className: '' }]);
    }, 250);

    return () => clearTimeout(timer);
  }, [stack, direction, current]);

  return (
    <div className={styles.screenContainer}>
      {screens.map((screen, i) => (
        <div key={`${screen.id}-${i}`} className={`${styles.screenWrapper} ${screen.className}`}>
          <MenuList items={screen.items} selectedIndex={screen.selectedIndex} />
        </div>
      ))}
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add apps/web/src/components/Menu
git commit -m "feat: add MenuList and MenuScreen with iPod slide transitions"
```

---

## Task 10: Click Wheel Component + Hook

**Files:**
- Create: `apps/web/src/hooks/useClickWheel.ts`
- Create: `apps/web/src/hooks/useHaptics.ts`
- Create: `apps/web/src/components/ClickWheel/ClickWheel.tsx`
- Create: `apps/web/src/components/ClickWheel/ClickWheel.module.css`

**Step 1: Create useHaptics.ts**

```typescript
import { useRef, useCallback } from 'react';
import { HapticEngine, type HapticPatternName } from '@0pod/haptics';
import { useSettingsStore } from '../stores/settingsStore';

export function useHaptics() {
  const engineRef = useRef<HapticEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new HapticEngine();
  }

  const intensity = useSettingsStore((s) => s.hapticIntensity);
  engineRef.current.setIntensity(intensity);

  const play = useCallback((pattern: HapticPatternName) => {
    engineRef.current?.play(pattern);
  }, []);

  const isSupported = useCallback(() => {
    return engineRef.current?.isSupported() ?? false;
  }, []);

  return { play, isSupported };
}
```

**Step 2: Create useClickWheel.ts**

```typescript
import { useRef, useCallback, useEffect } from 'react';
import type { WheelZone } from '@0pod/shared';

const NOTCH_ANGLE = Math.PI / 12; // 15 degrees
const FRICTION = 0.92;
const MIN_VELOCITY = 0.002;
const TAP_THRESHOLD = Math.PI / 36; // 5 degrees
const LONG_PRESS_MS = 800;

interface WheelCallbacks {
  onRotate: (direction: 'cw' | 'ccw', notches: number) => void;
  onZoneTap: (zone: WheelZone) => void;
  onLongPress: (zone: WheelZone) => void;
}

function getAngle(x: number, y: number, cx: number, cy: number): number {
  return Math.atan2(y - cy, x - cx);
}

function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

function detectZone(x: number, y: number, cx: number, cy: number, radius: number): WheelZone {
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

  // Center button
  if (dist < radius * 0.3) return 'center';

  // Outside the wheel
  if (dist > radius) return 'ring';

  // Determine arc zone by angle
  const angle = getAngle(x, y, cx, cy);
  const degrees = ((angle * 180) / Math.PI + 360) % 360;

  if (degrees >= 315 || degrees < 45) return 'forward';   // right
  if (degrees >= 45 && degrees < 135) return 'playPause';  // bottom
  if (degrees >= 135 && degrees < 225) return 'back';      // left
  return 'menu'; // top (225-315)
}

export function useClickWheel(
  wheelRef: React.RefObject<HTMLDivElement | null>,
  callbacks: WheelCallbacks,
) {
  const stateRef = useRef({
    active: false,
    startAngle: 0,
    prevAngle: 0,
    totalAngle: 0,
    zone: 'ring' as WheelZone,
    longPressTimer: null as ReturnType<typeof setTimeout> | null,
    momentumVelocity: 0,
    momentumRaf: 0,
    accumulatedNotches: 0,
  });

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const getCenter = useCallback(() => {
    const el = wheelRef.current;
    if (!el) return { cx: 0, cy: 0, radius: 0 };
    const rect = el.getBoundingClientRect();
    return {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      radius: rect.width / 2,
    };
  }, [wheelRef]);

  const startMomentum = useCallback((velocity: number) => {
    const state = stateRef.current;
    state.momentumVelocity = velocity;

    const step = () => {
      state.momentumVelocity *= FRICTION;
      if (Math.abs(state.momentumVelocity) < MIN_VELOCITY) return;

      state.accumulatedNotches += state.momentumVelocity;
      const notches = Math.floor(Math.abs(state.accumulatedNotches));
      if (notches > 0) {
        const dir = state.momentumVelocity > 0 ? 'cw' : 'ccw';
        callbacksRef.current.onRotate(dir, notches);
        state.accumulatedNotches -= notches * Math.sign(state.accumulatedNotches);
      }

      state.momentumRaf = requestAnimationFrame(step);
    };
    state.momentumRaf = requestAnimationFrame(step);
  }, []);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    const { cx, cy, radius } = getCenter();
    const state = stateRef.current;

    cancelAnimationFrame(state.momentumRaf);

    const angle = getAngle(clientX, clientY, cx, cy);
    const zone = detectZone(clientX, clientY, cx, cy, radius);

    state.active = true;
    state.startAngle = angle;
    state.prevAngle = angle;
    state.totalAngle = 0;
    state.zone = zone;
    state.accumulatedNotches = 0;

    // Start long press timer for center button
    if (zone === 'center' || zone === 'menu') {
      state.longPressTimer = setTimeout(() => {
        callbacksRef.current.onLongPress(zone);
        state.active = false;
      }, LONG_PRESS_MS);
    }
  }, [getCenter]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const state = stateRef.current;
    if (!state.active) return;

    const { cx, cy } = getCenter();
    const angle = getAngle(clientX, clientY, cx, cy);
    const delta = normalizeAngle(angle - state.prevAngle);

    state.totalAngle += delta;
    state.prevAngle = angle;

    // Cancel long press if movement detected
    if (Math.abs(state.totalAngle) > TAP_THRESHOLD && state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    // Calculate notches
    state.accumulatedNotches += delta / NOTCH_ANGLE;
    const notches = Math.floor(Math.abs(state.accumulatedNotches));
    if (notches > 0) {
      const dir = state.accumulatedNotches > 0 ? 'cw' : 'ccw';
      callbacksRef.current.onRotate(dir, notches);
      state.accumulatedNotches -= notches * Math.sign(state.accumulatedNotches);
    }
  }, [getCenter]);

  const handleEnd = useCallback(() => {
    const state = stateRef.current;
    if (!state.active) return;

    state.active = false;

    // Clear long press timer
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    // If total movement is small, treat as a tap
    if (Math.abs(state.totalAngle) < TAP_THRESHOLD) {
      callbacksRef.current.onZoneTap(state.zone);
      return;
    }

    // Start momentum if on ring
    if (state.zone === 'ring' || Math.abs(state.totalAngle) > TAP_THRESHOLD) {
      const velocity = state.accumulatedNotches;
      if (Math.abs(velocity) > MIN_VELOCITY) {
        startMomentum(velocity);
      }
    }
  }, [startMomentum]);

  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleEnd();
    };
    const onMouseDown = (e: MouseEvent) => {
      handleStart(e.clientX, e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      handleEnd();
    };
    // Desktop scroll wheel support
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? 'cw' : 'ccw';
      callbacksRef.current.onRotate(dir, 1);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(stateRef.current.momentumRaf);
    };
  }, [wheelRef, handleStart, handleMove, handleEnd]);
}
```

**Step 3: Create ClickWheel.module.css**

```css
.wheel {
  position: relative;
  width: 85%;
  aspect-ratio: 1;
  max-width: 280px;
  border-radius: 50%;
  background: var(--ipod-wheel-bg);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    inset 0 -1px 0 rgba(0, 0, 0, 0.05);
  touch-action: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Concentric groove texture */
.wheel::before {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: repeating-radial-gradient(
    circle at center,
    transparent 0px,
    transparent 3px,
    rgba(0, 0, 0, 0.02) 3px,
    rgba(0, 0, 0, 0.02) 4px
  );
  pointer-events: none;
}

/* Active glow */
.wheel.active {
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 0 15px var(--ipod-wheel-glow);
}

.wheel.pressed {
  transform: scale(0.97);
}

.centerButton {
  width: 30%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--ipod-wheel-center);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    inset 0 -1px 2px rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 2;
}

/* Labels */
.label {
  position: absolute;
  font-size: 10px;
  font-weight: 600;
  color: var(--ipod-wheel-label);
  text-transform: uppercase;
  letter-spacing: 1px;
  pointer-events: none;
  z-index: 1;
}

.labelMenu {
  top: 12%;
  left: 50%;
  transform: translateX(-50%);
}

.labelForward {
  right: 12%;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
}

.labelBack {
  left: 12%;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
}

.labelPlayPause {
  bottom: 12%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
}
```

**Step 4: Create ClickWheel.tsx**

```tsx
import { useRef, useState, useCallback } from 'react';
import { useClickWheel } from '../../hooks/useClickWheel';
import { useHaptics } from '../../hooks/useHaptics';
import { useMenuStore } from '../../stores/menuStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { WheelZone } from '@0pod/shared';
import styles from './ClickWheel.module.css';

export function ClickWheel() {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const { play } = useHaptics();

  const { scrollUp, scrollDown, select, goBack, currentScreen } = useMenuStore();
  const { isLocked, toggleLock } = useSettingsStore();

  const onRotate = useCallback(
    (direction: 'cw' | 'ccw', notches: number) => {
      if (isLocked) return;
      for (let i = 0; i < notches; i++) {
        play('wheelTick');
        if (direction === 'cw') {
          scrollDown();
        } else {
          scrollUp();
        }
      }
    },
    [isLocked, play, scrollDown, scrollUp],
  );

  const onZoneTap = useCallback(
    (zone: WheelZone) => {
      if (isLocked) {
        play('error');
        return;
      }

      switch (zone) {
        case 'center':
          play('menuSelect');
          select();
          break;
        case 'menu':
          play('menuButton');
          goBack();
          break;
        case 'forward':
          play('skipForward');
          // Phase 0: no audio, no-op
          break;
        case 'back':
          play('skipBackward');
          // Phase 0: no audio, no-op
          break;
        case 'playPause':
          play('playPause');
          // Phase 0: no audio, no-op
          break;
        default:
          break;
      }
    },
    [isLocked, play, select, goBack],
  );

  const onLongPress = useCallback(
    (zone: WheelZone) => {
      if (zone === 'menu') {
        play('lockToggle');
        toggleLock();
      } else if (zone === 'center') {
        play('longPress');
        // Phase 0: no submenu action
      }
    },
    [play, toggleLock],
  );

  useClickWheel(wheelRef, { onRotate, onZoneTap, onLongPress });

  return (
    <div
      ref={wheelRef}
      className={`${styles.wheel} ${isActive ? styles.active : ''} ${isPressed ? styles.pressed : ''}`}
      onPointerDown={() => {
        setIsActive(true);
        setIsPressed(true);
      }}
      onPointerUp={() => {
        setIsActive(false);
        setIsPressed(false);
      }}
      onPointerLeave={() => {
        setIsActive(false);
        setIsPressed(false);
      }}
    >
      <span className={`${styles.label} ${styles.labelMenu}`}>MENU</span>
      <span className={`${styles.label} ${styles.labelForward}`}>▶▶</span>
      <span className={`${styles.label} ${styles.labelBack}`}>◀◀</span>
      <span className={`${styles.label} ${styles.labelPlayPause}`}>▶❚❚</span>
      <div className={styles.centerButton} />
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add apps/web/src/hooks apps/web/src/components/ClickWheel
git commit -m "feat: add ClickWheel with touch/mouse input, zone detection, momentum, and haptic integration"
```

---

## Task 11: App Assembly

**Files:**
- Modify: `apps/web/src/App.tsx`

**Step 1: Update App.tsx to wire everything together**

```tsx
import { IPodShell } from './components/iPod/IPodShell';
import { LCDScreen } from './components/iPod/LCDScreen';
import { StatusBar } from './components/StatusBar/StatusBar';
import { MenuScreen } from './components/Menu/MenuScreen';
import { ClickWheel } from './components/ClickWheel/ClickWheel';

export function App() {
  return (
    <IPodShell
      screen={
        <LCDScreen>
          <StatusBar />
          <MenuScreen />
        </LCDScreen>
      }
      wheel={<ClickWheel />}
    />
  );
}
```

**Step 2: Verify the app renders**

Run: `cd apps/web && pnpm run dev`
Expected: iPod shell visible with LCD screen, status bar, menu list, and click wheel

**Step 3: Verify build**

Run: `cd apps/web && pnpm run build`
Expected: Build succeeds, dist folder created

**Step 4: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat: assemble iPod shell with LCD, status bar, menu, and click wheel"
```

---

## Task 12: Final Integration & Push

**Step 1: Run all tests from root**

Run: `pnpm run test`
Expected: All tests pass across all packages

**Step 2: Run build from root**

Run: `pnpm run build`
Expected: All packages and apps build successfully

**Step 3: Final commit if any loose files**

```bash
git add -A
git status
# Only commit if there are changes
git commit -m "chore: Phase 0 complete — iPod shell, click wheel, haptics, menu navigation"
```

**Step 4: Push to GitHub**

```bash
git push origin phase-0
```

**Step 5: Create PR**

```bash
gh pr create --title "Phase 0: iPod shell + click wheel + haptics + menus" --body "..."
```

---

## Task Dependency Graph

```
Task 1 (Monorepo) ──┬── Task 2 (Shared Types) ──┐
                     ├── Task 3 (Haptics)  ───────┤
                     └── Task 4 (Server Stub)     │
                                                  │
Task 5 (Web Scaffold) ───────────────────────────┤
                                                  │
Task 6 (Stores) ──────────────────────────────────┤
                                                  │
Task 7 (Shell + LCD) ─────────────┐               │
Task 8 (StatusBar) ───────────────┤               │
Task 9 (Menu Components) ────────┤               │
Task 10 (ClickWheel + Hooks) ────┤               │
                                  │               │
Task 11 (Assembly) ◄─────────────┴───────────────┘
                                  │
Task 12 (Integration + Push) ◄────┘
```

**Parallel opportunities:**
- Tasks 2, 3, 4 can run in parallel (no dependencies on each other, only on Task 1)
- Tasks 7, 8, 9 can run in parallel (all depend on Task 6 stores, but not on each other)
- Task 10 depends on Tasks 3, 6 (haptics + stores)
- Task 11 depends on Tasks 7-10 (all components exist)
