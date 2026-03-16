import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from '../settingsStore';

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
  });
  useSettingsStore.setState({
    hapticIntensity: 'medium',
    backlightLevel: 'high',
    lcdFlicker: false,
    isLocked: false,
  });
});

describe('useSettingsStore', () => {
  it('has sensible defaults', () => {
    const state = useSettingsStore.getState();
    expect(state.hapticIntensity).toBe('medium');
    expect(state.backlightLevel).toBe('high');
    expect(state.lcdFlicker).toBe(false);
    expect(state.isLocked).toBe(false);
  });

  it('updates haptic intensity', () => {
    useSettingsStore.getState().setHapticIntensity('strong');
    expect(useSettingsStore.getState().hapticIntensity).toBe('strong');
  });

  it('updates backlight level', () => {
    useSettingsStore.getState().setBacklightLevel('low');
    expect(useSettingsStore.getState().backlightLevel).toBe('low');
  });

  it('toggles LCD flicker', () => {
    useSettingsStore.getState().toggleLcdFlicker();
    expect(useSettingsStore.getState().lcdFlicker).toBe(true);
    useSettingsStore.getState().toggleLcdFlicker();
    expect(useSettingsStore.getState().lcdFlicker).toBe(false);
  });

  it('toggles lock state', () => {
    useSettingsStore.getState().toggleLock();
    expect(useSettingsStore.getState().isLocked).toBe(true);
  });
});
