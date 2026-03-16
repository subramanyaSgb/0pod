import type { ReactNode } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import styles from './LCDScreen.module.css';

interface LCDScreenProps {
  children: ReactNode;
}

export function LCDScreen({ children }: LCDScreenProps) {
  const backlightLevel = useSettingsStore((s) => s.backlightLevel);
  const lcdFlicker = useSettingsStore((s) => s.lcdFlicker);

  return (
    <div className={styles.screen} data-backlight={backlightLevel}>
      <div className={`${styles.backlight} ${lcdFlicker ? styles.flicker : ''}`} />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
