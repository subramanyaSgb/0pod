import type { FastifyInstance } from 'fastify';
import {
  searchYouTube,
  getTrackInfo,
  getStreamUrl,
} from '../providers/youtube';

export async function musicRoutes(server: FastifyInstance) {
  // Search
  server.get('/api/search', async (request, reply) => {
    const { q } = request.query as { q?: string; sources?: string };
    if (!q) return reply.status(400).send({ ok: false, error: 'Missing query' });

    try {
      const result = await searchYouTube(q);
      const tracks = result.tracks.map((t) => ({
        id: t.id,
        source: 'youtube' as const,
        title: t.title,
        artist: t.artist,
        album: t.album,
        duration: t.duration,
        artworkUrl: t.artworkUrl,
      }));
      return {
        ok: true,
        data: [{ tracks, albums: [], artists: [], source: 'youtube' }],
      };
    } catch {
      return reply.status(500).send({ ok: false, error: 'Search failed' });
    }
  });

  // Track info
  server.get('/api/track/:source/:id', async (request, reply) => {
    const { source, id } = request.params as { source: string; id: string };
    if (source !== 'youtube') {
      return reply
        .status(404)
        .send({ ok: false, error: 'Source not supported yet' });
    }

    try {
      const track = await getTrackInfo(id);
      if (!track)
        return reply
          .status(404)
          .send({ ok: false, error: 'Track not found' });
      return { ok: true, data: { ...track, source: 'youtube' } };
    } catch {
      return reply
        .status(500)
        .send({ ok: false, error: 'Failed to get track info' });
    }
  });

  // Stream URL
  server.get('/api/stream/:source/:id', async (request, reply) => {
    const { source, id } = request.params as { source: string; id: string };
    const { quality } = request.query as { quality?: string };

    if (source !== 'youtube') {
      return reply
        .status(404)
        .send({ ok: false, error: 'Source not supported yet' });
    }

    try {
      const stream = await getStreamUrl(id, quality || 'normal');
      if (!stream)
        return reply
          .status(404)
          .send({ ok: false, error: 'Stream not available' });
      return { ok: true, data: stream };
    } catch {
      return reply
        .status(500)
        .send({ ok: false, error: 'Failed to get stream' });
    }
  });
}
