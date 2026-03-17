import type { VercelRequest, VercelResponse } from '@vercel/node';

// ====== YOUTUBE PROVIDER (inline) ======

const YT_MUSIC_API = 'https://music.youtube.com/youtubei/v1';
const YT_API_KEY = 'AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30';
const YT_CONTEXT = {
  client: { clientName: 'WEB_REMIX', clientVersion: '1.20240101.01.00', hl: 'en', gl: 'US' },
};

function parseDuration(text: string): number {
  const parts = text.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

async function searchYouTube(query: string) {
  const res = await fetch(`${YT_MUSIC_API}/search?key=${YT_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: YT_CONTEXT,
      query,
      params: 'EgWKAQIIAWoKEAMQBBAJEAoQBQ%3D%3D',
    }),
  });
  if (!res.ok) throw new Error(`YouTube Music API error: ${res.status}`);

  const data = await res.json();
  const tracks: any[] = [];
  const contents = data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]
    ?.tabRenderer?.content?.sectionListRenderer?.contents || [];

  for (const section of contents) {
    const items = section.musicShelfRenderer?.contents || [];
    for (const item of items.slice(0, 20)) {
      try {
        const r = item.musicResponsiveListItemRenderer;
        if (!r) continue;
        const fc = r.flexColumns || [];
        const title = fc[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || 'Unknown';
        const subtitleRuns = fc[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
        const artist = subtitleRuns[0]?.text || 'Unknown';
        const textParts = subtitleRuns.filter((_: any, i: number) => i % 2 === 0).map((r: any) => r.text);
        const lastPart = textParts[textParts.length - 1] || '';
        const duration = /^\d+:\d+/.test(lastPart) ? parseDuration(lastPart) : 0;
        const album = textParts.length >= 3 ? textParts[textParts.length - 2] : undefined;
        const videoId = r.overlay?.musicItemThumbnailOverlayRenderer?.content
          ?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId
          || r.playlistItemData?.videoId || '';
        const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
        const artworkUrl = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : undefined;
        if (videoId) tracks.push({ id: videoId, source: 'youtube', title, artist, album, duration, artworkUrl });
      } catch { /* skip */ }
    }
  }
  return tracks;
}

// ====== SPOTIFY PROVIDER (inline) ======

let spToken: string | null = null;
let spExpiry = 0;

async function getSpotifyToken(): Promise<string> {
  const cid = process.env.SPOTIFY_CLIENT_ID || '';
  const cs = process.env.SPOTIFY_CLIENT_SECRET || '';
  if (!cid || !cs) throw new Error('Spotify not configured');
  if (spToken && Date.now() < spExpiry) return spToken;
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${cid}:${cs}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error('Spotify token failed');
  const d: any = await r.json();
  spToken = d.access_token;
  spExpiry = Date.now() + (d.expires_in - 60) * 1000;
  return spToken!;
}

async function searchSpotify(query: string) {
  const token = await getSpotifyToken();
  const r = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`Spotify API error: ${r.status}`);
  const d: any = await r.json();
  return ((d.tracks?.items as any[]) || []).map((item: any) => ({
    id: item.id, source: 'spotify',
    title: item.name || 'Unknown',
    artist: item.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
    album: item.album?.name || undefined,
    duration: Math.floor((item.duration_ms || 0) / 1000),
    artworkUrl: item.album?.images?.[0]?.url || undefined,
  }));
}

function isSpotifyConfigured() {
  return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

// ====== SOUNDCLOUD PROVIDER (inline) ======

let scClientId: string | null = null;

async function getSCClientId(): Promise<string> {
  if (scClientId) return scClientId;
  if (process.env.SOUNDCLOUD_CLIENT_ID) { scClientId = process.env.SOUNDCLOUD_CLIENT_ID; return scClientId; }
  const res = await fetch('https://soundcloud.com');
  const html = await res.text();
  const scripts = html.match(/src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g) || [];
  for (const tag of scripts.slice(-3)) {
    const url = tag.match(/src="([^"]+)"/)?.[1];
    if (!url) continue;
    const sr = await fetch(url);
    const txt = await sr.text();
    const m = txt.match(/client_id:"([a-zA-Z0-9]+)"/);
    if (m) { scClientId = m[1]; return scClientId; }
  }
  throw new Error('Could not obtain SoundCloud client_id');
}

async function searchSoundCloud(query: string) {
  const cid = await getSCClientId();
  const url = new URL('https://api-v2.soundcloud.com/search/tracks');
  url.searchParams.set('client_id', cid);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '20');
  const r = await fetch(url.toString());
  if (!r.ok) throw new Error(`SoundCloud error: ${r.status}`);
  const d: any = await r.json();
  return ((d.collection || []) as any[]).map((item: any) => ({
    id: String(item.id), source: 'soundcloud',
    title: item.title || 'Unknown',
    artist: item.user?.username || 'Unknown',
    duration: Math.floor((item.duration || 0) / 1000),
    artworkUrl: item.artwork_url?.replace('-large', '-t500x500') || item.user?.avatar_url,
  }));
}

// ====== HANDLER ======

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q = req.query.q as string | undefined;
  const sources = req.query.sources as string | undefined;
  if (!q) return res.status(400).json({ ok: false, error: 'Missing query' });

  const allowed = sources ? sources.split(',') : ['youtube', 'spotify', 'soundcloud'];
  const allTracks: any[] = [];
  const errors: string[] = [];

  if (allowed.includes('youtube')) {
    try { allTracks.push(...(await searchYouTube(q)).map(t => ({ ...t, source: 'youtube' }))); }
    catch (e: any) { errors.push(`youtube: ${e?.message}`); }
  }

  if (allowed.includes('spotify') && isSpotifyConfigured()) {
    try { allTracks.push(...await searchSpotify(q)); }
    catch (e: any) { errors.push(`spotify: ${e?.message}`); }
  }

  if (allowed.includes('soundcloud')) {
    try { allTracks.push(...await searchSoundCloud(q)); }
    catch (e: any) { errors.push(`soundcloud: ${e?.message}`); }
  }

  // Group by source to match expected format
  const grouped: Record<string, any[]> = {};
  for (const t of allTracks) {
    if (!grouped[t.source]) grouped[t.source] = [];
    grouped[t.source].push(t);
  }
  const data = Object.entries(grouped).map(([source, tracks]) => ({
    tracks, albums: [], artists: [], source,
  }));

  return res.status(200).json({ ok: true, data, ...(errors.length > 0 ? { errors } : {}) });
}
