import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { useDownloadStore } from '../stores/downloadStore';
import { useLocalFilesStore } from '../stores/localFilesStore';
import { api } from '../services/api';

export function useAudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

      // Update metadata when track changes
      store.subscribe((state) => {
        if (state.currentTrack && 'mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: state.currentTrack.title,
            artist: state.currentTrack.artist,
            album: state.currentTrack.album || '',
            artwork: state.currentTrack.artworkUrl
              ? [{ src: state.currentTrack.artworkUrl, sizes: '512x512', type: 'image/jpeg' }]
              : [],
          });
        }
      });
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
      audio.pause();
      audio.src = '';
    };
  }, [seek]);

  return { seek };
}
