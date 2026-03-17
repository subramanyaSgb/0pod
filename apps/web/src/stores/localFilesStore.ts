import { create } from 'zustand';
import type { Track } from '@0pod/shared';

export interface LocalFile {
  id: string;
  track: Track;
  blob: Blob;
  addedAt: number;
}

const DB_NAME = '0pod-local-files';
const STORE_NAME = 'files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
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

async function getAllFiles(): Promise<LocalFile[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putFile(file: LocalFile): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(file);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteFile(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getFile(id: string): Promise<LocalFile | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function parseFilename(name: string): { title: string; artist: string } {
  // Try "Artist - Title.ext" format
  const withoutExt = name.replace(/\.[^.]+$/, '');
  const parts = withoutExt.split(' - ');
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
  }
  return { title: withoutExt, artist: 'Unknown Artist' };
}

interface LocalFilesStore {
  files: LocalFile[];
  tracks: Track[];
  loadFiles: () => Promise<void>;
  addFiles: (fileList: FileList) => Promise<void>;
  removeFile: (id: string) => Promise<void>;
  getBlob: (id: string) => Promise<Blob | null>;
}

export const useLocalFilesStore = create<LocalFilesStore>((set) => ({
  files: [],
  tracks: [],

  loadFiles: async () => {
    try {
      const files = await getAllFiles();
      set({ files, tracks: files.map((f) => f.track) });
    } catch {
      // IndexedDB unavailable
    }
  },

  addFiles: async (fileList) => {
    const newFiles: LocalFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.type.startsWith('audio/')) continue;

      const id = `local-${Date.now()}-${i}`;
      const { title, artist } = parseFilename(file.name);

      const localFile: LocalFile = {
        id,
        track: {
          id,
          source: 'local',
          title,
          artist,
          duration: 0, // Will be set when played
          artworkUrl: undefined,
        },
        blob: file,
        addedAt: Date.now(),
      };

      await putFile(localFile);
      newFiles.push(localFile);
    }

    set((s) => ({
      files: [...s.files, ...newFiles],
      tracks: [...s.tracks, ...newFiles.map((f) => f.track)],
    }));
  },

  removeFile: async (id) => {
    await deleteFile(id);
    set((s) => ({
      files: s.files.filter((f) => f.id !== id),
      tracks: s.tracks.filter((t) => t.id !== id),
    }));
  },

  getBlob: async (id) => {
    const file = await getFile(id);
    return file?.blob || null;
  },
}));
