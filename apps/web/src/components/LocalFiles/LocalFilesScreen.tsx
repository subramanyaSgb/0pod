import { useEffect, useRef, useCallback } from 'react';
import { useLocalFilesStore } from '../../stores/localFilesStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useMenuStore } from '../../stores/menuStore';
import styles from './LocalFilesScreen.module.css';

export function LocalFilesScreen() {
  const { tracks, loadFiles, addFiles } = useLocalFilesStore();
  const { setQueue } = usePlayerStore();
  const { navigate } = useMenuStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        await addFiles(e.target.files);
        e.target.value = '';
      }
    },
    [addFiles],
  );

  const playTrack = useCallback(
    (index: number) => {
      setQueue(tracks, index);
      navigate('nowPlaying');
    },
    [tracks, setQueue, navigate],
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
      <div className={styles.uploadItem} onClick={handleUpload}>
        <span>+ Add Music Files</span>
      </div>
      {tracks.length === 0 ? (
        <div className={styles.empty}>No local files yet</div>
      ) : (
        tracks.map((track, i) => (
          <div key={track.id} className={styles.trackItem} onClick={() => playTrack(i)}>
            <div className={styles.trackTitle}>{track.title}</div>
            <div className={styles.trackArtist}>{track.artist}</div>
          </div>
        ))
      )}
    </div>
  );
}
