# 0Pod — Product Requirements Document

> **Zero Limits. All Music.**
>
> v1.0 · March 2026 · Confidential
>
> Target Platform: Web (PWA) · Mobile-First · Samsung S23 Optimized

---

## 1. Executive Summary

0Pod is a universal music player web application that replicates the iconic Apple iPod experience in a modern browser. Every interaction — from the tactile click wheel to the green-backlit LCD screen to the satisfying menu hierarchy — is designed to make users feel like they are holding a real iPod Classic, while connecting them to every music source on the internet.

The app aggregates YouTube Music, Spotify, SoundCloud, and local offline files into a single unified library, all navigated through the classic iPod interface with authentic haptic feedback optimized for Samsung S23 and other modern Android devices.

---

## 2. Product Vision

### 2.1 The Core Experience

When a user opens 0Pod, they should forget they are using a web browser. The entire screen becomes an iPod. The chrome bezel gleams. The LCD screen glows with that warm backlight. The click wheel responds to their thumb with physical haptic ticks they can feel through their phone. Every menu transition slides exactly like the original. There is no web UI anywhere — only iPod.

### 2.2 Experience Principles

| Principle | Description | Implementation |
|-----------|-------------|----------------|
| Physical Authenticity | Every pixel must reference the real iPod Classic hardware | Chrome bezel, LCD pixel grid overlay, screen curvature, reflection highlights, exact proportions of iPod Classic 6th gen |
| Haptic Realism | Touch interactions produce physical sensations matching iPod hardware | Vibration API tuned per-action: click wheel ticks (8ms pulses), menu select (15ms), song skip (20ms), hold actions (40ms ramp) |
| Sound Design | Auditory feedback reinforcing physical metaphor | Click wheel tick sounds, menu pop sounds, volume adjustment tones — sampled from original iPod |
| Menu Hierarchy | Navigation follows the iPod's exact menu tree structure | Music > Playlists/Artists/Albums/Songs, Now Playing, Settings — with sliding panel transitions |
| No Web Leakage | Zero browser-like UI elements visible during use | Fullscreen PWA, custom status bar, no scroll bars, no text selection, no context menus |

### 2.3 Target Persona

Gen Z music lovers who appreciate retro aesthetics but demand modern streaming convenience. They post their Spotify Wrapped but secretly wish they had a Walkman. They want the vibe of analog in a digital world. Primary device: Samsung Galaxy S23 or equivalent flagship Android.

---

## 3. iPod Experience Specification

### 3.1 The Device Shell

The app renders a full iPod Classic body on screen. The device shell is not a background decoration — it IS the app. On mobile, it fills the viewport. On desktop, it renders centered at 1:1.8 aspect ratio with a dark ambient background.

- **Bezel:** Brushed aluminum gradient (`#C0C0C0` to `#A8A8A8`) with subtle noise texture overlay at 3% opacity
- **Screen area:** Inset with 2px dark border (`#333`) and 1px inner shadow simulating recessed LCD
- **Screen glass:** 0.5px semi-transparent highlight along top edge simulating light reflection
- **Corner radius:** 24px outer shell, 8px screen bezel — matching iPod Classic 6th gen proportions

### 3.2 The LCD Screen

The screen must feel like a real LCD, not a modern OLED:

- **Background:** Warm off-white (`#E8E6D9`) with subtle green-blue tint — NOT pure white
- **Pixel grid:** CSS repeating pattern of 1px lines at 2px intervals, opacity 0.03, simulating LCD subpixels
- **Backlight glow:** Radial gradient from center, brighter middle, dimmer edges
- **Text rendering:** `-webkit-font-smoothing: none` for chunky LCD text look
- **Color palette:** Dark text (`#1A1A1A`), selection highlight (`#3B6EA5`), status icons in dark grey
- **Refresh simulation:** Optional subtle flicker at 0.5% opacity change, 60fps, toggled in settings

### 3.3 The Click Wheel

The click wheel is the soul of the iPod and the most polished element of 0Pod:

- **Outer ring:** Circular touch-sensitive area, white/light grey with concentric groove texture
- **Center button:** Slightly raised with inner shadow, lighter than outer ring
- **Touch zones:** MENU (top), Forward (right), Back (left), Play/Pause (bottom) — with subtle text labels
- **Rotation tracking:** Touch events calculate angular velocity around center for scrolling
- **Visual feedback:** Press-down animation (`scale(0.97)`, shadow reduction) on tap
- **Glow ring:** On active touch, faint blue glow (`#3B82F6` at 15%) pulses around wheel

### 3.4 Haptic Feedback System (Samsung S23 Optimized)

The Web Vibration API (`navigator.vibrate()`) creates a layered haptic language. Samsung S23's linear vibration motor supports precise patterns simulating the mechanical iPod click wheel.

