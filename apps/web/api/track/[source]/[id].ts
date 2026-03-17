import type { VercelRequest, VercelResponse } from '@vercel/node';

const YT_MUSIC_API = 'https://music.youtube.com/youtubei/v1';
const YT_API_KEY = 'AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30';

async function ytTrackInfo(videoId: string) {
  const res = await fetch(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
  );
  if (!res.ok) return null;
  const d: any = await res.json();
  return { id: videoId, source: 'youtube', title: d.title || 'Unknown', artist: d.author_name || 'Unknown', duration: 0, artworkUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` };
}

let spToken: string | null = null, spExpiry = 0;
async function spFetch(path: string) {
  const cid = process.env.SPOTIFY_CLIENT_ID || '', cs = process.env.SPOTIFY_CLIENT_SECRET || '';
  if (!cid || !cs) throw new Error('Not configured');
  if (!spToken || Date.now() >= spExpiry) {
    const r = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${Buffer.from(`${cid}:${cs}`).toString('base64')}` }, body: 'grant_type=client_credentials' });
    const d: any = await r.json(); spToken = d.access_token; spExpiry = Date.now() + (d.expires_in - 60) * 1000;
  }
  const r = await fetch(`https://api.spotify.com/v1${path}`, { headers: { Authorization: `Bearer ${spToken}` } });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

async function spTrackInfo(id: string) {
  const item: any = await spFetch(`/tracks/${id}`);
  return { id: item.id, source: 'spotify', title: item.name || 'Unknown', artist: item.artists?.map((a: any) => a.name).join(', ') || 'Unknown', album: item.album?.name, duration: Math.floor((item.duration_ms || 0) / 1000), artworkUrl: item.album?.images?.[0]?.url };
}

let scCid: string | null = null;
async function scFetch(path: string) {
  if (!scCid) {
    if (process.env.SOUNDCLOUD_CLIENT_ID) { scCid = process.env.SOUNDCLOUD_CLIENT_ID; }
    else {
      const h = await (await fetch('https://soundcloud.com')).text();
      const ss = h.match(/src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g) || [];
      for (const t of ss.slice(-3)) { const u = t.match(/src="([^"]+)"/)?.[1]; if (!u) continue; const m = (await (await fetch(u)).text()).match(/client_id:"([a-zA-Z0-9]+)"/); if (m) { scCid = m[1]; break; } }
      if (!scCid) throw new Error('No SC client_id');
    }
  }
  const url = new URL(`https://api-v2.soundcloud.com${path}`); url.searchParams.set('client_id', scCid);
  const r = await fetch(url.toString()); if (!r.ok) throw new Error(`${r.status}`); return r.json();
}

async function scTrackInfo(id: string) {
  const item: any = await scFetch(`/tracks/${id}`);
  return { id: String(item.id), source: 'soundcloud', title: item.title || 'Unknown', artist: item.user?.username || 'Unknown', duration: Math.floor((item.duration || 0) / 1000), artworkUrl: item.artwork_url?.replace('-large', '-t500x500') };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const source = req.query.source as string, id = req.query.id as string;
  try {
    let track;
    if (source === 'youtube') track = await ytTrackInfo(id);
    else if (source === 'spotify') track = await spTrackInfo(id);
    else if (source === 'soundcloud') track = await scTrackInfo(id);
    else return res.status(404).json({ ok: false, error: 'Source not supported' });
    if (!track) return res.status(404).json({ ok: false, error: 'Track not found' });
    return res.status(200).json({ ok: true, data: track });
  } catch (e: any) { return res.status(500).json({ ok: false, error: e?.message }); }
}
