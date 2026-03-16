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
