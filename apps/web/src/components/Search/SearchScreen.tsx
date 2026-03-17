import { useState, useCallback, useEffect, useRef } from 'react';
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

interface SearchScreenProps {
  sourceFilter?: string;
}

export function SearchScreen({ sourceFilter }: SearchScreenProps = {}) {
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searched, setSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { setQueue } = usePlayerStore();
  const { navigate } = useMenuStore();

  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;
  const searchedRef = useRef(searched);
  searchedRef.current = searched;
  const resultsRef = useRef(results);
  resultsRef.current = results;

  const doSearch = useCallback(async (query: string) => {
    setLoading(true);
    setSearched(true);
    setSearchQuery(query);
    try {
      const data = await api.search(query, sourceFilter);
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
  }, [sourceFilter]);

  const playTrack = useCallback((index: number) => {
    if (results.length > 0) {
      setQueue(results, index);
      navigate('nowPlaying');
    }
  }, [results, setQueue, navigate]);

  // Sync scroll wheel with our local selectedIndex
  useEffect(() => {
    const unsub = useMenuStore.subscribe((state, prevState) => {
      const screen = state.stack[state.stack.length - 1];
      const prevScreen = prevState.stack[prevState.stack.length - 1];

      // Detect scroll direction from menu store selectedIndex changes
      if (screen.id === prevScreen.id && screen.selectedIndex !== prevScreen.selectedIndex) {
        const dir = screen.selectedIndex > prevScreen.selectedIndex ? 1 : -1;
        setSelectedIndex((prev) => {
          const maxItems = searchedRef.current ? resultsRef.current.length : QUICK_SEARCHES.length;
          return Math.max(0, Math.min(maxItems - 1, prev + dir));
        });
      }
    });
    return unsub;
  }, []);

  // Listen for center button press (select) to trigger search or play
  useEffect(() => {
    const unsub = useMenuStore.subscribe((state, prevState) => {
      const screen = state.stack[state.stack.length - 1];
      const prevScreen = prevState.stack[prevState.stack.length - 1];

      // Detect select: stack length increased from our screen
      // But for search screens, select() on empty items does nothing in menuStore.
      // We need a different approach — listen for center button via a custom event.
    });
    return unsub;
  }, []);

  // Use a global event to detect center button press for custom screens
  useEffect(() => {
    const handler = () => {
      const screen = useMenuStore.getState().currentScreen();
      const isSearchScreen = screen.id === 'search' || screen.id.startsWith('search');
      if (!isSearchScreen) return;

      if (!searchedRef.current) {
        // Quick search mode - trigger search for selected item
        const term = QUICK_SEARCHES[selectedIndexRef.current];
        if (term) doSearch(term);
      } else {
        // Results mode - play selected track
        const tracks = resultsRef.current;
        if (tracks.length > 0) {
          setQueue(tracks, selectedIndexRef.current);
          navigate('nowPlaying');
        }
      }
    };

    window.addEventListener('0pod:select', handler);
    return () => window.removeEventListener('0pod:select', handler);
  }, [doSearch, setQueue, navigate]);

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
