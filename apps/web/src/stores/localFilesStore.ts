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

// Patterns to exclude call recordings and system sounds
const EXCLUDE_PATTERNS = [
  /call.?record/i,
  /recorder/i,
  /voice.?record/i,
  /phone.?record/i,
  /ringtone/i,
  /notification/i,
  /alarm/i,
  /^rec[\s_-]/i,
  /^recording[\s_-]/i,
];

const AUDIO_EXTENSIONS = /\.(mp3|m4a|aac|ogg|opus|flac|wav|wma|webm)$/i;

function isCallRecording(name: string, path?: string): boolean {
  const fullPath = path || name;
  return EXCLUDE_PATTERNS.some((p) => p.test(fullPath));
}

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

async function clearAllFiles(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
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

function parseFilename(name: string): { title: string; artist: string; album: string } {
  const withoutExt = name.replace(/\.[^.]+$/, '');
  // Try "Artist - Title" format
  const parts = withoutExt.split(' - ');
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim(), album: '' };
  }
  return { title: withoutExt, artist: 'Unknown Artist', album: '' };
}

interface LocalFilesStore {
  files: LocalFile[];
  tracks: Track[];
  isScanning: boolean;
  hasScanned: boolean;
  loadFiles: () => Promise<void>;
  addFiles: (fileList: FileList) => Promise<void>;
  scanDirectory: () => Promise<void>;
  getBlob: (id: string) => Promise<Blob | null>;
  getArtists: () => string[];
  getAlbums: () => string[];
  getTracksByArtist: (artist: string) => Track[];
}

export const useLocalFilesStore = create<LocalFilesStore>((set, get) => ({
  files: [],
  tracks: [],
  isScanning: false,
  hasScanned: false,

  loadFiles: async () => {
    try {
      const files = await getAllFiles();
      const sorted = files.sort((a, b) => a.track.title.localeCompare(b.track.title));
      set({ files: sorted, tracks: sorted.map((f) => f.track), hasScanned: sorted.length > 0 });
    } catch {
      // IndexedDB unavailable
    }
  },

  addFiles: async (fileList) => {
    const newFiles: LocalFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.type.startsWith('audio/') && !AUDIO_EXTENSIONS.test(file.name)) continue;
      // Filter out call recordings
      const path = (file as any).webkitRelativePath || file.name;
      if (isCallRecording(file.name, path)) continue;

      const id = `local-${Date.now()}-${i}`;
      const { title, artist, album } = parseFilename(file.name);

      const localFile: LocalFile = {
        id,
        track: { id, source: 'local', title, artist, album, duration: 0, artworkUrl: undefined },
        blob: file,
        addedAt: Date.now(),
      };

      await putFile(localFile);
      newFiles.push(localFile);
    }

    set((s) => {
      const all = [...s.files, ...newFiles].sort((a, b) => a.track.title.localeCompare(b.track.title));
      return { files: all, tracks: all.map((f) => f.track), hasScanned: true };
    });
  },

  scanDirectory: async () => {
    set({ isScanning: true });

    try {
      // Try File System Access API (Chrome/Edge on Android)
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
        await clearAllFiles();
        const newFiles: LocalFile[] = [];

        async function scanDir(handle: any, path: string) {
          for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
              const file: File = await entry.getFile();
              if (!file.type.startsWith('audio/') && !AUDIO_EXTENSIONS.test(file.name)) continue;
              const fullPath = `${path}/${file.name}`;
              if (isCallRecording(file.name, fullPath)) continue;

              const id = `local-${Date.now()}-${newFiles.length}`;
              const { title, artist, album } = parseFilename(file.name);
              newFiles.push({
                id,
                track: { id, source: 'local', title, artist, album, duration: 0, artworkUrl: undefined },
                blob: file,
                addedAt: Date.now(),
              });
            } else if (entry.kind === 'directory') {
              // Skip call recording directories
              if (isCallRecording(entry.name, entry.name)) continue;
              await scanDir(entry, `${path}/${entry.name}`);
            }
          }
        }

        await scanDir(dirHandle, '');
        for (const f of newFiles) await putFile(f);
        const sorted = newFiles.sort((a, b) => a.track.title.localeCompare(b.track.title));
        set({ files: sorted, tracks: sorted.map((f) => f.track), isScanning: false, hasScanned: true });
        return;
      }

      // Fallback: use file input with webkitdirectory
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.setAttribute('webkitdirectory', '');
      input.setAttribute('directory', '');
      input.accept = 'audio/*';

      input.onchange = async () => {
        if (!input.files || input.files.length === 0) {
          set({ isScanning: false });
          return;
        }
        await clearAllFiles();
        await get().addFiles(input.files);
        set({ isScanning: false });
      };

      input.oncancel = () => set({ isScanning: false });
      input.click();
    } catch {
      set({ isScanning: false });
    }
  },

  getBlob: async (id) => {
    const file = await getFile(id);
    return file?.blob || null;
  },

  getArtists: () => {
    const artists = new Set(get().tracks.map((t) => t.artist));
    return [...artists].sort();
  },

  getAlbums: () => {
    const albums = new Set(get().tracks.map((t) => t.album).filter(Boolean) as string[]);
    return [...albums].sort();
  },

  getTracksByArtist: (artist: string) => {
    return get().tracks.filter((t) => t.artist === artist);
  },
}));
