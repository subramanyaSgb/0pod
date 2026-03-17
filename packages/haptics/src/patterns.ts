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
  | 'songLoaded'
  | 'trackChange'
  | 'volumeChange'
  | 'seekScrub'
  | 'errorBuzz'
  | 'downloadComplete';

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
  // New patterns — short, crisp vibrations tuned for Samsung S23
  trackChange: [8, 25, 12],
  volumeChange: [4],
  seekScrub: [3],
  errorBuzz: [30, 20, 30, 20, 60],
  downloadComplete: [10, 30, 10, 30, 20],
} as const;
