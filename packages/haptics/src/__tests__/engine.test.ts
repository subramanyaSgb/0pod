import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HapticEngine } from '../engine';

const mockVibrate = vi.fn(() => true);

beforeEach(() => {
  vi.stubGlobal('navigator', {
    vibrate: mockVibrate,
    userAgent: 'Android SM-S911B',
  });
  mockVibrate.mockClear();
});

describe('HapticEngine', () => {
  it('detects Samsung S23 as supported', () => {
    const engine = new HapticEngine();
    expect(engine.isSupported()).toBe(true);
  });

  it('plays a pattern via navigator.vibrate', () => {
    const engine = new HapticEngine();
    engine.play('wheelTick');
    expect(mockVibrate).toHaveBeenCalledWith([5]);
  });

  it('scales pattern with light intensity (0.5x)', () => {
    const engine = new HapticEngine();
    engine.setIntensity('light');
    engine.play('menuSelect');
    expect(mockVibrate).toHaveBeenCalledWith([6]);
  });

  it('scales pattern with strong intensity (1.5x)', () => {
    const engine = new HapticEngine();
    engine.setIntensity('strong');
    engine.play('menuSelect');
    expect(mockVibrate).toHaveBeenCalledWith([18]);
  });

  it('does not vibrate when intensity is off', () => {
    const engine = new HapticEngine();
    engine.setIntensity('off');
    engine.play('wheelTick');
    expect(mockVibrate).not.toHaveBeenCalled();
  });

  it('clamps to device min pulse', () => {
    const engine = new HapticEngine();
    engine.setIntensity('light');
    engine.play('wheelFastTick');
    expect(mockVibrate).toHaveBeenCalledWith([3, 3]);
  });

  it('stops vibration', () => {
    const engine = new HapticEngine();
    engine.stop();
    expect(mockVibrate).toHaveBeenCalledWith(0);
  });
});
