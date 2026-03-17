import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { useDownloadStore } from '../stores/downloadStore';
import { useLocalFilesStore } from '../stores/localFilesStore';
import { useEqualizerStore, EQ_BANDS } from '../stores/equalizerStore';
import { api } from '../services/api';

export function useAudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const lastTimeUpdateRef = useRef(0);
  const preloadedUrlRef = useRef<string | null>(null);
  const isSeekingRef = useRef(false);

  // Initialize audio element once
  if (!audioRef.current) {
    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';
  }

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    isSeekingRef.current = true;
    audio.currentTime = time;
    usePlayerStore.getState().setCurrentTime(time);
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 100);
  }, []);

  useEffect(() => {
    const audio = audioRef.current!;
    const store = usePlayerStore;

    // --- Audio element event listeners ---
    const onTimeUpdate = () => {
      const now = Date.now();
      if (now - lastTimeUpdateRef.current < 250) return;
      lastTimeUpdateRef.current = now;
      store.getState().setCurrentTime(audio.currentTime);

      // Pre-load next track at 80%
      const { duration, queue, queueIndex } = store.getState();
      if (duration > 0 && audio.currentTime / duration > 0.8 && !preloadedUrlRef.current) {
        const nextIndex = queueIndex + 1;
        if (nextIndex < queue.length) {
          const next = queue[nextIndex];
          api
            .getStreamUrl(next.source, next.id)
            .then((info) => {
              preloadedUrlRef.current = info.url;
            })
            .catch(() => {});
        }
      }
    };

    const onLoadedMetadata = () => {
      store.getState().setDuration(audio.duration);
    };

    const onCanPlay = () => {
      const { playbackState } = store.getState();
      if (playbackState === 'loading') {
        store.getState().setPlaybackState('playing');
        audio.play().catch(() => {});
      }
    };

    const onPlaying = () => {
      store.getState().setPlaybackState('playing');
    };

    const onPause = () => {
      if (!isSeekingRef.current) {
        store.getState().setPlaybackState('paused');
      }
    };

    const onEnded = () => {
      preloadedUrlRef.current = null;
      store.getState().nextTrack();
    };

    const onError = () => {
      store.getState().setPlaybackState('error');
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    // --- Store subscription: react to state changes ---
    let prevTrackId: string | null = null;
    let prevPlaybackState: string = 'idle';
    let prevVolume: number = 1;

    const unsubscribe = store.subscribe((state) => {
      // Track changed -> load new source
      const trackId = state.currentTrack?.id ?? null;
      if (trackId && trackId !== prevTrackId) {
        prevTrackId = trackId;
        preloadedUrlRef.current = null;

        const track = state.currentTrack!;

        // Check local files first
        if (track.source === 'local') {
          useLocalFilesStore
            .getState()
            .getBlob(track.id)
            .then((blob) => {
              if (blob) {
                audio.src = URL.createObjectURL(blob);
                audio.load();
              } else {
                store.getState().setPlaybackState('error');
              }
            })
            .catch(() => {
              store.getState().setPlaybackState('error');
            });
          return;
        }

        // Check downloads for offline playback
        useDownloadStore
          .getState()
          .getDownloadedBlob(track.id, track.source)
          .then((blob) => {
            if (blob) {
              audio.src = URL.createObjectURL(blob);
              audio.load();
            } else {
              return api.getStreamUrl(track.source, track.id).then((info) => {
                audio.src = info.url;
                audio.load();
              });
            }
          })
          .catch(() => {
            store.getState().setPlaybackState('error');
          });
      }

      // Playback state changed externally (e.g., from click wheel)
      if (state.playbackState !== prevPlaybackState) {
        prevPlaybackState = state.playbackState;
        if (state.playbackState === 'playing' && audio.paused && audio.src) {
          audio.play().catch(() => {});
        } else if (state.playbackState === 'paused' && !audio.paused) {
          audio.pause();
        }
      }

      // Volume changed
      if (state.volume !== prevVolume) {
        prevVolume = state.volume;
        audio.volume = state.volume;
      }
    });

    // --- Web Audio API equalizer ---
    if (!audioCtxRef.current) {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaElementSource(audio);

      // Create 5-band EQ using peaking filters (first/last use lowshelf/highshelf)
      const filters = EQ_BANDS.map((freq, i) => {
        const filter = ctx.createBiquadFilter();
        if (i === 0) {
          filter.type = 'lowshelf';
        } else if (i === EQ_BANDS.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.4;
        }
        filter.frequency.value = freq;
        filter.gain.value = 0;
        return filter;
      });

      // Chain: source -> filter0 -> filter1 -> ... -> destination
      source.connect(filters[0]);
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }
      filters[filters.length - 1].connect(ctx.destination);

      filtersRef.current = filters;
    }

    // Sync equalizer store to filter gains
    const eqUnsub = useEqualizerStore.subscribe((state) => {
      const filters = filtersRef.current;
      if (!filters.length) return;
      for (let i = 0; i < filters.length; i++) {
        const gain = state.isEnabled ? state.bands[i] : 0;
        filters[i].gain.value = gain;
      }
    });

    // Apply initial EQ state
    const eqState = useEqualizerStore.getState();
    filtersRef.current.forEach((f, i) => {
      f.gain.value = eqState.isEnabled ? eqState.bands[i] : 0;
    });

    // Resume AudioContext on user interaction (browser autoplay policy)
    const resumeCtx = () => {
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };
    document.addEventListener('click', resumeCtx, { once: true });
    document.addEventListener('touchstart', resumeCtx, { once: true });

    // --- Media Session API (lock screen controls) ---
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => store.getState().playPause());
      navigator.mediaSession.setActionHandler('pause', () => store.getState().playPause());
      navigator.mediaSession.setActionHandler('previoustrack', () =>
        store.getState().prevTrack(),
      );
      navigator.mediaSession.setActionHandler('nexttrack', () => store.getState().nextTrack());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime != null) seek(details.seekTime);
      });
      try {
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          const skipTime = details.seekOffset || 10;
          seek(Math.max(0, audio.currentTime - skipTime));
        });
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          const skipTime = details.seekOffset || 10;
          seek(Math.min(audio.duration || 0, audio.currentTime + skipTime));
        });
      } catch {
        // seekbackward/seekforward not supported in all browsers
      }

      // Update metadata and position state when track changes
      let prevMetaTrackId: string | null = null;
      const metaUnsub = store.subscribe((state) => {
        if (!('mediaSession' in navigator)) return;
        const track = state.currentTrack;
        const trackId = track?.id ?? null;

        // Update metadata only when track changes
        if (track && trackId !== prevMetaTrackId) {
          prevMetaTrackId = trackId;
          const artworkEntries: MediaImage[] = [];
          if (track.artworkUrl) {
            artworkEntries.push(
              { src: track.artworkUrl, sizes: '96x96', type: 'image/jpeg' },
              { src: track.artworkUrl, sizes: '256x256', type: 'image/jpeg' },
              { src: track.artworkUrl, sizes: '512x512', type: 'image/jpeg' },
            );
          }
          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: track.album || '',
            artwork: artworkEntries,
          });
        }

        // Update playback state
        if (state.playbackState === 'playing') {
          navigator.mediaSession.playbackState = 'playing';
        } else if (state.playbackState === 'paused') {
          navigator.mediaSession.playbackState = 'paused';
        } else {
          navigator.mediaSession.playbackState = 'none';
        }
      });

      // Update position state periodically
      const positionInterval = setInterval(() => {
        if (!('mediaSession' in navigator)) return;
        const { duration, currentTime, playbackState } = store.getState();
        if (duration > 0 && playbackState === 'playing' && navigator.mediaSession.setPositionState) {
          try {
            navigator.mediaSession.setPositionState({
              duration,
              playbackRate: audio.playbackRate || 1,
              position: Math.min(currentTime, duration),
            });
          } catch {
            // Position state can throw if values are invalid
          }
        }
      }, 1000);

      // Extend cleanup to include media session subscriptions
      const mediaCleanup = () => {
        metaUnsub();
        clearInterval(positionInterval);
      };
      // Store for later cleanup
      (audio as any).__mediaSessionCleanup = mediaCleanup;
    }

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      unsubscribe();
      eqUnsub();
      if ((audio as any).__mediaSessionCleanup) {
        (audio as any).__mediaSessionCleanup();
      }
      audio.pause();
      audio.src = '';
    };
  }, [seek]);

  return { seek };
}
