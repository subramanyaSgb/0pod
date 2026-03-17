import { useRef, useEffect, useState } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import styles from './NowPlaying.module.css';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function NowPlaying() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const titleRef = useRef<HTMLDivElement>(null);
  const [needsMarquee, setNeedsMarquee] = useState(false);

  // Check if title overflows and needs marquee
  useEffect(() => {
    const el = titleRef.current;
    if (el) {
      setNeedsMarquee(el.scrollWidth > el.clientWidth);
    }
  }, [currentTrack?.title]);

  if (!currentTrack) {
    return <div className={styles.placeholder}>No track playing</div>;
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const remaining = duration > 0 ? duration - currentTime : 0;

  return (
    <div className={styles.container}>
      <div className={styles.artworkWrapper}>
        <div className={styles.artwork}>
          {currentTrack.artworkUrl ? (
            <img
              className={styles.artworkImage}
              src={currentTrack.artworkUrl}
              alt={currentTrack.album || currentTrack.title}
              crossOrigin="anonymous"
            />
          ) : null}
        </div>
      </div>

      <div className={styles.trackInfo}>
        <div className={styles.title} ref={titleRef}>
          {needsMarquee ? (
            <span className={styles.titleMarquee}>{currentTrack.title}</span>
          ) : (
            currentTrack.title
          )}
        </div>
        <div className={styles.artist}>{currentTrack.artist}</div>
        {currentTrack.album && <div className={styles.album}>{currentTrack.album}</div>}
      </div>

      <div className={styles.progressArea}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          <div className={styles.progressScrubber} style={{ left: `${progress}%` }} />
        </div>
        <div className={styles.timeDisplay}>
          <span>{formatTime(currentTime)}</span>
          <span>-{formatTime(remaining)}</span>
        </div>
      </div>

      <div className={styles.sourceBadge}>
        {currentTrack.source === 'youtube' ? 'YT Music' : currentTrack.source}
      </div>
    </div>
  );
}
