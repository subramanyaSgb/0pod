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

// Player state types
export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  playbackState: PlaybackState;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
}

// Search types
export interface SearchResult {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  source: ProviderName;
}

export interface Album {
  id: string;
  source: ProviderName;
  title: string;
  artist: string;
  artworkUrl?: string;
  year?: number;
  trackCount?: number;
}

export interface Artist {
  id: string;
  source: ProviderName;
  name: string;
  imageUrl?: string;
}

export interface Playlist {
  id: string;
  source: ProviderName;
  title: string;
  description?: string;
  artworkUrl?: string;
  trackCount: number;
  tracks?: Track[];
}

// API response types
export interface ApiResponse<T> {
  ok: boolean;
  data: T;
  source?: ProviderName;
  cached?: boolean;
}

// Lyrics
export interface LyricLine {
  time: number;
  text: string;
}
