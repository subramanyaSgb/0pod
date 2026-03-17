import type { VercelRequest, VercelResponse } from '@vercel/node';

const YT_MUSIC_API = 'https://music.youtube.com/youtubei/v1';
const YT_API_KEY = 'AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30';

async function ytStream(videoId: string, quality: string) {
  const r = await fetch(`${YT_MUSIC_API}/player?key=${YT_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: { client: { clientName: 'ANDROID_MUSIC', clientVersion: '5.28.1', androidSdkVersion: 30, hl: 'en', gl: 'US' } }, videoId }),
  });
  if (!r.ok) return null;
  const d: any = await r.json();
  const af = (d.streamingData?.adaptiveFormats || []).filter((f: any) => f.mimeType?.startsWith('audio/')).sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
  if (af.length === 0) {
    const fmts = (d.streamingData?.formats || []).sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
    if (fmts.length === 0) return null;
    return { url: fmts[0].url || '', format: 'mp4', bitrate: fmts[0].bitrate || 128000 };
  }
  let sel: any;
  if (quality === 'low') sel = af[af.length - 1]; else if (quality === 'high' || quality === 'lossless') sel = af[0]; else sel = af[Math.floor(af.length / 2)] || af[0];
  const mt = sel.mimeType || 'audio/mp4';
  return { url: sel.url || '', format: mt.includes('webm') ? 'opus' : mt.includes('mp4') ? 'aac' : 'mp3', bitrate: sel.bitrate || 128000 };
}

let spToken: string | null = null, spExpiry = 0;
async function spStream(trackId: string) {
  const cid = process.env.SPOTIFY_CLIENT_ID || '', cs = process.env.SPOTIFY_CLIENT_SECRET || '';
  if (!cid || !cs) return null;
  if (!spToken || Date.now() >= spExpiry) {
    const r = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${Buffer.from(`${cid}:${cs}`).toString('base64')}` }, body: 'grant_type=client_credentials' });
    const d: any = await r.json(); spToken = d.access_token; spExpiry = Date.now() + (d.expires_in - 60) * 1000;
  }
  const r = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, { headers: { Authorization: `Bearer ${spToken}` } });
  if (!r.ok) return null;
  const d: any = await r.json();
  if (!d.preview_url) return null;
  return { url: d.preview_url, format: 'mp3', bitrate: 128000 };
}

let scCid: string | null = null;
async function scStream(trackId: string) {
  if (!scCid) {
    if (process.env.SOUNDCLOUD_CLIENT_ID) { scCid = process.env.SOUNDCLOUD_CLIENT_ID; }
    else {
      const h = await (await fetch('https://soundcloud.com')).text();
      const ss = h.match(/src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g) || [];
      for (const t of ss.slice(-3)) { const u = t.match(/src="([^"]+)"/)?.[1]; if (!u) continue; const m = (await (await fetch(u)).text()).match(/client_id:"([a-zA-Z0-9]+)"/); if (m) { scCid = m[1]; break; } }
      if (!scCid) return null;
    }
  }
  const url = new URL(`https://api-v2.soundcloud.com/tracks/${trackId}`); url.searchParams.set('client_id', scCid);
  const r = await fetch(url.toString()); if (!r.ok) return null;
  const d: any = await r.json();
  const su = d.media?.transcodings?.[0]?.url;
  if (!su) return null;
  const tr = await fetch(`${su}?client_id=${scCid}`);
  if (!tr.ok) return null;
  const td: any = await tr.json();
  return { url: td.url || '', format: 'mp3', bitrate: 128000 };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const source = req.query.source as string, id = req.query.id as string;
  const quality = (req.query.quality as string) || 'normal';
  try {
    let stream;
    if (source === 'youtube') stream = await ytStream(id, quality);
    else if (source === 'spotify') stream = await spStream(id);
    else if (source === 'soundcloud') stream = await scStream(id);
    else return res.status(404).json({ ok: false, error: 'Source not supported' });
    if (!stream) return res.status(404).json({ ok: false, error: 'Stream not available' });
    return res.status(200).json({ ok: true, data: stream });
  } catch (e: any) { return res.status(500).json({ ok: false, error: e?.message }); }
}