| Action | Pattern (ms) | Sensation | iPod Equivalent |
|--------|-------------|-----------|-----------------|
| Click wheel tick (per notch) | `[5]` | Sharp micro-tick, barely perceptible | Physical click wheel detent |
| Click wheel fast scroll | `[3, 2]` repeating | Buzzing texture like spinning fast | Rapid wheel spinning |
| Menu item select | `[12]` | Firm, satisfying tap | Center button press |
| Menu button press | `[8]` | Light acknowledgment | Menu button click |
| Play/Pause toggle | `[15, 30, 15]` | Double-tap feel, decisive | Play button snap |
| Track skip forward | `[5, 20, 10]` | Sweeping forward motion | Forward button press |
| Track skip backward | `[10, 20, 5]` | Sweeping backward motion | Back button press |
| Long press (submenu) | `[5, 5, 5, 5, 40]` | Building anticipation, then confirm | Hold center button |
| Volume notch | `[6]` | Subtle tick per volume step | Volume ring rotation |
| Lock/unlock | `[20, 40, 20]` | Mechanical switch pattern | Hold switch toggle |
| Error / end of list | `[100]` | Firm buzz, something is wrong | Scroll past end of list |
| Song start / loaded | `[8, 15, 8]` | Rhythmic triple-tap | CD-spin-up feel |

**Haptic Calibration:** Settings menu allows haptic intensity adjustment (Off / Light / Medium / Strong) and pattern testing. Samsung S23 is the reference device; others fall back to simpler patterns via feature detection.

### 3.5 Navigation & Menu System

0Pod replicates the iPod's hierarchical menu exactly. No hamburger menus, no bottom tabs, no modals — just the classic drill-down list with sliding transitions.

**Menu Tree:**

- **Music** → Playlists, Artists, Albums, Songs, Genres, Composers, Search
- **Sources** → YouTube Music, Spotify, SoundCloud, Local Files, Downloads
- **Now Playing** → Active track with album art, scrubber, controls
- **Shuffle Songs** → Immediate action, starts random playback
- **Downloads** → All Downloads, By Source, Storage Used
- **Settings** → Source Accounts, Audio Quality, Haptics, Display, About

### 3.6 Transition Animations

Every menu transition must exactly mimic iPod behavior:

- **Drill down** (select item): Current screen slides left, new screen slides in from right — 250ms ease-in-out
- **Go back** (Menu button): Current screen slides right, previous screen slides in from left — 250ms ease-in-out
- **List scrolling:** Items move as a group with momentum scrolling, deceleration curve matching pre-iOS 7 physics
- **Now Playing entry:** Cross-fade transition with album art scaling up from list thumbnail — 300ms
- **No screen ever appears instantly** — every state change has a transition

### 3.7 Status Bar

Top of the LCD screen shows a persistent iPod-style status bar:

- **Left:** Current menu title (e.g., "Music", "Artists", "Now Playing") in bold
- **Center:** Play state icon (play/pause triangle) and source icon (YT/Spotify/SC/Local)
- **Right:** Battery indicator (segmented iPod-style bar) and signal/connection dot
- **Lock icon:** Shown when click wheel is locked (simulated hold switch)

---

## 4. Music Source Providers

All music sources are equal citizens. The library is a unified view; source is secondary metadata shown as a subtle icon badge.

| Source | Auth Method | Capabilities | Quality Options |
|--------|------------|--------------|-----------------|
| YouTube Music | Cookie/OAuth (unofficial) | Search, playlists, albums, artists, lyrics, radio | 64kbps Opus, 128kbps Opus, 256kbps AAC |
| Spotify | OAuth + Web Playback SDK / librespot | Search, playlists, albums, artists, lyrics, podcasts | 96kbps, 160kbps, 320kbps OGG |
| SoundCloud | Client API / Widget API | Search, playlists, tracks, user uploads | 64kbps Opus, 128kbps MP3 |
| Local Files | File System API / IndexedDB | User uploads, metadata parsing, offline-first | Original quality (FLAC, MP3, AAC, WAV, ALAC) |
| Downloads | Internal cache / Service Worker | Previously downloaded tracks from any source | As downloaded, quality preserved |

### 4.1 Unified Search

Search queries all connected sources simultaneously. Results de-duplicated by track fingerprint (title + artist normalization) and ranked by relevance. Each result shows a tiny source badge. User types via classic iPod scroll-to-select alphabet wheel navigated with the click wheel.

### 4.2 Smart Source Routing

When a track exists on multiple sources, 0Pod auto-selects based on: preferred quality > source priority (user-configurable) > connection speed > availability. Users can override per-track by long-pressing and choosing "Play from…"

---

## 5. Download & Offline System

### 5.1 Download Flow

- User long-presses track or selects "Download" from submenu
- Quality picker appears: shows all available qualities for that source with file size estimates
- Download begins with progress shown in iPod-style progress bar on status area
- Completed downloads appear in Downloads menu and are marked with a ↓ icon in all views
- Downloaded tracks play from local cache first, falling back to streaming if cache is cleared

