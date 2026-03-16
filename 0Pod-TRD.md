# 0Pod — Technical Requirements Document

> **Zero Limits. All Music.**
>
> v1.0 · March 2026 · Confidential

---

## 1. Technical Overview

0Pod is a Progressive Web App built with a React frontend and Node.js backend. The architecture follows a provider-based plugin system where each music source implements a unified interface, allowing the iPod UI layer to remain source-agnostic.

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript + Vite | iPod UI shell, click wheel, menu system, audio player |
| State Management | Zustand | Lightweight store for player state, menu navigation, settings |
| Styling | CSS Modules + CSS Custom Properties | iPod visual system with LCD effects, no CSS framework |
| Audio Engine | Web Audio API + Howler.js | Playback, EQ, gapless transitions, volume normalization |
| Haptics | Vibration API + Custom Haptic Engine | Pattern-based haptic feedback with device detection |
| Backend | Node.js + Fastify | Stream proxy, auth, search aggregation, transcoding |
| Transcoding | FFmpeg (fluent-ffmpeg) | Format conversion, quality selection, metadata extraction |
| Database | PostgreSQL (server) + IndexedDB (client) | User data, cache, offline library |
| Cache/Offline | Service Worker + Cache API | App shell caching, offline music, background sync |
| PWA | Workbox + Web App Manifest | Installability, fullscreen, splash screen |

---

## 2. System Architecture

### 2.1 High-Level Architecture

The system follows a three-tier architecture: the iPod UI client, an API gateway/proxy server, and external music source APIs. The client never communicates directly with music sources — all requests flow through the backend proxy to handle CORS, auth, and stream extraction.

```
Browser (React PWA)
    │
    ├─ REST API (search, metadata, playlists)
    ├─ WebSocket (real-time playback state sync)
    └─ Stream Proxy (audio byte-range requests)
    │
API Gateway (Fastify + Node.js)
    │
    ├─ YouTube Provider (youtubei API + yt-dlp)
    ├─ Spotify Provider (Web API + librespot)
    ├─ SoundCloud Provider (public API)
    └─ FFmpeg Pipeline (transcode + normalize)
```

### 2.2 Project Structure

```
0pod/
  ├─ apps/
  │   ├─ web/                        # React frontend (Vite)
  │   │   ├─ src/
  │   │   │   ├─ components/
  │   │   │   │   ├─ iPod/           # Device shell, LCD, bezel
  │   │   │   │   ├─ ClickWheel/     # Wheel + haptic integration
  │   │   │   │   ├─ Menu/           # Menu hierarchy + transitions
  │   │   │   │   ├─ NowPlaying/     # Player screen + album art
  │   │   │   │   └─ StatusBar/      # iPod status bar
  │   │   │   ├─ hooks/
  │   │   │   │   ├─ useClickWheel.ts
  │   │   │   │   ├─ useHaptics.ts
  │   │   │   │   └─ useAudioEngine.ts
  │   │   │   ├─ stores/             # Zustand stores
  │   │   │   ├─ styles/             # CSS modules + iPod theme
  │   │   │   └─ services/           # API client layer
  │   │   └─ public/                 # PWA manifest, icons, sounds
  │   └─ server/                     # Node.js backend (Fastify)
  │       ├─ src/
  │       │   ├─ providers/          # Music source providers
  │       │   │   ├─ youtube.ts
  │       │   │   ├─ spotify.ts
  │       │   │   └─ soundcloud.ts
  │       │   ├─ routes/             # API endpoints
  │       │   ├─ stream/             # Proxy + transcoding
  │       │   └─ auth/               # OAuth + session mgmt
  │       └─ config/
  ├─ packages/
  │   ├─ shared/                     # Shared types + interfaces
  │   └─ haptics/                    # Haptic pattern library
  └─ turbo.json                      # Monorepo config
```

---

## 3. Music Provider Interface

Every music source implements the `MusicProvider` interface. This contract ensures the iPod UI never knows or cares which source is active. New sources can be added by implementing this interface alone.

### 3.1 Core Interface

