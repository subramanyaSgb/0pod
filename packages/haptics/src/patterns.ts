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
