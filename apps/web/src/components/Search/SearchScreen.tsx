import { useState, useCallback } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useMenuStore } from '../../stores/menuStore';
import { api } from '../../services/api';
import type { Track } from '@0pod/shared';
import styles from './SearchScreen.module.css';

const QUICK_SEARCHES = [
  'Trending Music',
  'Pop Hits 2026',
  'Rock Classics',
  'Lo-Fi Beats',
  'Jazz Essentials',
  'Hip Hop',
  'Electronic',
  'R&B Soul',
];

const SOURCE_LABELS: Record<string, string> = {
  youtube: 'YT',
  spotify: 'SP',
  soundcloud: 'SC',
  local: 'LC',
};

export function SearchScreen() {
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searched, setSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { setQueue } = usePlayerStore();
  const { navigate } = useMenuStore();

  const doSearch = useCallback(async (query: string) => {
    setLoading(true);
    setSearched(true);
    setSearchQuery(query);
    try {
      const data = await api.search(query);
      // Flatten results from all sources
      const tracks: Track[] = [];
      if (Array.isArray(data)) {
        for (const sourceResult of data) {
          const source = (sourceResult as any).source || 'youtube';
          for (const track of (sourceResult as any).tracks || []) {
            tracks.push({ ...track, source });
          }
        }
      }
      setResults(tracks);
      setSelectedIndex(0);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  const playTrack = useCallback((index: number) => {
    if (results.length > 0) {
      setQueue(results, index);
      navigate('nowPlaying');
    }
  }, [results, setQueue, navigate]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Searching...</div>
      </div>
    );
  }

  if (!searched) {
    return (
      <div className={styles.container}>
        {QUICK_SEARCHES.map((term, i) => (
          <div
            key={term}
            className={`${styles.item} ${i === selectedIndex ? styles.selected : ''}`}
            onClick={() => doSearch(term)}
          >
            <span>{term}</span>
            <span className={styles.arrow}>&#x25B6;</span>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>No results for &ldquo;{searchQuery}&rdquo;</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.resultHeader}>
        {results.length} results for &ldquo;{searchQuery}&rdquo;
      </div>
      {results.map((track, i) => (
        <div
          key={`${track.source}-${track.id}`}
          className={`${styles.trackItem} ${i === selectedIndex ? styles.selected : ''}`}
          onClick={() => playTrack(i)}
        >
          <div className={styles.trackLeft}>
            <span className={styles.sourceBadge}>
              {SOURCE_LABELS[track.source] || track.source}
            </span>
          </div>
          <div className={styles.trackInfo}>
            <div className={styles.trackTitle}>{track.title}</div>
            <div className={styles.trackArtist}>{track.artist}</div>
          </div>
          <div className={styles.trackDuration}>
            {track.duration > 0 ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : ''}
          </div>
        </div>
      ))}
    </div>
  );
}