### 5.2 Quality Tiers

| Tier | Bitrate | Format | ~Size (4min track) |
|------|---------|--------|-------------------|
| Low | 64-96 kbps | Opus / OGG | ~2.3 MB |
| Normal | 128-160 kbps | MP3 / AAC / OGG | ~4.6 MB |
| High | 256-320 kbps | AAC / OGG | ~9.2 MB |
| Lossless | 800-1411 kbps | FLAC / ALAC | ~28 MB |

### 5.3 Storage Management

Settings > Downloads shows total storage used with a visual bar (iPod-style segmented storage display). Users can set auto-delete rules (e.g., remove tracks not played in 30 days) and bulk-delete by source, artist, or date downloaded.

---

## 6. Now Playing Experience

The Now Playing screen is where 0Pod truly shines. It transforms the iPod LCD into a focused music experience:

- **Album art:** Centered, large, with subtle LCD scanline overlay — art appears to be rendered ON the LCD
- **Track info:** Song title scrolling marquee (if too long), artist name, album name below art
- **Progress bar:** Classic iPod diamond-scrubber on a thin line, with elapsed/remaining time
- **Click wheel controls:** Rotate for volume, MENU to go back, center for play/pause, left/right for skip
- **Shuffle & Repeat:** Toggle via submenu (long-press center), indicated by status bar icons
- **Source badge:** Small icon showing which provider is streaming this track
- **Lyrics:** Available via submenu, displayed scrolling karaoke-style over dimmed album art
- **Album art color extraction:** Status bar and subtle screen tint adapt to album art dominant color

---

## 7. Audio Engine

- **Gapless playback:** Pre-buffer next track, cross-fade at 0ms gap for seamless album playback
- **Equalizer:** 10-band EQ accessible in Settings, with presets (Flat, Bass Boost, Vocal, Classical, etc.)
- **Volume normalization:** ReplayGain-style loudness normalization across sources
- **Audio ducking:** Auto-lower volume for notification sounds on mobile
- **Background playback:** Service Worker + Media Session API for lock-screen controls with iPod-style metadata

---

## 8. PWA & Mobile Optimization

- **Installable:** Add to Home Screen with custom iPod icon, splash screen showing iPod boot animation
- **Fullscreen:** Runs in standalone mode, no browser chrome visible
- **Offline-capable:** Service Worker caches app shell, settings, and downloaded music
- **Media Session API:** Lock screen shows Now Playing with album art, play/pause/skip controls
- **Wake Lock API:** Screen stays on during active playback (configurable)
- **Orientation:** Portrait-locked to maintain iPod proportions
- **Viewport:** Fixed viewport, no pinch zoom, no overscroll bounce — device IS the iPod

---

## 9. Technical Constraints & Risks

| Constraint | Impact | Mitigation |
|-----------|--------|------------|
| Unofficial APIs (YT Music, Spotify) | Can break without notice, potential ToS issues | Abstract behind provider interface; fallback gracefully; monitor API changes |
| Web Vibration API limitations | Not all browsers support fine-grained patterns | Feature detection with fallback; Samsung Internet / Chrome on Android have best support |
| IndexedDB storage limits | Browsers may limit storage (varies by device/browser) | Storage estimation API; warn users; suggest clearing old downloads |
| CORS restrictions on stream URLs | Direct audio fetching may be blocked | Backend proxy for stream resolution; Service Worker intercepts |
| Battery drain from haptics | Continuous haptic feedback during wheel scrolling | Debounce haptics; offer intensity settings; auto-disable on low battery |
| Audio codec support varies | Not all browsers decode all formats | Transcode to widely-supported AAC/Opus on backend before serving |

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Haptic Satisfaction Score | > 4.5/5 | Post-session survey on Samsung S23 test group |
| "Feels like real iPod" rating | > 80% strongly agree | A/B test vs flat UI version |
| Time to first play | < 15 seconds from app open | Analytics: app_open to first audio_play event |
| Daily active sessions | > 3 sessions/day for retained users | Analytics: unique session count per user |
| Offline play rate | > 20% of plays from downloads | Analytics: source of audio_play events |
| PWA install rate | > 40% of repeat visitors | Analytics: beforeinstallprompt acceptance |

---

## 11. Development Milestones

| Phase | Deliverable | Timeline |
|-------|-------------|----------|
| Phase 0 | iPod shell + click wheel + haptics + menu navigation (no audio) | Week 1-2 |
| Phase 1 | YouTube Music provider + playback + Now Playing screen | Week 3-5 |
| Phase 2 | Download system + offline playback + quality selection | Week 6-7 |
| Phase 3 | Spotify + SoundCloud providers + unified search | Week 8-10 |
| Phase 4 | Local file support + library management + EQ | Week 11-12 |
| Phase 5 | PWA optimization + haptic fine-tuning + Samsung S23 QA | Week 13-14 |
| Phase 6 | Beta launch + user testing + iteration | Week 15-16 |
