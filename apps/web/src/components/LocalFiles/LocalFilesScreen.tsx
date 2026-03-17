import { useEffect, useRef, useState } from 'react';
import { useLocalFilesStore } from '../../stores/localFilesStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useMenuStore } from '../../stores/menuStore';
import styles from './LocalFilesScreen.module.css';

export function LocalFilesScreen() {
  const tracks = useLocalFilesStore((s) => s.tracks);
  const isScanning = useLocalFilesStore((s) => s.isScanning);
  const { setQueue } = usePlayerStore();
  const { navigate } = useMenuStore();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedIndexRef = useRef(0);
  selectedIndexRef.current = selectedIndex;
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  // Reset selection when tracks change
  useEffect(() => { setSelectedIndex(0); }, [tracks.length]);

  // Sync scroll wheel
  useEffect(() => {
    const unsub = useMenuStore.subscribe((state, prevState) => {
      const screen = state.stack[state.stack.length - 1];
      const prevScreen = prevState.stack[prevState.stack.length - 1];
      if (screen.id !== 'localFiles' || screen.id !== prevScreen.id) return;
      if (screen.selectedIndex === prevScreen.selectedIndex) return;

      const dir = screen.selectedIndex > prevScreen.selectedIndex ? 1 : -1;
      setSelectedIndex((prev) => Math.max(0, Math.min(tracksRef.current.length - 1, prev + dir)));
    });
    return unsub;
  }, []);

  // Center button plays selected track
  useEffect(() => {
    const handler = () => {
      const screen = useMenuStore.getState().currentScreen();
      if (screen.id !== 'localFiles') return;
      const allTracks = tracksRef.current;
      if (allTracks.length > 0 && selectedIndexRef.current < allTracks.length) {
        setQueue(allTracks, selectedIndexRef.current);
        navigate('nowPlaying');
      }
    };
    window.addEventListener('0pod:select', handler);
    return () => window.removeEventListener('0pod:select', handler);
  }, [setQueue, navigate]);

  if (isScanning) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>Scanning for music...</div>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          No songs found.<br />
          Go to Music &gt; Scan Music Folder
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.trackCount}>{tracks.length} songs</div>
      {tracks.map((track, i) => (
        <div
          key={track.id}
          className={`${styles.trackItem} ${i === selectedIndex ? styles.selected : ''}`}
          onClick={() => { setQueue(tracks, i); navigate('nowPlaying'); }}
        >
          <div className={styles.trackTitle}>{track.title}</div>
          <div className={styles.trackArtist}>{track.artist}</div>
        </div>
      ))}
    </div>
  );
}
