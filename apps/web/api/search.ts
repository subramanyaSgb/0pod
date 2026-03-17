import type { VercelRequest, VercelResponse } from '@vercel/node';
import { searchYouTube } from './_providers/youtube';
import { searchSpotify, isSpotifyConfigured } from './_providers/spotify';
import { searchSoundCloud } from './_providers/soundcloud';

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

  if (allowedSources.includes('youtube')) {
    try {
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
      errors.push(`youtube: ${err?.message || 'unknown error'}`);
      console.error('YouTube search failed:', err);
    }
  }

  if (allowedSources.includes('spotify') && isSpotifyConfigured()) {
    try {
      const spResult = await searchSpotify(q);
      results.push({
        tracks: spResult.tracks.map((t) => ({
          id: t.id, source: 'spotify', title: t.title,
          artist: t.artist, album: t.album, duration: t.duration,
          artworkUrl: t.artworkUrl,
        })),
        albums: [], artists: [], source: 'spotify',
      });
    } catch (err: any) {
      errors.push(`spotify: ${err?.message || 'unknown error'}`);
      console.error('Spotify search failed:', err);
    }
  }

  if (allowedSources.includes('soundcloud')) {
    try {
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
      errors.push(`soundcloud: ${err?.message || 'unknown error'}`);
      console.error('SoundCloud search failed:', err);
    }
  }

  return res.status(200).json({
    ok: true,
    data: results,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
