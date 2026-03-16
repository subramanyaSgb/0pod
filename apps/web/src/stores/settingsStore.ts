import { create } from 'zustand';
import type { HapticIntensity, BacklightLevel, Settings } from '@0pod/shared';

const STORAGE_KEY = '0pod-settings';

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore parse errors
  }
  return {
    hapticIntensity: 'medium',
    backlightLevel: 'high',
    lcdFlicker: false,
  };
}

function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

interface SettingsState extends Settings {
  isLocked: boolean;
  setHapticIntensity: (intensity: HapticIntensity) => void;
  setBacklightLevel: (level: BacklightLevel) => void;
  toggleLcdFlicker: () => void;
  toggleLock: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const initial = loadSettings();
  return {
    ...initial,
    isLocked: false,

    setHapticIntensity: (hapticIntensity) => {
      set({ hapticIntensity });
      saveSettings({ ...get(), hapticIntensity });
    },

    setBacklightLevel: (backlightLevel) => {
      set({ backlightLevel });
      saveSettings({ ...get(), backlightLevel });
    },

    toggleLcdFlicker: () => {
      const lcdFlicker = !get().lcdFlicker;
      set({ lcdFlicker });
      saveSettings({ ...get(), lcdFlicker });
    },

    toggleLock: () => {
      set((state) => ({ isLocked: !state.isLocked }));
    },
  };
});
