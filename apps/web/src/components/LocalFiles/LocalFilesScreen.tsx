import { useEffect, useRef, useCallback, useState } from 'react';
import { useLocalFilesStore } from '../../stores/localFilesStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useMenuStore } from '../../stores/menuStore';
import styles from './LocalFilesScreen.module.css';

export function LocalFilesScreen() {
  const { tracks, loadFiles, addFiles } = useLocalFilesStore();
  const { setQueue } = usePlayerStore();
  const { navigate } = useMenuStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Sync scroll wheel with local selectedIndex
  useEffect(() => {
    const unsub = useMenuStore.subscribe((state, prevState) => {
      const screen = state.stack[state.stack.length - 1];
      const prevScreen = prevState.stack[prevState.stack.length - 1];

      if (screen.id === 'localFiles' && screen.id === prevScreen.id && screen.selectedIndex !== prevScreen.selectedIndex) {
        const dir = screen.selectedIndex > prevScreen.selectedIndex ? 1 : -1;
        setSelectedIndex((prev) => {
          // +1 for the "Add Music Files" item at index 0
          const maxItems = tracksRef.current.length + 1;
          return Math.max(0, Math.min(maxItems - 1, prev + dir));
        });
      }
    });
    return unsub;
  }, []);

  // Listen for center button press
  useEffect(() => {
    const handler = () => {
      const screen = useMenuStore.getState().currentScreen();
      if (screen.id !== 'localFiles') return;

      if (selectedIndexRef.current === 0) {
        // "Add Music Files" selected
        inputRef.current?.click();
      } else {
        // Play selected track
        const trackIdx = selectedIndexRef.current - 1;
        const allTracks = tracksRef.current;
        if (allTracks.length > 0 && trackIdx < allTracks.length) {
          setQueue(allTracks, trackIdx);
          navigate('nowPlaying');
        }
      }
    };

    window.addEventListener('0pod:select', handler);
    return () => window.removeEventListener('0pod:select', handler);
  }, [setQueue, navigate]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        await addFiles(e.target.files);
        e.target.value = '';
      }
    },
    [addFiles],
  );

  return (
    <div className={styles.container}>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        multiple
        className={styles.hiddenInput}
        onChange={handleFileChange}
      />
      <div
        className={`${styles.uploadItem} ${selectedIndex === 0 ? styles.selected : ''}`}
        onClick={() => inputRef.current?.click()}
      >
        <span>+ Add Music Files</span>
      </div>
      {tracks.length === 0 ? (
        <div className={styles.empty}>No local files yet</div>
      ) : (
        tracks.map((track, i) => (
          <div
            key={track.id}
            className={`${styles.trackItem} ${i + 1 === selectedIndex ? styles.selected : ''}`}
            onClick={() => {
              setQueue(tracks, i);
              navigate('nowPlaying');
            }}
          >
            <div className={styles.trackTitle}>{track.title}</div>
            <div className={styles.trackArtist}>{track.artist}</div>
          </div>
        ))
      )}
    </div>
  );
}
