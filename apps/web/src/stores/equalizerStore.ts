import { create } from 'zustand';

const STORAGE_KEY = '0pod-equalizer';

export const EQ_BANDS = [60, 230, 910, 3600, 14000] as const;

export const EQ_BAND_LABELS = ['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz'] as const;

export const EQ_PRESETS: Record<string, number[]> = {
  flat: [0, 0, 0, 0, 0],
  rock: [4, 2, -1, 3, 5],
  pop: [-1, 3, 5, 3, -1],
  jazz: [3, 1, -2, 1, 4],
  classical: [4, 2, 0, 2, 4],
  'bass boost': [8, 5, 0, 0, 0],
  'vocal boost': [-2, 0, 5, 4, -1],
};

export const EQ_PRESET_NAMES = Object.keys(EQ_PRESETS);

interface EqualizerState {
  activePreset: string;
  bands: number[];
  isEnabled: boolean;
  selectedBandIndex: number;
  setPreset: (name: string) => void;
  setBand: (index: number, gain: number) => void;
  toggleEQ: () => void;
  setSelectedBandIndex: (index: number) => void;
}

function loadEqualizer(): Pick<EqualizerState, 'activePreset' | 'bands' | 'isEnabled'> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore parse errors
  }
  return {
    activePreset: 'flat',
    bands: [...EQ_PRESETS.flat],
    isEnabled: true,
  };
}

function saveEqualizer(state: Pick<EqualizerState, 'activePreset' | 'bands' | 'isEnabled'>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export const useEqualizerStore = create<EqualizerState>((set, get) => {
  const initial = loadEqualizer();
  return {
    ...initial,
    selectedBandIndex: 0,

    setPreset: (name: string) => {
      const preset = EQ_PRESETS[name];
      if (!preset) return;
      const bands = [...preset];
      set({ activePreset: name, bands });
      saveEqualizer({ ...get(), activePreset: name, bands });
    },

    setBand: (index: number, gain: number) => {
      const clampedGain = Math.max(-12, Math.min(12, gain));
      const bands = [...get().bands];
      bands[index] = clampedGain;
      set({ bands, activePreset: 'custom' });
      saveEqualizer({ ...get(), bands, activePreset: 'custom' });
    },

    toggleEQ: () => {
      const isEnabled = !get().isEnabled;
      set({ isEnabled });
      saveEqualizer({ ...get(), isEnabled });
    },

    setSelectedBandIndex: (index: number) => {
      if (index >= 0 && index < EQ_BANDS.length) {
        set({ selectedBandIndex: index });
      }
    },
  };
});