```typescript
interface MusicProvider {
  name: string;
  icon: string;
  isAuthenticated(): Promise<boolean>;
  authenticate(credentials: AuthPayload): Promise<void>;
  search(query: string, opts?: SearchOpts): Promise<SearchResult>;
  getTrack(id: string): Promise<Track>;
  getAlbum(id: string): Promise<Album>;
  getArtist(id: string): Promise<Artist>;
  getPlaylist(id: string): Promise<Playlist>;
  getStreamUrl(trackId: string, quality: Quality): Promise<StreamInfo>;
  getAvailableQualities(trackId: string): Promise<Quality[]>;
  getLyrics(trackId: string): Promise<LyricLine[]>;
  getRecommendations(seedTrackId: string): Promise<Track[]>;
}
```

### 3.2 Shared Types

```typescript
interface Track {
  id: string;
  source: 'youtube' | 'spotify' | 'soundcloud' | 'local';
  title: string;
  artist: string;
  album?: string;
  duration: number;            // seconds
  artworkUrl?: string;
  artworkColors?: {
    primary: string;
    secondary: string;
  };
}

interface StreamInfo {
  url: string;
  quality: Quality;
  format: 'opus' | 'aac' | 'mp3' | 'ogg' | 'flac';
  bitrate: number;
  expiresAt?: number;
}

interface Quality {
  tier: 'low' | 'normal' | 'high' | 'lossless';
  bitrate: number;
  format: string;
  estimatedSize?: number;      // bytes for full track
}
```

---

## 4. Click Wheel Engine

The click wheel is implemented as a custom React component with touch event processing, angular velocity calculation, and integrated haptic dispatch.

### 4.1 Touch Processing Pipeline

1. **`touchstart`:** Record initial touch point, calculate angle from wheel center, set active zone (MENU/FWD/BACK/PLAY or RING)
2. **`touchmove`:** Calculate delta angle from previous frame, convert to scroll units (1 notch = 15° of rotation), dispatch haptic tick per notch
3. **`touchend`:** If total movement < 5°, treat as tap on zone; if on ring, calculate angular velocity for momentum scroll
4. **Momentum:** Apply deceleration (friction = 0.92 per frame), continue scrolling with haptic ticks until velocity < threshold

### 4.2 Angular Math

```typescript
// Calculate angle from touch point to wheel center
const angle = Math.atan2(touchY - centerY, touchX - centerX);
const deltaAngle = normalizeAngle(angle - prevAngle);
const notches = Math.floor(Math.abs(deltaAngle) / NOTCH_ANGLE);
// NOTCH_ANGLE = Math.PI / 12 (15 degrees per notch)

// Momentum deceleration
velocity *= FRICTION; // 0.92
if (Math.abs(velocity) > MIN_VELOCITY) {
  requestAnimationFrame(momentumFrame);
  haptics.tick();
}
```

### 4.3 Zone Detection

The click wheel has 5 interactive zones. Zone is determined by touch position relative to wheel center:

| Zone | Region | Action | Haptic |
|------|--------|--------|--------|
| Center | Inner circle (r < 30% of wheel) | Select / Play-Pause | `[12]` firm tap |
| MENU | Top arc (315°-45°) | Go back / Menu | `[8]` light tap |
| Forward | Right arc (45°-135°) | Next track | `[5, 20, 10]` sweep |
| Play/Pause | Bottom arc (135°-225°) | Toggle playback | `[15, 30, 15]` double |
| Back | Left arc (225°-315°) | Prev track | `[10, 20, 5]` sweep |

---

## 5. Haptic Engine

The haptic engine is a standalone module (`packages/haptics`) that wraps the Vibration API with device-specific optimizations.

### 5.1 Device Detection & Calibration

```typescript
// Samsung S23 detection for optimized patterns
const isSamsungS23 = /SM-S91[1-6]/.test(navigator.userAgent);
const hasFinegrainVibration = 'vibrate' in navigator;

// Calibration profiles
const profiles = {
  samsung_flagship: { minPulse: 3, maxPulse: 200, supportsPattern: true },
  android_generic:  { minPulse: 10, maxPulse: 200, supportsPattern: true },
  ios_fallback:     { minPulse: 0, maxPulse: 0, supportsPattern: false },
};
```

### 5.2 Pattern Library

```typescript
const HapticPatterns = {
  wheelTick:      [5],
  wheelFastTick:  [3, 2],
  menuSelect:     [12],
  menuButton:     [8],
  playPause:      [15, 30, 15],
  skipForward:    [5, 20, 10],
  skipBackward:   [10, 20, 5],
  longPress:      [5, 5, 5, 5, 40],
  volumeNotch:    [6],
  lockToggle:     [20, 40, 20],
  error:          [100],
  songLoaded:     [8, 15, 8],
} as const;
```

