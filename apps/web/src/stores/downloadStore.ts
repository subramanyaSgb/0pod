import { create } from 'zustand';
import type { Track, QualityTier } from '@0pod/shared';
import { api } from '../services/api';

export interface DownloadRecord {
  id: string; // '{source}:{trackId}'
  track: Track;
  audioBlob: Blob;
  sizeBytes: number;
  quality: QualityTier;
  downloadedAt: number;
  lastPlayedAt: number;
}

interface DownloadProgress {
  trackId: string;
  progress: number; // 0-100
  status: 'downloading' | 'complete' | 'error';
}

interface DownloadStore {
  downloads: DownloadRecord[];
  activeDownloads: DownloadProgress[];
  totalSizeBytes: number;

  // Actions
  loadDownloads: () => Promise<void>;
  downloadTrack: (track: Track, quality?: QualityTier) => Promise<void>;
  deleteDownload: (id: string) => Promise<void>;
  getDownloadedBlob: (trackId: string, source: string) => Promise<Blob | null>;
  isDownloaded: (trackId: string, source: string) => boolean;
  clearOldDownloads: (daysOld: number) => Promise<void>;
}

// IndexedDB helpers
const DB_NAME = '0pod-downloads';
const STORE_NAME = 'tracks';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllRecords(): Promise<DownloadRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putRecord(record: DownloadRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteRecord(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getRecord(id: string): Promise<DownloadRecord | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  downloads: [],
  activeDownloads: [],
  totalSizeBytes: 0,

  loadDownloads: async () => {
    try {
      const records = await getAllRecords();
      const totalSizeBytes = records.reduce((sum, r) => sum + r.sizeBytes, 0);
      set({ downloads: records, totalSizeBytes });
    } catch {
      // IndexedDB may not be available
    }
  },

  downloadTrack: async (track, quality = 'normal') => {
    const id = `${track.source}:${track.id}`;

    // Check if already downloaded
    if (get().isDownloaded(track.id, track.source)) return;

    // Add to active downloads
    set((s) => ({
      activeDownloads: [
        ...s.activeDownloads,
        { trackId: track.id, progress: 0, status: 'downloading' },
      ],
    }));

    try {
      // Get stream URL
      const streamInfo = await api.getStreamUrl(track.source, track.id, quality);

      // Download the audio
      const response = await fetch(streamInfo.url);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();

      const record: DownloadRecord = {
        id,
        track,
        audioBlob: blob,
        sizeBytes: blob.size,
        quality,
        downloadedAt: Date.now(),
        lastPlayedAt: 0,
      };

      await putRecord(record);

      // Update state
      set((s) => ({
        downloads: [...s.downloads, record],
        totalSizeBytes: s.totalSizeBytes + blob.size,
        activeDownloads: s.activeDownloads.map((d) =>
          d.trackId === track.id ? { ...d, progress: 100, status: 'complete' as const } : d,
        ),
      }));

      // Remove from active after a delay
      setTimeout(() => {
        set((s) => ({
          activeDownloads: s.activeDownloads.filter((d) => d.trackId !== track.id),
        }));
      }, 2000);
    } catch {
      set((s) => ({
        activeDownloads: s.activeDownloads.map((d) =>
          d.trackId === track.id ? { ...d, status: 'error' as const } : d,
        ),
      }));
    }
  },

  deleteDownload: async (id) => {
    await deleteRecord(id);
    set((s) => {
      const record = s.downloads.find((d) => d.id === id);
      return {
        downloads: s.downloads.filter((d) => d.id !== id),
        totalSizeBytes: s.totalSizeBytes - (record?.sizeBytes || 0),
      };
    });
  },

  getDownloadedBlob: async (trackId, source) => {
    const id = `${source}:${trackId}`;
    const record = await getRecord(id);
    return record?.audioBlob || null;
  },

  isDownloaded: (trackId, source) => {
    return get().downloads.some((d) => d.id === `${source}:${trackId}`);
  },

  clearOldDownloads: async (daysOld) => {
    const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    const toDelete = get().downloads.filter(
      (d) => d.lastPlayedAt < cutoff && d.downloadedAt < cutoff,
    );
    for (const d of toDelete) {
      await deleteRecord(d.id);
    }
    set((s) => ({
      downloads: s.downloads.filter((d) => !toDelete.includes(d)),
      totalSizeBytes: s.totalSizeBytes - toDelete.reduce((sum, d) => sum + d.sizeBytes, 0),
    }));
  },
}));
