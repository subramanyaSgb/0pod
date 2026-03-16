import { useEffect, useState } from 'react';
import { useMenuStore } from '../../stores/menuStore';
import { useSettingsStore } from '../../stores/settingsStore';
import styles from './StatusBar.module.css';

export function StatusBar() {
  const title = useMenuStore((s) => s.currentTitle());
  const isLocked = useSettingsStore((s) => s.isLocked);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={styles.statusBar}>
      <div className={styles.left}>{title}</div>
      <div className={styles.center}>
        <span className={styles.playIcon}>▶</span>
        {isLocked && <span className={styles.lockIcon}>🔒</span>}
      </div>
      <div className={styles.right}>
        <div className={`${styles.connectionDot} ${!isOnline ? styles.offline : ''}`} />
        <div className={styles.battery}>
          <div className={styles.batterySegment} />
          <div className={styles.batterySegment} />
          <div className={styles.batterySegment} />
          <div className={styles.batterySegment} />
        </div>
      </div>
    </div>
  );
}
