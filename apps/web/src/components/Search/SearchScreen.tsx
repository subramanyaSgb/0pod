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

export function SearchScreen() {
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searched, setSearched] = useState(false);
  const { setQueue } = usePlayerStore();
  const { navigate } = useMenuStore();

  const doSearch = useCallback(async (query: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.search(query);
      const tracks = data.flatMap((r: SearchResultItem) => r.tracks || []);
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
    return <div className={styles.container}><div className={styles.loading}>Searching...</div></div>;
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
    return <div className={styles.container}><div className={styles.loading}>No results</div></div>;
  }

  return (
    <div className={styles.container}>
      {results.map((track, i) => (
        <div
          key={track.id}
          className={`${styles.item} ${i === selectedIndex ? styles.selected : ''}`}
          onClick={() => playTrack(i)}
        >
          <div className={styles.trackInfo}>
            <span className={styles.trackTitle}>{track.title}</span>
            <span className={styles.trackArtist}>{track.artist}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

interface SearchResultItem {
  tracks?: Track[];
}
