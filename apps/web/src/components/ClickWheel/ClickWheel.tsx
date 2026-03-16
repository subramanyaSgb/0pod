import { useRef, useState, useCallback } from 'react';
import { useClickWheel } from '../../hooks/useClickWheel';
import { useHaptics } from '../../hooks/useHaptics';
import { useMenuStore } from '../../stores/menuStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { WheelZone } from '@0pod/shared';
import styles from './ClickWheel.module.css';

export function ClickWheel() {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const { play } = useHaptics();

  const { scrollUp, scrollDown, select, goBack } = useMenuStore();
  const { isLocked, toggleLock } = useSettingsStore();

  const onRotate = useCallback(
    (direction: 'cw' | 'ccw', notches: number) => {
      if (isLocked) return;
      for (let i = 0; i < notches; i++) {
        play('wheelTick');
        if (direction === 'cw') {
          scrollDown();
        } else {
          scrollUp();
        }
      }
    },
    [isLocked, play, scrollDown, scrollUp],
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
          break;
        case 'menu':
          play('menuButton');
          goBack();
          break;
        case 'forward':
          play('skipForward');
          break;
        case 'back':
          play('skipBackward');
          break;
        case 'playPause':
          play('playPause');
          break;
        default:
          break;
      }
    },
    [isLocked, play, select, goBack],
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
