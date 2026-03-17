import { useRef, useState, useCallback } from 'react';
import { useClickWheel } from '../../hooks/useClickWheel';
import { useHaptics } from '../../hooks/useHaptics';
import { useMenuStore } from '../../stores/menuStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { WheelZone } from '@0pod/shared';
import styles from './ClickWheel.module.css';

export function ClickWheel() {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const { play } = useHaptics();

  const { scrollUp, scrollDown, select, goBack, currentScreen } = useMenuStore();
  const { playPause, nextTrack, prevTrack, setVolume, volume } = usePlayerStore();
  const { isLocked, toggleLock } = useSettingsStore();

  const onRotate = useCallback(
    (direction: 'cw' | 'ccw', notches: number) => {
      if (isLocked) return;

      const isNowPlaying = currentScreen().id === 'nowPlaying';

      for (let i = 0; i < notches; i++) {
        if (isNowPlaying) {
          play('volumeNotch');
          const delta = direction === 'cw' ? 0.05 : -0.05;
          setVolume(volume + delta * (i + 1));
        } else {
          play('wheelTick');
          if (direction === 'cw') {
            scrollDown();
          } else {
            scrollUp();
          }
        }
      }
    },
    [isLocked, play, scrollDown, scrollUp, currentScreen, setVolume, volume],
  );

  const onZoneTap = useCallback(
    (zone: WheelZone) => {
      if (isLocked) {
        play('error');
        return;
      }

      switch (zone) {
        case 'center':
          play('menuSelect');
          select();
          window.dispatchEvent(new CustomEvent('0pod:select'));
          break;
        case 'menu':
          play('menuButton');
          goBack();
          break;
        case 'forward':
          play('skipForward');
          nextTrack();
          break;
        case 'back':
          play('skipBackward');
          prevTrack();
          break;
        case 'playPause':
          play('playPause');
          playPause();
          break;
        default:
          break;
      }
    },
    [isLocked, play, select, goBack, nextTrack, prevTrack, playPause],
  );

  const onLongPress = useCallback(
    (zone: WheelZone) => {
      if (zone === 'menu') {
        play('lockToggle');
        toggleLock();
      } else if (zone === 'center') {
        play('longPress');
      }
    },
    [play, toggleLock],
  );

  useClickWheel(wheelRef, { onRotate, onZoneTap, onLongPress });

  return (
    <div
      ref={wheelRef}
      className={`${styles.wheel} ${isActive ? styles.active : ''} ${isPressed ? styles.pressed : ''}`}
      onPointerDown={() => {
        setIsActive(true);
        setIsPressed(true);
      }}
      onPointerUp={() => {
        setIsActive(false);
        setIsPressed(false);
      }}
      onPointerLeave={() => {
        setIsActive(false);
        setIsPressed(false);
      }}
    >
      <span className={`${styles.label} ${styles.labelMenu}`}>MENU</span>
      <span className={`${styles.label} ${styles.labelForward}`}>
        &#x25B6;&#x25B6;
      </span>
      <span className={`${styles.label} ${styles.labelBack}`}>
        &#x25C0;&#x25C0;
      </span>
      <span className={`${styles.label} ${styles.labelPlayPause}`}>
        &#x25B6;&#x275A;&#x275A;
      </span>
      <div className={styles.centerButton} />
    </div>
  );
}
