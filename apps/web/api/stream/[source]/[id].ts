import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStreamUrl } from '../../_providers/youtube';
import { getSpotifyStreamUrl } from '../../_providers/spotify';
import { getSCStreamUrl } from '../../_providers/soundcloud';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const source = req.query.source as string;
  const id = req.query.id as string;
  const quality = (req.query.quality as string) || 'normal';

  if (source === 'youtube') {
    try {
      const stream = await getStreamUrl(id, quality);
      if (!stream) return res.status(404).json({ ok: false, error: 'Stream not available' });
      return res.status(200).json({ ok: true, data: stream });
    } catch {
      return res.status(500).json({ ok: false, error: 'Failed to get stream' });
    }
  }

  if (source === 'spotify') {
    try {
      const stream = await getSpotifyStreamUrl(id);
      if (!stream) return res.status(404).json({ ok: false, error: 'Stream not available (no preview URL)' });
      return res.status(200).json({ ok: true, data: stream });
    } catch {
      return res.status(500).json({ ok: false, error: 'Failed to get stream' });
    }
  }

  if (source === 'soundcloud') {
    try {
      const stream = await getSCStreamUrl(id);
      if (!stream) return res.status(404).json({ ok: false, error: 'Stream not available' });
      return res.status(200).json({ ok: true, data: stream });
    } catch {
      return res.status(500).json({ ok: false, error: 'Failed to get stream' });
    }
  }

  return res.status(404).json({ ok: false, error: 'Source not supported' });
}
