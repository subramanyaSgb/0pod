import type { FastifyInstance } from 'fastify';
import {
  searchYouTube,
  getTrackInfo,
  getStreamUrl,
} from '../providers/youtube';
import {
  searchSpotify,
  getSpotifyTrack,
  getSpotifyStreamUrl,
  isSpotifyConfigured,
} from '../providers/spotify';
import {
  searchSoundCloud,
  getSCTrack,
  getSCStreamUrl,
} from '../providers/soundcloud';

export async function musicRoutes(server: FastifyInstance) {
  // Search
  server.get('/api/search', async (request, reply) => {
    const { q, sources } = request.query as { q?: string; sources?: string };
    if (!q) return reply.status(400).send({ ok: false, error: 'Missing query' });

    const allowedSources = sources ? sources.split(',') : ['youtube', 'spotify', 'soundcloud'];

    try {
      const results: {
        tracks: {
          id: string;
          source: string;
          title: string;
          artist: string;
          album?: string;
          duration: number;
          artworkUrl?: string;
        }[];
        albums: never[];
        artists: never[];
        source: string;
      }[] = [];

      // YouTube search
      if (allowedSources.includes('youtube')) {
        const ytResult = await searchYouTube(q);
        results.push({
          tracks: ytResult.tracks.map((t) => ({
            id: t.id,
            source: 'youtube' as const,
            title: t.title,
            artist: t.artist,
            album: t.album,
            duration: t.duration,
            artworkUrl: t.artworkUrl,
          })),
          albums: [],
          artists: [],
          source: 'youtube',
        });
      }

      // Spotify search (if configured)
      if (allowedSources.includes('spotify') && isSpotifyConfigured()) {
        try {
          const spResult = await searchSpotify(q);
          results.push({
            tracks: spResult.tracks.map((t) => ({
              id: t.id,
              source: 'spotify' as const,
              title: t.title,
              artist: t.artist,
              album: t.album,
              duration: t.duration,
              artworkUrl: t.artworkUrl,
            })),
            albums: [],
            artists: [],
            source: 'spotify',
          });
        } catch (err) {
          server.log.warn('Spotify search failed, skipping: %s', err);
        }
      }

      // SoundCloud search (always available — auto-discovers client_id)
      if (allowedSources.includes('soundcloud')) {
        try {
          const scResult = await searchSoundCloud(q);
          results.push({
            tracks: scResult.tracks.map((t) => ({
              id: t.id,
              source: 'soundcloud' as const,
              title: t.title,
              artist: t.artist,
              duration: t.duration,
              artworkUrl: t.artworkUrl,
            })),
            albums: [],
            artists: [],
            source: 'soundcloud',
          });
        } catch (err) {
          server.log.warn('SoundCloud search failed, skipping: %s', err);
        }
      }

      return { ok: true, data: results };
    } catch {
      return reply.status(500).send({ ok: false, error: 'Search failed' });
    }
  });

  // Track info
  server.get('/api/track/:source/:id', async (request, reply) => {
    const { source, id } = request.params as { source: string; id: string };

    if (source === 'youtube') {
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
    }

    if (source === 'spotify') {
      try {
        const track = await getSpotifyTrack(id);
        if (!track)
          return reply
            .status(404)
            .send({ ok: false, error: 'Track not found' });
        return { ok: true, data: { ...track, source: 'spotify' } };
      } catch {
        return reply
          .status(500)
          .send({ ok: false, error: 'Failed to get track info' });
      }
    }

    if (source === 'soundcloud') {
      try {
        const track = await getSCTrack(id);
        if (!track)
          return reply
            .status(404)
            .send({ ok: false, error: 'Track not found' });
        return { ok: true, data: { ...track, source: 'soundcloud' } };
      } catch {
        return reply
          .status(500)
          .send({ ok: false, error: 'Failed to get track info' });
      }
    }

    return reply
      .status(404)
      .send({ ok: false, error: 'Source not supported yet' });
  });

  // Stream URL
  server.get('/api/stream/:source/:id', async (request, reply) => {
    const { source, id } = request.params as { source: string; id: string };
    const { quality } = request.query as { quality?: string };

    if (source === 'youtube') {
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
    }

    if (source === 'spotify') {
      try {
        const stream = await getSpotifyStreamUrl(id);
        if (!stream)
          return reply
            .status(404)
            .send({ ok: false, error: 'Stream not available (no preview URL)' });
        return { ok: true, data: stream };
      } catch {
        return reply
          .status(500)
          .send({ ok: false, error: 'Failed to get stream' });
      }
    }

    if (source === 'soundcloud') {
      try {
        const stream = await getSCStreamUrl(id);
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
    }

    return reply
      .status(404)
      .send({ ok: false, error: 'Source not supported yet' });
  });
}
