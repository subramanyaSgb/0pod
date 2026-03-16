import type { Track, Album, Artist, SearchResult, ApiResponse, Quality } from '@0pod/shared';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json: ApiResponse<T> = await res.json();
  if (!json.ok) throw new Error('API returned error');
  return json.data;
}

export const api = {
  search: (query: string, sources?: string) =>
    fetchApi<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}${sources ? `&sources=${sources}` : ''}`),

  getTrack: (source: string, id: string) =>
    fetchApi<Track>(`/api/track/${source}/${id}`),

  getAlbum: (source: string, id: string) =>
    fetchApi<Album & { tracks: Track[] }>(`/api/album/${source}/${id}`),

  getArtist: (source: string, id: string) =>
    fetchApi<Artist>(`/api/artist/${source}/${id}`),

  getStreamUrl: (source: string, id: string, quality: string = 'normal') =>
    fetchApi<{ url: string; format: string; bitrate: number }>(
      `/api/stream/${source}/${id}?quality=${quality}`,
    ),

  getQualities: (source: string, id: string) =>
    fetchApi<Quality[]>(`/api/track/${source}/${id}/qualities`),

  getLyrics: (source: string, id: string) =>
    fetchApi<{ lines: { time: number; text: string }[] }>(
      `/api/lyrics/${source}/${id}`,
    ),
};
