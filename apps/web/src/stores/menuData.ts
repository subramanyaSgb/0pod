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
    { id: 'search', label: 'Search', action: 'navigate', submenuId: 'search' },
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
  search: [],
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
  search: 'Search',
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
