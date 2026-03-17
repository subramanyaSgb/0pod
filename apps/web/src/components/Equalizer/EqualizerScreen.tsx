import {
  useEqualizerStore,
  EQ_BAND_LABELS,
  EQ_PRESET_NAMES,
} from '../../stores/equalizerStore';
import { useMenuStore } from '../../stores/menuStore';
import { useEffect } from 'react';
import styles from './EqualizerScreen.module.css';

export function EqualizerScreen() {
  const activePreset = useEqualizerStore((s) => s.activePreset);
  const bands = useEqualizerStore((s) => s.bands);
  const isEnabled = useEqualizerStore((s) => s.isEnabled);
  const selectedBandIndex = useEqualizerStore((s) => s.selectedBandIndex);
  const setBand = useEqualizerStore((s) => s.setBand);
  const setSelectedBandIndex = useEqualizerStore((s) => s.setSelectedBandIndex);

  // Override the menu store scroll behavior to control EQ bands
  useEffect(() => {
    const menuStore = useMenuStore;
    const currentScreen = menuStore.getState().currentScreen();

    // Only intercept when we're on the equalizer screen
    if (currentScreen.id !== 'equalizer') return;

    // We use the menu store's selectedIndex to drive band selection.
    // Map selectedIndex 0-4 to band indices.
    const unsub = menuStore.subscribe((state) => {
      const screen = state.stack[state.stack.length - 1];
      if (screen.id === 'equalizer') {
        const idx = Math.min(screen.selectedIndex, EQ_BAND_LABELS.length - 1);
        setSelectedBandIndex(idx);
      }
    });

    return unsub;
  }, [setSelectedBandIndex]);

  // Handle center button press to cycle gain, and forward/back to adjust
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const screen = useMenuStore.getState().currentScreen();
      if (screen.id !== 'equalizer') return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setBand(selectedBandIndex, bands[selectedBandIndex] + 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setBand(selectedBandIndex, bands[selectedBandIndex] - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBandIndex, bands, setBand]);

  const displayPreset = activePreset === 'custom' ? 'Custom' : activePreset;

  return (
    <div className={`${styles.container} ${!isEnabled ? styles.disabled : ''}`}>
      <div className={styles.header}>
        <span className={styles.presetName}>{displayPreset}</span>
        <span className={styles.eqStatus}>{isEnabled ? 'ON' : 'OFF'}</span>
      </div>

      <div className={styles.barsContainer}>
        {bands.map((gain, i) => {
          const isSelected = i === selectedBandIndex;
          // Calculate bar fill: 50% is center (0dB), positive goes up, negative goes down
          const pct = (Math.abs(gain) / 12) * 50;

          return (
            <div
              key={i}
              className={`${styles.bandColumn} ${isSelected ? styles.selected : ''}`}
            >
              <span className={styles.gainLabel}>
                {gain > 0 ? '+' : ''}{gain}dB
              </span>
              <div className={styles.barTrack}>
                <div className={styles.centerLine} />
                {gain >= 0 ? (
                  <div
                    className={styles.barFillPositive}
                    style={{
                      bottom: '50%',
                      height: `${pct}%`,
                    }}
                  />
                ) : (
                  <div
                    className={styles.barFillNegative}
                    style={{
                      top: '50%',
                      height: `${pct}%`,
                    }}
                  />
                )}
              </div>
              <span className={styles.bandLabel}>{EQ_BAND_LABELS[i]}</span>
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        <span className={styles.hint}>Scroll to select band</span>
      </div>
    </div>
  );
}
