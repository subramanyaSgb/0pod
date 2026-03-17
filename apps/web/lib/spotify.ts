const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API = 'https://api.spotify.com/v1';

let accessToken: string | null = null;
let tokenExpiry = 0;

async function getToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID || '';
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) throw new Error('Failed to get Spotify token');

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return accessToken;
}

async function spotifyFetch(path: string): Promise<any> {
  const token = await getToken();
  const response = await fetch(`${SPOTIFY_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Spotify API error: ${response.status}`);
  return response.json();
}

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  artworkUrl?: string;
  previewUrl?: string;
}

export async function searchSpotify(
  query: string,
): Promise<{ tracks: SpotifyTrack[] }> {
  const data = await spotifyFetch(
    `/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
  );

  const tracks: SpotifyTrack[] = (
    (data.tracks?.items as any[]) || []
  ).map((item: any) => ({
    id: item.id as string,
    title: (item.name as string) || 'Unknown',
    artist:
      (item.artists as any[])?.map((a: any) => a.name as string).join(', ') ||
      'Unknown',
    album: (item.album?.name as string) || undefined,
    duration: Math.floor(((item.duration_ms as number) || 0) / 1000),
    artworkUrl: (item.album?.images?.[0]?.url as string) || undefined,
    previewUrl: (item.preview_url as string) || undefined,
  }));

  return { tracks };
}

export async function getSpotifyTrack(
  trackId: string,
): Promise<SpotifyTrack | null> {
  try {
    const item = await spotifyFetch(`/tracks/${trackId}`);
    return {
      id: item.id as string,
      title: (item.name as string) || 'Unknown',
      artist:
        (item.artists as any[])
          ?.map((a: any) => a.name as string)
          .join(', ') || 'Unknown',
      album: (item.album?.name as string) || undefined,
      duration: Math.floor(((item.duration_ms as number) || 0) / 1000),
      artworkUrl: (item.album?.images?.[0]?.url as string) || undefined,
      previewUrl: (item.preview_url as string) || undefined,
    };
  } catch {
    return null;
  }
}

export async function getSpotifyStreamUrl(
  trackId: string,
): Promise<{ url: string; format: string; bitrate: number } | null> {
  try {
    const track = await getSpotifyTrack(trackId);
    if (!track?.previewUrl) return null;

    return {
      url: track.previewUrl,
      format: 'mp3',
      bitrate: 128000,
    };
  } catch {
    return null;
  }
}

export function isSpotifyConfigured(): boolean {
  return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}
