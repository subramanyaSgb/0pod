import { useEffect, useRef, useState, useCallback } from 'react';
import { useMenuStore } from '../../stores/menuStore';
import { usePlayerStore } from '../../stores/playerStore';
import { api } from '../../services/api';
import type { Track } from '@0pod/shared';
import styles from './YouTubeEmbed.module.css';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

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

let ytApiLoaded = false;
let ytApiReady = false;
const ytReadyCallbacks: (() => void)[] = [];

function loadYTApi() {
  if (ytApiLoaded) return;
  ytApiLoaded = true;
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
  window.onYouTubeIframeAPIReady = () => {
    ytApiReady = true;
    ytReadyCallbacks.forEach((cb) => cb());
    ytReadyCallbacks.length = 0;
  };
}

function onYTReady(cb: () => void) {
  if (ytApiReady) cb();
  else ytReadyCallbacks.push(cb);
}

type ViewState = 'browse' | 'results' | 'loading' | 'playing';

export function YouTubeEmbed() {
  const [view, setView] = useState<ViewState>('browse');
  const [results, setResults] = useState<Track[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedIndexRef = useRef(0);
  const resultsRef = useRef<Track[]>([]);
  const viewRef = useRef<ViewState>('browse');

  selectedIndexRef.current = selectedIndex;
  resultsRef.current = results;
  viewRef.current = view;

  // Load YT API on mount
  useEffect(() => { loadYTApi(); }, []);

  const doSearch = useCallback(async (query: string) => {
    setView('loading');
    setSearchQuery(query);
    try {
      const data = await api.search(query, 'youtube');
      const tracks: Track[] = [];
      if (Array.isArray(data)) {
        for (const sr of data) {
          const source = (sr as any).source || 'youtube';
          for (const t of (sr as any).tracks || []) {
            tracks.push({ ...t, source });
          }
        }
      }
      setResults(tracks);
      setSelectedIndex(0);
      setView(tracks.length > 0 ? 'results' : 'browse');
    } catch {
      setView('browse');
    }
  }, []);

  const playVideo = useCallback((track: Track) => {
    setCurrentTrack(track);
    setView('playing');

    // Destroy existing player
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    onYTReady(() => {
      // Small delay to ensure DOM element exists
      setTimeout(() => {
        playerRef.current = new window.YT.Player('yt-player', {
          height: '100%',
          width: '100%',
          videoId: track.id,
          playerVars: {
            autoplay: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onStateChange: (event: any) => {
              // YT.PlayerState.ENDED = 0
              if (event.data === 0) {
                // Auto-play next track
                const idx = resultsRef.current.findIndex((t) => t.id === track.id);
                if (idx >= 0 && idx < resultsRef.current.length - 1) {
                  playVideo(resultsRef.current[idx + 1]);
                }
              }
            },
          },
        });
      }, 100);
    });
  }, []);

  // Sync wheel scroll
  useEffect(() => {
    const unsub = useMenuStore.subscribe((state, prev) => {
      const screen = state.stack[state.stack.length - 1];
      const prevScreen = prev.stack[prev.stack.length - 1];
      if (screen.id !== 'youtubeEmbed' || screen.id !== prevScreen.id) return;
      if (screen.selectedIndex === prevScreen.selectedIndex) return;

      const dir = screen.selectedIndex > prevScreen.selectedIndex ? 1 : -1;
      const v = viewRef.current;

      if (v === 'playing') {
        // Wheel controls volume when playing
        const p = playerRef.current;
        if (p && p.getVolume) {
          const vol = Math.max(0, Math.min(100, p.getVolume() + dir * 5));
          p.setVolume(vol);
        }
      } else {
        setSelectedIndex((prev) => {
          const max = v === 'results' ? resultsRef.current.length : QUICK_SEARCHES.length;
          return Math.max(0, Math.min(max - 1, prev + dir));
        });
      }
    });
    return unsub;
  }, []);

  // Center button handler
  useEffect(() => {
    const handler = () => {
      const screen = useMenuStore.getState().currentScreen();
      if (screen.id !== 'youtubeEmbed') return;
      const v = viewRef.current;

      if (v === 'browse') {
        const term = QUICK_SEARCHES[selectedIndexRef.current];
        if (term) doSearch(term);
      } else if (v === 'results') {
        const track = resultsRef.current[selectedIndexRef.current];
        if (track) playVideo(track);
      } else if (v === 'playing') {
        // Toggle play/pause
        const p = playerRef.current;
        if (p && p.getPlayerState) {
          const state = p.getPlayerState();
          if (state === 1) p.pauseVideo(); // playing -> pause
          else p.playVideo(); // paused -> play
        }
      }
    };
    window.addEventListener('0pod:select', handler);
    return () => window.removeEventListener('0pod:select', handler);
  }, [doSearch, playVideo]);

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  if (view === 'loading') {
    return <div className={styles.container}><div className={styles.status}>Searching...</div></div>;
  }

  if (view === 'playing') {
    return (
      <div className={styles.container}>
        <div className={styles.playerWrapper}>
          <div id="yt-player" />
        </div>
        <div className={styles.trackInfo}>
          <div className={styles.trackTitle}>{currentTrack?.title}</div>
          <div className={styles.trackArtist}>{currentTrack?.artist}</div>
        </div>
        <div className={styles.hint}>Scroll: volume | Center: play/pause | Menu: back</div>
      </div>
    );
  }

  if (view === 'results') {
    return (
      <div className={styles.container}>
        <div className={styles.resultHeader}>
          {results.length} results for &ldquo;{searchQuery}&rdquo;
        </div>
        <div className={styles.list}>
          {results.map((track, i) => (
            <div
              key={`${track.source}-${track.id}`}
              className={`${styles.item} ${i === selectedIndex ? styles.selected : ''}`}
              onClick={() => playVideo(track)}
            >
              <div className={styles.itemTitle}>{track.title}</div>
              <div className={styles.itemSub}>{track.artist}{track.duration > 0 ? ` · ${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : ''}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Browse view
  return (
    <div className={styles.container}>
      <div className={styles.list}>
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
    </div>
  );
}
