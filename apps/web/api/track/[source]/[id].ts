import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTrackInfo } from '../../providers/youtube';
import { getSpotifyTrack } from '../../providers/spotify';
import { getSCTrack } from '../../providers/soundcloud';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const source = req.query.source as string;
  const id = req.query.id as string;

  if (source === 'youtube') {
    try {
      const track = await getTrackInfo(id);
      if (!track) return res.status(404).json({ ok: false, error: 'Track not found' });
      return res.status(200).json({ ok: true, data: { ...track, source: 'youtube' } });
    } catch {
      return res.status(500).json({ ok: false, error: 'Failed to get track info' });
    }
  }

  if (source === 'spotify') {
    try {
      const track = await getSpotifyTrack(id);
      if (!track) return res.status(404).json({ ok: false, error: 'Track not found' });
      return res.status(200).json({ ok: true, data: { ...track, source: 'spotify' } });
    } catch {
      return res.status(500).json({ ok: false, error: 'Failed to get track info' });
    }
  }

  if (source === 'soundcloud') {
    try {
      const track = await getSCTrack(id);
      if (!track) return res.status(404).json({ ok: false, error: 'Track not found' });
      return res.status(200).json({ ok: true, data: { ...track, source: 'soundcloud' } });
    } catch {
      return res.status(500).json({ ok: false, error: 'Failed to get track info' });
    }
  }

  return res.status(404).json({ ok: false, error: 'Source not supported' });
}
