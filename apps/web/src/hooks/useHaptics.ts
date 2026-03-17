import { useRef, useCallback, useMemo } from 'react';
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

  const triggers = useMemo(
    () => ({
      wheelTick: () => play('wheelTick'),
      wheelFastTick: () => play('wheelFastTick'),
      menuSelect: () => play('menuSelect'),
      menuButton: () => play('menuButton'),
      playPause: () => play('playPause'),
      skipForward: () => play('skipForward'),
      skipBackward: () => play('skipBackward'),
      longPress: () => play('longPress'),
      volumeNotch: () => play('volumeNotch'),
      lockToggle: () => play('lockToggle'),
      error: () => play('error'),
      songLoaded: () => play('songLoaded'),
      trackChange: () => play('trackChange'),
      volumeChange: () => play('volumeChange'),
      seekScrub: () => play('seekScrub'),
      errorBuzz: () => play('errorBuzz'),
      downloadComplete: () => play('downloadComplete'),
    }),
    [play],
  );

  return { play, isSupported, triggers };
}
