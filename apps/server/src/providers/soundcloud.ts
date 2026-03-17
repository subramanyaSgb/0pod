const SC_API = 'https://api-v2.soundcloud.com';

// SoundCloud's public client_id (same one their web app uses)
// This may change — if it breaks, extract a fresh one from soundcloud.com
let clientId: string | null = null;

async function getClientId(): Promise<string> {
  if (clientId) return clientId;

  // Use env var if set, otherwise try to extract from SoundCloud
  if (process.env.SOUNDCLOUD_CLIENT_ID) {
    clientId = process.env.SOUNDCLOUD_CLIENT_ID;
    return clientId;
  }

  try {
    // Fetch SoundCloud homepage and extract client_id from scripts
    const res = await fetch('https://soundcloud.com');
    const html = await res.text();
    const scripts =
      html.match(
        /src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g,
      ) || [];

    for (const scriptTag of scripts.slice(-3)) {
      const scriptUrl = scriptTag.match(/src="([^"]+)"/)?.[1];
      if (!scriptUrl) continue;
      const scriptRes = await fetch(scriptUrl);
      const scriptText = await scriptRes.text();
      const match = scriptText.match(/client_id:"([a-zA-Z0-9]+)"/);
      if (match) {
        clientId = match[1];
        return clientId;
      }
    }
  } catch {
    // Extraction failed
  }

  throw new Error('Could not obtain SoundCloud client_id');
}

async function scFetch(
  path: string,
  params: Record<string, string> = {},
): Promise<any> {
  const cid = await getClientId();
  const url = new URL(`${SC_API}${path}`);
  url.searchParams.set('client_id', cid);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`SoundCloud API error: ${res.status}`);
  return res.json();
}

export interface SCTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  artworkUrl?: string;
  streamUrl?: string;
}

export async function searchSoundCloud(
  query: string,
): Promise<{ tracks: SCTrack[] }> {
  try {
    const data = await scFetch('/search/tracks', { q: query, limit: '20' });

    const tracks: SCTrack[] = (data.collection || []).map((item: any) => ({
      id: String(item.id),
      title: item.title || 'Unknown',
      artist: item.user?.username || 'Unknown',
      duration: Math.floor((item.duration || 0) / 1000),
      artworkUrl:
        item.artwork_url?.replace('-large', '-t500x500') ||
        item.user?.avatar_url,
      streamUrl: item.media?.transcodings?.[0]?.url,
    }));

    return { tracks };
  } catch {
    return { tracks: [] };
  }
}

export async function getSCTrack(trackId: string): Promise<SCTrack | null> {
  try {
    const item = await scFetch(`/tracks/${trackId}`);
    return {
      id: String(item.id),
      title: item.title || 'Unknown',
      artist: item.user?.username || 'Unknown',
      duration: Math.floor((item.duration || 0) / 1000),
      artworkUrl:
        item.artwork_url?.replace('-large', '-t500x500') || undefined,
      streamUrl: item.media?.transcodings?.[0]?.url,
    };
  } catch {
    return null;
  }
}

export async function getSCStreamUrl(
  trackId: string,
): Promise<{ url: string; format: string; bitrate: number } | null> {
  try {
    const track = await getSCTrack(trackId);
    if (!track?.streamUrl) return null;

    // Resolve the transcoding URL to get the actual stream
    const cid = await getClientId();
    const transcodingUrl = `${track.streamUrl}?client_id=${cid}`;
    const res = await fetch(transcodingUrl);
    if (!res.ok) return null;
    const data = await res.json();

    return {
      url: data.url || '',
      format: 'mp3',
      bitrate: 128000,
    };
  } catch {
    return null;
  }
}