### 5.3 Intensity Scaling

User-configurable intensity multiplier applied to all patterns:

| Setting | Multiplier | Effect |
|---------|-----------|--------|
| Off | 0 | No vibration |
| Light | 0.5 | Halve all durations (round up to device min) |
| Medium | 1.0 | Default patterns as defined |
| Strong | 1.5 | 150% duration, capped at device max |

---

## 6. Audio Pipeline

### 6.1 Playback Architecture

Audio playback uses a dual-buffer system for gapless transitions. While Track A plays, Track B is pre-loaded and decoded in a background AudioContext. At the crossover point, both buffers are connected to the output with a 0ms crossfade.

```
AudioContext
  ├─ SourceNode (current track)
  ├─ SourceNode (next track, pre-buffered)
  ├─ GainNode (volume + normalization)
  ├─ BiquadFilterNode x10 (EQ bands)
  └─ AnalyserNode (optional visualization)
  └─ AudioDestination
```

### 6.2 EQ Bands

| Band | Frequency | Type | Default Gain |
|------|-----------|------|-------------|
| 1 | 32 Hz | lowshelf | 0 dB |
| 2 | 64 Hz | peaking | 0 dB |
| 3 | 125 Hz | peaking | 0 dB |
| 4 | 250 Hz | peaking | 0 dB |
| 5 | 500 Hz | peaking | 0 dB |
| 6 | 1 kHz | peaking | 0 dB |
| 7 | 2 kHz | peaking | 0 dB |
| 8 | 4 kHz | peaking | 0 dB |
| 9 | 8 kHz | peaking | 0 dB |
| 10 | 16 kHz | highshelf | 0 dB |

### 6.3 Stream Resolution Flow

1. Client requests `play(trackId, source, quality)`
2. Backend calls `provider.getStreamUrl(trackId, quality)`
3. YouTube: yt-dlp extracts adaptive format URL; Spotify: librespot decrypts stream; SoundCloud: resolves from API
4. If format ≠ requested, FFmpeg transcodes on-the-fly via streaming pipe
5. Backend proxies byte-range requests to client (supports seeking)
6. Client receives `audio/mpeg` or `audio/ogg` stream, feeds to Web Audio API

---

## 7. Download Engine

### 7.1 Architecture

- Downloads managed by a dedicated Service Worker module
- Tracks stored in IndexedDB as structured records (see schema below)
- Download queue supports pause/resume/cancel with priority ordering
- Background download continues when app is backgrounded (via Service Worker)

### 7.2 Storage Schema (IndexedDB)

```typescript
// Object Store: 'downloads'
interface DownloadRecord {
  id: string;                // '{source}:{trackId}:{quality}'
  trackId: string;
  source: ProviderName;
  quality: Quality;
  audioBlob: Blob;
  metadata: Track;
  sizeBytes: number;
  downloadedAt: number;      // timestamp
  lastPlayedAt: number;
  expiresAt?: number;        // auto-cleanup
}
```

### 7.3 Storage Budget

| Category | Budget | Policy |
|----------|--------|--------|
| App shell + assets | ~5 MB | Always cached, updated on deploy |
| Album art cache | ~50 MB | LRU eviction after 500 images |
| Downloaded tracks | User-configured (default 2 GB) | Auto-delete oldest unplayed after 30 days |
| Metadata cache | ~20 MB | Search results, playlists cached 24h |

---

## 8. Backend API Design

### 8.1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/search?q={query}&sources={csv}` | Unified search across sources |
| `GET` | `/api/track/{source}/{id}` | Track metadata + available qualities |
| `GET` | `/api/album/{source}/{id}` | Album tracks + metadata |
| `GET` | `/api/artist/{source}/{id}` | Artist discography |
| `GET` | `/api/playlist/{source}/{id}` | Playlist contents |
| `GET` | `/api/stream/{source}/{id}?quality={tier}` | Audio stream (proxied, byte-range) |
| `GET` | `/api/lyrics/{source}/{id}` | Synced lyrics (LRC format) |
| `POST` | `/api/auth/{source}/login` | Initiate OAuth / cookie auth |
| `GET` | `/api/auth/{source}/status` | Check auth status |
| `GET` | `/api/recommendations/{source}/{id}` | Track-seeded recommendations |

### 8.2 Response Format

