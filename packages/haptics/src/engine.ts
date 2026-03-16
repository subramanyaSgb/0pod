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
