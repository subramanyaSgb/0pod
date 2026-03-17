import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q = req.query.q as string | undefined;
  const sources = req.query.sources as string | undefined;

  if (!q) return res.status(400).json({ ok: false, error: 'Missing query' });

  const allowedSources = sources ? sources.split(',') : ['youtube', 'spotify', 'soundcloud'];
  const results: any[] = [];
  const errors: string[] = [];

  try {
    if (allowedSources.includes('youtube')) {
      try {
        const { searchYouTube } = await import('./providers/youtube');
        const ytResult = await searchYouTube(q);
        results.push({
          tracks: ytResult.tracks.map((t) => ({
            id: t.id, source: 'youtube', title: t.title,
            artist: t.artist, album: t.album, duration: t.duration,
            artworkUrl: t.artworkUrl,
          })),
          albums: [], artists: [], source: 'youtube',
        });
      } catch (err: any) {
        errors.push(`youtube: ${err?.message || String(err)}`);
      }
    }

    if (allowedSources.includes('spotify')) {
      try {
        const { searchSpotify, isSpotifyConfigured } = await import('./providers/spotify');
        if (isSpotifyConfigured()) {
          const spResult = await searchSpotify(q);
          results.push({
            tracks: spResult.tracks.map((t) => ({
              id: t.id, source: 'spotify', title: t.title,
              artist: t.artist, album: t.album, duration: t.duration,
              artworkUrl: t.artworkUrl,
            })),
            albums: [], artists: [], source: 'spotify',
          });
        }
      } catch (err: any) {
        errors.push(`spotify: ${err?.message || String(err)}`);
      }
    }

    if (allowedSources.includes('soundcloud')) {
      try {
        const { searchSoundCloud } = await import('./providers/soundcloud');
        const scResult = await searchSoundCloud(q);
        results.push({
          tracks: scResult.tracks.map((t) => ({
            id: t.id, source: 'soundcloud', title: t.title,
            artist: t.artist, duration: t.duration,
            artworkUrl: t.artworkUrl,
          })),
          albums: [], artists: [], source: 'soundcloud',
        });
      } catch (err: any) {
        errors.push(`soundcloud: ${err?.message || String(err)}`);
      }
    }

    return res.status(200).json({
      ok: true,
      data: results,
      ...(errors.length > 0 ? { errors } : {}),
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message || String(err),
      stack: err?.stack,
    });
  }
}
