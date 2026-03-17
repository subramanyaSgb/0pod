import { Innertube } from 'youtubei.js';

let innertube: Innertube | null = null;

async function getClient(): Promise<Innertube> {
  if (!innertube) {
    innertube = await Innertube.create({
      lang: 'en',
      location: 'US',
    });
  }
  return innertube;
}

export interface YTTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  artworkUrl?: string;
}

export async function searchYouTube(query: string): Promise<{ tracks: YTTrack[] }> {
  const yt = await getClient();
  const results = await yt.music.search(query, { type: 'song' });

  const tracks: YTTrack[] = [];

  if (results.contents) {
    const items = results.contents.flatMap((section: any) => {
      if (section.contents) return section.contents;
      return [section];
    });

    for (const item of items.slice(0, 20)) {
      try {
        const track: YTTrack = {
          id: item.id || item.video_id || '',
          title: item.title?.text || item.title || 'Unknown',
          artist: item.artists?.[0]?.name || item.author?.name || 'Unknown',
          album: item.album?.name || undefined,
          duration: item.duration?.seconds || 0,
          artworkUrl:
            item.thumbnails?.[0]?.url ||
            item.thumbnail?.[0]?.url ||
            undefined,
        };
        if (track.id) tracks.push(track);
      } catch {
        // Skip malformed results
      }
    }
  }

  return { tracks };
}

export async function getTrackInfo(videoId: string): Promise<YTTrack | null> {
  const yt = await getClient();
  try {
    const info = await yt.music.getInfo(videoId);
    if (!info.basic_info) return null;

    return {
      id: videoId,
      title: info.basic_info.title || 'Unknown',
      artist: info.basic_info.author || 'Unknown',
      album: undefined,
      duration: info.basic_info.duration || 0,
      artworkUrl: info.basic_info.thumbnail?.[0]?.url || undefined,
    };
  } catch {
    return null;
  }
}

export async function getStreamUrl(
  videoId: string,
  quality: string = 'normal',
): Promise<{ url: string; format: string; bitrate: number } | null> {
  const yt = await getClient();
  try {
    const info = await yt.getInfo(videoId);

    const audioFormats =
      info.streaming_data?.adaptive_formats
        ?.filter((f: any) => f.mime_type?.startsWith('audio/'))
        ?.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0)) || [];

    if (audioFormats.length === 0) {
      const combined =
        info.streaming_data?.formats?.sort(
          (a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0),
        ) || [];
      if (combined.length === 0) return null;

      const format = combined[0];
      const url = format.decipher?.(yt.session.player) || format.url;
      return {
        url: typeof url === 'string' ? url : '',
        format: 'mp4',
        bitrate: format.bitrate || 128000,
      };
    }

    let selected: any;
    switch (quality) {
      case 'low':
        selected = audioFormats[audioFormats.length - 1];
        break;
      case 'high':
      case 'lossless':
        selected = audioFormats[0];
        break;
      default:
        selected =
          audioFormats[Math.floor(audioFormats.length / 2)] || audioFormats[0];
    }

    const url = selected.decipher?.(yt.session.player) || selected.url;
    const mimeType = selected.mime_type || 'audio/mp4';
    const format = mimeType.includes('webm')
      ? 'opus'
      : mimeType.includes('mp4')
        ? 'aac'
        : 'mp3';

    return {
      url: typeof url === 'string' ? url : '',
      format,
      bitrate: selected.bitrate || 128000,
    };
  } catch (e) {
    console.error('Failed to get stream URL:', e);
    return null;
  }
}
