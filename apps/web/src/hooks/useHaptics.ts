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
