// Lightweight YouTube Music provider — no heavy dependencies
// Uses YouTube's internal music API directly

const YT_MUSIC_API = 'https://music.youtube.com/youtubei/v1';
const YT_API_KEY = 'AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30'; // Public YouTube Music innertube key

const CONTEXT = {
  client: {
    clientName: 'WEB_REMIX',
    clientVersion: '1.20240101.01.00',
    hl: 'en',
    gl: 'US',
  },
};

export interface YTTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  artworkUrl?: string;
}

export async function searchYouTube(query: string): Promise<{ tracks: YTTrack[] }> {
  const res = await fetch(`${YT_MUSIC_API}/search?key=${YT_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: CONTEXT,
      query,
      params: 'EgWKAQIIAWoKEAMQBBAJEAoQBQ%3D%3D', // filter: songs
    }),
  });

  if (!res.ok) {
    throw new Error(`YouTube Music API error: ${res.status}`);
  }

  const data = await res.json();
  const tracks: YTTrack[] = [];

  try {
    // Navigate the nested response structure
    const contents = data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]
      ?.tabRenderer?.content?.sectionListRenderer?.contents || [];

    for (const section of contents) {
      const items = section.musicShelfRenderer?.contents || [];
      for (const item of items.slice(0, 20)) {
        try {
          const flexColumns = item.musicResponsiveListItemRenderer?.flexColumns || [];
          const title = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer
            ?.text?.runs?.[0]?.text || 'Unknown';

          // Artist and album are in the second flex column, separated by " • "
          const subtitleRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer
            ?.text?.runs || [];
          const artist = subtitleRuns[0]?.text || 'Unknown';
          const album = subtitleRuns.length >= 5 ? subtitleRuns[4]?.text : undefined;

          // Duration is in the fixed columns
          const fixedColumns = item.musicResponsiveListItemRenderer?.fixedColumns || [];
          const durationText = fixedColumns[0]?.musicResponsiveListItemFixedColumnRenderer
            ?.text?.runs?.[0]?.text || '0:00';
          const duration = parseDuration(durationText);

          // Video ID from overlay or navigation
          const videoId = item.musicResponsiveListItemRenderer?.overlay
            ?.musicItemThumbnailOverlayRenderer?.content
            ?.musicPlayButtonRenderer?.playNavigationEndpoint
            ?.watchEndpoint?.videoId ||
            item.musicResponsiveListItemRenderer?.playlistItemData?.videoId || '';

          // Thumbnail
          const thumbnails = item.musicResponsiveListItemRenderer?.thumbnail
            ?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
          const artworkUrl = thumbnails.length > 0
            ? thumbnails[thumbnails.length - 1].url
            : undefined;

          if (videoId) {
            tracks.push({ id: videoId, title, artist, album, duration, artworkUrl });
          }
        } catch {
          // Skip malformed items
        }
      }
    }
  } catch {
    // Response structure mismatch
  }

  return { tracks };
}

export async function getTrackInfo(videoId: string): Promise<YTTrack | null> {
  try {
    // Use the oEmbed endpoint for basic info (lightweight)
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();

    return {
      id: videoId,
      title: data.title || 'Unknown',
      artist: data.author_name || 'Unknown',
      duration: 0,
      artworkUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch {
    return null;
  }
}

export async function getStreamUrl(
  videoId: string,
  quality: string = 'normal',
): Promise<{ url: string; format: string; bitrate: number } | null> {
  try {
    // Use the player endpoint to get streaming data
    const res = await fetch(`${YT_MUSIC_API}/player?key=${YT_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'ANDROID_MUSIC',
            clientVersion: '5.28.1',
            androidSdkVersion: 30,
            hl: 'en',
            gl: 'US',
          },
        },
        videoId,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();

    // Get adaptive audio formats
    const audioFormats = (data.streamingData?.adaptiveFormats || [])
      .filter((f: any) => f.mimeType?.startsWith('audio/'))
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

    if (audioFormats.length === 0) {
      // Try combined formats
      const formats = (data.streamingData?.formats || [])
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
      if (formats.length === 0) return null;

      return {
        url: formats[0].url || '',
        format: 'mp4',
        bitrate: formats[0].bitrate || 128000,
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
        selected = audioFormats[Math.floor(audioFormats.length / 2)] || audioFormats[0];
    }

    const mimeType = selected.mimeType || 'audio/mp4';
    const format = mimeType.includes('webm') ? 'opus'
      : mimeType.includes('mp4') ? 'aac'
      : 'mp3';

    return {
      url: selected.url || '',
      format,
      bitrate: selected.bitrate || 128000,
    };
  } catch (e) {
    console.error('Failed to get stream URL:', e);
    return null;
  }
}

function parseDuration(text: string): number {
  const parts = text.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}
