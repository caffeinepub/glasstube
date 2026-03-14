export const API_KEY_STORAGE = "yt_api_key";

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) || "";
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

export interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  channelId: string;
  channelThumbnail?: string;
  thumbnail: string;
  viewCount: string;
  likeCount: string;
  publishedAt: string;
  description: string;
  categoryId?: string;
  duration?: string;
}

export interface YouTubeSearchResult {
  id: string;
  title: string;
  channelTitle: string;
  channelId: string;
  channelThumbnail?: string;
  thumbnail: string;
  publishedAt: string;
  description: string;
  duration?: string;
}

const BASE = "https://www.googleapis.com/youtube/v3";

// Channel thumbnail cache
const channelThumbCache: Record<string, string> = {};

export async function fetchChannelThumbnails(
  channelIds: string[],
): Promise<Record<string, string>> {
  const key = getApiKey();
  const uncached = channelIds.filter((id) => !(id in channelThumbCache));
  if (uncached.length === 0) {
    return Object.fromEntries(
      channelIds.map((id) => [id, channelThumbCache[id] || ""]),
    );
  }
  // Batch up to 50
  const batches: string[][] = [];
  for (let i = 0; i < uncached.length; i += 50) {
    batches.push(uncached.slice(i, i + 50));
  }
  for (const batch of batches) {
    try {
      const url = `${BASE}/channels?part=snippet&id=${batch.join(",")}&key=${key}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        for (const item of data.items || []) {
          const thumb =
            item.snippet?.thumbnails?.default?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            "";
          channelThumbCache[item.id] = thumb;
        }
      }
    } catch {}
  }
  return Object.fromEntries(
    channelIds.map((id) => [id, channelThumbCache[id] || ""]),
  );
}

function parseDuration(iso: string): string {
  if (!iso) return "";
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h = Number.parseInt(m[1] || "0");
  const min = Number.parseInt(m[2] || "0");
  const sec = Number.parseInt(m[3] || "0");
  if (h > 0)
    return `${h}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export async function fetchTrending(
  categoryId?: string,
): Promise<YouTubeVideo[]> {
  const key = getApiKey();
  let url = `${BASE}/videos?part=snippet,statistics,contentDetails&chart=mostPopular&maxResults=24&key=${key}`;
  if (categoryId) url += `&videoCategoryId=${categoryId}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Failed to fetch videos");
  }
  const data = await res.json();
  const videos: YouTubeVideo[] = (data.items || []).map((item: any) => ({
    id: item.id,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    thumbnail:
      item.snippet.thumbnails?.maxres?.url ||
      item.snippet.thumbnails?.high?.url ||
      item.snippet.thumbnails?.medium?.url ||
      "",
    viewCount: item.statistics?.viewCount || "0",
    likeCount: item.statistics?.likeCount || "0",
    publishedAt: item.snippet.publishedAt,
    description: item.snippet.description,
    categoryId: item.snippet.categoryId,
    duration: parseDuration(item.contentDetails?.duration || ""),
  }));
  // Fetch channel thumbnails
  const channelIds = [...new Set(videos.map((v) => v.channelId))];
  const thumbs = await fetchChannelThumbnails(channelIds);
  return videos.map((v) => ({
    ...v,
    channelThumbnail: thumbs[v.channelId] || "",
  }));
}

export async function searchVideos(
  query: string,
): Promise<YouTubeSearchResult[]> {
  const key = getApiKey();
  const url = `${BASE}/search?part=snippet&type=video&maxResults=24&q=${encodeURIComponent(query)}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Failed to search videos");
  }
  const data = await res.json();
  const results: YouTubeSearchResult[] = (data.items || []).map(
    (item: any) => ({
      id: item.id?.videoId || item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      thumbnail:
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.medium?.url ||
        "",
      publishedAt: item.snippet.publishedAt,
      description: item.snippet.description,
    }),
  );
  const channelIds = [...new Set(results.map((v) => v.channelId))];
  const thumbs = await fetchChannelThumbnails(channelIds);
  return results.map((v) => ({
    ...v,
    channelThumbnail: thumbs[v.channelId] || "",
  }));
}

export async function fetchVideoDetails(
  videoId: string,
): Promise<YouTubeVideo | null> {
  const key = getApiKey();
  const url = `${BASE}/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Failed to fetch video details");
  }
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) return null;
  const video: YouTubeVideo = {
    id: item.id,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    thumbnail:
      item.snippet.thumbnails?.maxres?.url ||
      item.snippet.thumbnails?.high?.url ||
      "",
    viewCount: item.statistics?.viewCount || "0",
    likeCount: item.statistics?.likeCount || "0",
    publishedAt: item.snippet.publishedAt,
    description: item.snippet.description,
    categoryId: item.snippet.categoryId,
    duration: parseDuration(item.contentDetails?.duration || ""),
  };
  const thumbs = await fetchChannelThumbnails([video.channelId]);
  return { ...video, channelThumbnail: thumbs[video.channelId] || "" };
}

export async function fetchRelatedVideos(
  videoId: string,
  categoryId?: string,
): Promise<YouTubeSearchResult[]> {
  const key = getApiKey();
  try {
    const url = `${BASE}/search?part=snippet&type=video&maxResults=15&relatedToVideoId=${videoId}&key=${key}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.items?.length > 0) {
        const results: YouTubeSearchResult[] = (data.items || []).map(
          (item: any) => ({
            id: item.id?.videoId || item.id,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            channelId: item.snippet.channelId,
            thumbnail:
              item.snippet.thumbnails?.high?.url ||
              item.snippet.thumbnails?.medium?.url ||
              "",
            publishedAt: item.snippet.publishedAt,
            description: item.snippet.description,
          }),
        );
        const channelIds = [...new Set(results.map((v) => v.channelId))];
        const thumbs = await fetchChannelThumbnails(channelIds);
        return results.map((v) => ({
          ...v,
          channelThumbnail: thumbs[v.channelId] || "",
        }));
      }
    }
  } catch {}
  if (categoryId) {
    return (await fetchTrending(categoryId)).map((v) => ({ ...v }));
  }
  return fetchTrending();
}
