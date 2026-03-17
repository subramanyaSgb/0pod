import type { MenuItem, MenuScreen } from '@0pod/shared';

const menuItems: Record<string, MenuItem[]> = {
  root: [
    { id: 'music', label: 'Music', action: 'navigate', submenuId: 'music' },
    { id: 'sources', label: 'Sources', action: 'navigate', submenuId: 'sources' },
    { id: 'nowPlaying', label: 'Now Playing', action: 'navigate', submenuId: 'nowPlaying' },
    { id: 'shuffle', label: 'Shuffle Songs', action: 'execute' },
    { id: 'downloads', label: 'Downloads', action: 'navigate', submenuId: 'downloadsList' },
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
    { id: 'youtube', label: 'YouTube Music', action: 'navigate', submenuId: 'youtubeEmbed' },
    { id: 'spotify', label: 'Spotify', action: 'execute' },
    { id: 'soundcloud', label: 'SoundCloud', action: 'execute' },
    { id: 'localFiles', label: 'Local Files', action: 'navigate', submenuId: 'localFiles' },
  ],
  settings: [
    { id: 'equalizer', label: 'Equalizer', action: 'navigate', submenuId: 'equalizer' },
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
  searchYoutube: [],
  youtubeEmbed: [],
  searchSpotify: [],
  searchSoundcloud: [],
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
  downloadsList: [
    { id: 'dl-all', label: 'All Downloads', action: 'navigate', submenuId: 'downloadsAll' },
    { id: 'dl-storage', label: 'Storage Used', action: 'execute' },
    { id: 'dl-clear', label: 'Clear Old Downloads', action: 'execute' },
  ],
  downloadsAll: [],
  localFiles: [],
  equalizer: [
    { id: 'eq-band-0', label: '60Hz', action: 'execute' },
    { id: 'eq-band-1', label: '230Hz', action: 'execute' },
    { id: 'eq-band-2', label: '910Hz', action: 'execute' },
    { id: 'eq-band-3', label: '3.6kHz', action: 'execute' },
    { id: 'eq-band-4', label: '14kHz', action: 'execute' },
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
  searchYoutube: 'YouTube Music',
  youtubeEmbed: 'YouTube Music',
  searchSpotify: 'Spotify',
  searchSoundcloud: 'SoundCloud',
  nowPlaying: 'Now Playing',
  downloads: 'Downloads',
  downloadsList: 'Downloads',
  downloadsAll: 'All Downloads',
  localFiles: 'Local Files',
  equalizer: 'Equalizer',
};

export function getMenuScreen(id: string): MenuScreen {
  return {
    id,
    title: MENU_TITLES[id] || id,
    items: menuItems[id] || menuItems.placeholder,
    selectedIndex: 0,
  };
}