```json
{
  "ok": true,
  "data": { ... },
  "source": "youtube",
  "cached": false,
  "timing_ms": 142
}
```

### 8.3 Caching Strategy

| Data Type | Server Cache (Redis) | Client Cache |
|-----------|---------------------|-------------|
| Search results | 5 minutes | Session only (Zustand) |
| Track metadata | 1 hour | IndexedDB 24h |
| Album/Playlist | 30 minutes | IndexedDB 24h |
| Stream URLs | No cache (expire quickly) | No cache |
| Album art | CDN with immutable headers | Cache API (LRU 500) |
| Lyrics | 24 hours | IndexedDB 7 days |

---

## 9. PWA Configuration

### 9.1 Web App Manifest

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
  "icons": [{ "src": "/icon-512.png", "sizes": "512x512" }]
}
```

### 9.2 Service Worker Strategy

- **App shell:** Cache-first (HTML, JS, CSS, fonts, sounds)
- **API responses:** Network-first with stale-while-revalidate fallback
- **Audio streams:** Network-only (too large to speculatively cache)
- **Downloads:** Cache-only (explicitly saved by user)
- **Album art:** Stale-while-revalidate (show cached, refresh in background)

### 9.3 Media Session Integration

Lock screen controls map to iPod actions. Album art displayed. Samsung's custom media notification fully utilized:

```typescript
navigator.mediaSession.metadata = new MediaMetadata({
  title: track.title,
  artist: track.artist,
  album: track.album,
  artwork: [{ src: track.artworkUrl, sizes: '512x512' }]
});

navigator.mediaSession.setActionHandler('play', () => player.play());
navigator.mediaSession.setActionHandler('pause', () => player.pause());
navigator.mediaSession.setActionHandler('previoustrack', () => player.prev());
navigator.mediaSession.setActionHandler('nexttrack', () => player.next());
```

---

## 10. Security Considerations

| Concern | Approach |
|---------|----------|
| API credentials in client | All source API calls go through backend proxy; no keys in frontend bundle |
| OAuth tokens | Stored server-side in encrypted session store; HttpOnly cookies for session ID |
| Stream URL exposure | Proxied through backend; client never sees raw source URLs |
| XSS in search results | All dynamic content sanitized; CSP headers enforced |
| CORS | Strict origin whitelist; backend is sole external communicator |
| Rate limiting | Per-user rate limits on API gateway; circuit breaker per provider |
| Downloaded content | Encrypted in IndexedDB with user-derived key (optional) |

---

## 11. Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| First Contentful Paint | < 1.2s | Inline critical CSS, preload iPod shell assets |
| Time to Interactive | < 2.0s | Code-split providers; lazy-load non-active sources |
| Click wheel response | < 16ms (60fps) | `requestAnimationFrame` loop; no React re-renders on touch |
| Haptic latency | < 5ms from touch event | Direct Vibration API call; no state update in path |
| Audio start latency | < 300ms | Pre-resolved stream URL; pre-connected AudioContext |
| Menu transition | 60fps, 250ms | CSS transform only; GPU-composited layers |
| Search response | < 500ms | Parallel source queries; fastest-wins with progressive loading |
| Bundle size | < 200KB gzipped (initial) | Tree-shake; dynamic imports for each provider |

---

## 12. Testing Strategy

| Layer | Tool | Coverage Target |
|-------|------|----------------|
| Unit tests | Vitest | > 80% for providers, haptics, audio engine |
| Component tests | React Testing Library | All iPod UI components |
| E2E tests | Playwright | Critical flows: search → play → download |
| Haptic testing | Manual on Samsung S23 | All 12 patterns verified by feel |
| Performance | Lighthouse CI | Score > 90 on mobile |
| Visual regression | Playwright screenshots | iPod shell pixel-perfect across viewports |

---

## 13. Deployment & Infrastructure

- **Frontend:** Vercel or Cloudflare Pages (edge-cached PWA shell)
- **Backend:** Railway or Fly.io (Node.js with FFmpeg binary)
- **Database:** Supabase PostgreSQL (managed, free tier to start)
- **Redis:** Upstash (serverless Redis for caching)
- **CDN:** Cloudflare for static assets and album art proxy caching
- **Monitoring:** Sentry for errors, Plausible for privacy-friendly analytics
- **CI/CD:** GitHub Actions → lint, test, build, deploy on push to main
