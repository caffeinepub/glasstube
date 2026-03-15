import { CHANNEL_TTL_MS, DEFAULT_TTL_MS, cacheGet, cacheSet } from "./apiCache";

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

export interface YouTubeComment {
  id: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  likeCount: number;
  publishedAt: string;
}

const BASE = "https://www.googleapis.com/youtube/v3";

/** Returns the best available thumbnail URL for a video ID (direct CDN). */
export function getYtThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** Pick the best thumbnail URL from the API snippet thumbnails object. */
function bestThumb(thumbnails: any, videoId?: string): string {
  return (
    thumbnails?.maxres?.url ||
    thumbnails?.standard?.url ||
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    (videoId ? getYtThumbnail(videoId) : "")
  );
}

/** Filter out unavailable/private/deleted videos */
function isAvailable(item: any): boolean {
  const status = item.status;
  if (!status) return true;
  if (status.privacyStatus && status.privacyStatus !== "public") return false;
  if (status.embeddable === false) return false;
  return true;
}

// Channel thumbnail in-memory cache
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
  const batches: string[][] = [];
  for (let i = 0; i < uncached.length; i += 50) {
    batches.push(uncached.slice(i, i + 50));
  }
  for (const batch of batches) {
    try {
      const cacheKey = `channels_${batch.sort().join(",")}`;
      const cached = cacheGet<Record<string, string>>(cacheKey);
      if (cached) {
        Object.assign(channelThumbCache, cached);
        continue;
      }
      const url = `${BASE}/channels?part=snippet&id=${batch.join(",")}&key=${key}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const result: Record<string, string> = {};
        for (const item of data.items || []) {
          const thumb =
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url ||
            "";
          channelThumbCache[item.id] = thumb;
          result[item.id] = thumb;
        }
        cacheSet(cacheKey, result, CHANNEL_TTL_MS);
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
  const cacheKey = `trending_${categoryId || "all"}`;
  const cached = cacheGet<YouTubeVideo[]>(cacheKey);
  if (cached) return cached;

  const key = getApiKey();
  let url = `${BASE}/videos?part=snippet,statistics,contentDetails,status&chart=mostPopular&maxResults=30&key=${key}`;
  if (categoryId) url += `&videoCategoryId=${categoryId}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Failed to fetch videos");
  }
  const data = await res.json();
  const videos: YouTubeVideo[] = (data.items || [])
    .filter((item: any) => isAvailable(item))
    .map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      thumbnail: bestThumb(item.snippet.thumbnails, item.id),
      viewCount: item.statistics?.viewCount || "0",
      likeCount: item.statistics?.likeCount || "0",
      publishedAt: item.snippet.publishedAt,
      description: item.snippet.description,
      categoryId: item.snippet.categoryId,
      duration: parseDuration(item.contentDetails?.duration || ""),
    }));
  const channelIds = [...new Set(videos.map((v) => v.channelId))];
  const thumbs = await fetchChannelThumbnails(channelIds);
  const result = videos.map((v) => ({
    ...v,
    channelThumbnail: thumbs[v.channelId] || "",
  }));
  cacheSet(cacheKey, result, DEFAULT_TTL_MS);
  return result;
}

/** Extract search keywords from video titles */
export function extractKeywords(title: string): string {
  const stop = new Set([
    "the",
    "a",
    "an",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "and",
    "or",
    "is",
    "was",
    "it",
    "this",
    "that",
    "with",
    "how",
    "why",
    "what",
    "when",
    "who",
    "will",
    "be",
    "are",
    "my",
    "your",
    "i",
    "we",
    "he",
    "she",
    "they",
    "new",
    "full",
    "official",
  ]);
  return title
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w.toLowerCase()))
    .slice(0, 4)
    .join(" ");
}

export async function searchVideos(
  query: string,
): Promise<YouTubeSearchResult[]> {
  const cacheKey = `search_${query}`;
  const cached = cacheGet<YouTubeSearchResult[]>(cacheKey);
  if (cached) return cached;

  const key = getApiKey();
  const url = `${BASE}/search?part=snippet&type=video&maxResults=24&q=${encodeURIComponent(query)}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Failed to search videos");
  }
  const data = await res.json();
  const rawResults = (data.items || []).map((item: any) => {
    const vid = item.id?.videoId || item.id;
    return {
      id: vid,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      thumbnail: bestThumb(item.snippet.thumbnails, vid),
      publishedAt: item.snippet.publishedAt,
      description: item.snippet.description,
    };
  });

  const ids = rawResults.map((v: any) => v.id).join(",");
  let availableIds = new Set<string>(rawResults.map((v: any) => v.id));
  try {
    const vUrl = `${BASE}/videos?part=status&id=${ids}&key=${key}`;
    const vRes = await fetch(vUrl);
    if (vRes.ok) {
      const vData = await vRes.json();
      availableIds = new Set(
        (vData.items || []).filter(isAvailable).map((i: any) => i.id),
      );
    }
  } catch {}

  const results: YouTubeSearchResult[] = rawResults.filter((v: any) =>
    availableIds.has(v.id),
  );
  const channelIds = [...new Set(results.map((v) => v.channelId))];
  const thumbs = await fetchChannelThumbnails(channelIds);
  const final = results.map((v) => ({
    ...v,
    channelThumbnail: thumbs[v.channelId] || "",
  }));
  cacheSet(cacheKey, final, DEFAULT_TTL_MS);
  return final;
}

export async function fetchVideoDetails(
  videoId: string,
): Promise<YouTubeVideo | null> {
  const cacheKey = `video_${videoId}`;
  const cached = cacheGet<YouTubeVideo>(cacheKey);
  if (cached) return cached;

  const key = getApiKey();
  const url = `${BASE}/videos?part=snippet,statistics,contentDetails,status&id=${videoId}&key=${key}`;
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
    thumbnail: bestThumb(item.snippet.thumbnails, item.id),
    viewCount: item.statistics?.viewCount || "0",
    likeCount: item.statistics?.likeCount || "0",
    publishedAt: item.snippet.publishedAt,
    description: item.snippet.description,
    categoryId: item.snippet.categoryId,
    duration: parseDuration(item.contentDetails?.duration || ""),
  };
  const thumbs = await fetchChannelThumbnails([video.channelId]);
  const result = { ...video, channelThumbnail: thumbs[video.channelId] || "" };
  cacheSet(cacheKey, result, DEFAULT_TTL_MS);
  return result;
}

export async function fetchRelatedVideos(
  videoId: string,
  categoryId?: string,
): Promise<YouTubeSearchResult[]> {
  const cacheKey = `related_${videoId}_${categoryId || "none"}`;
  const cached = cacheGet<YouTubeSearchResult[]>(cacheKey);
  if (cached) return cached;

  // Try category-based trending first
  if (categoryId) {
    try {
      const trending = await fetchTrending(categoryId);
      const filtered = trending
        .filter((v) => v.id !== videoId)
        .map((v) => ({ ...v }));
      if (filtered.length >= 4) {
        cacheSet(cacheKey, filtered, DEFAULT_TTL_MS);
        return filtered;
      }
    } catch {}
  }

  // Fallback: search by keywords extracted from videoId-related content, or general trending
  try {
    const trending = await fetchTrending();
    const filtered = trending
      .filter((v) => v.id !== videoId)
      .map((v) => ({ ...v }));
    cacheSet(cacheKey, filtered, DEFAULT_TTL_MS);
    return filtered;
  } catch {
    return [];
  }
}

export async function fetchVideoComments(
  videoId: string,
): Promise<YouTubeComment[]> {
  const cacheKey = `comments_${videoId}`;
  const cached = cacheGet<YouTubeComment[]>(cacheKey);
  if (cached) return cached;

  const key = getApiKey();
  try {
    const url = `${BASE}/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&order=relevance&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const comments: YouTubeComment[] = (data.items || []).map((item: any) => {
      const top = item.snippet?.topLevelComment?.snippet;
      return {
        id: item.id,
        authorName: top?.authorDisplayName || "Anonymous",
        authorAvatar: top?.authorProfileImageUrl || "",
        text: top?.textDisplay || "",
        likeCount: top?.likeCount || 0,
        publishedAt: top?.publishedAt || "",
      };
    });
    cacheSet(cacheKey, comments, DEFAULT_TTL_MS);
    return comments;
  } catch {
    return [];
  }
}

export async function fetchInterestVideos(
  historyTitles: string[],
  historyCategoryIds: string[],
): Promise<YouTubeSearchResult[]> {
  const key = getApiKey();

  // Try category-based trending first
  const uniqueCats = [...new Set(historyCategoryIds.filter(Boolean))];
  if (uniqueCats.length > 0) {
    try {
      const catVideos = await fetchTrending(uniqueCats[0]);
      if (catVideos.length >= 6) {
        return catVideos.map((v) => ({ ...v }));
      }
    } catch {}
  }

  // Keyword search fallback from watch history titles
  if (historyTitles.length > 0) {
    const keywords = extractKeywords(historyTitles[0]);
    if (keywords.trim()) {
      try {
        const cacheKey = `interest_${keywords}`;
        const cached = cacheGet<YouTubeSearchResult[]>(cacheKey);
        if (cached) return cached;

        const url = `${BASE}/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(keywords)}&key=${key}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const rawResults = (data.items || []).map((item: any) => {
            const vid = item.id?.videoId || item.id;
            return {
              id: vid,
              title: item.snippet.title,
              channelTitle: item.snippet.channelTitle,
              channelId: item.snippet.channelId,
              thumbnail: bestThumb(item.snippet.thumbnails, vid),
              publishedAt: item.snippet.publishedAt,
              description: item.snippet.description,
            };
          });
          const ids = rawResults.map((v: any) => v.id).join(",");
          let availableIds = new Set<string>(rawResults.map((v: any) => v.id));
          try {
            const vRes = await fetch(
              `${BASE}/videos?part=status&id=${ids}&key=${key}`,
            );
            if (vRes.ok) {
              const vData = await vRes.json();
              availableIds = new Set(
                (vData.items || []).filter(isAvailable).map((i: any) => i.id),
              );
            }
          } catch {}
          const results = rawResults.filter((v: any) => availableIds.has(v.id));
          if (results.length >= 6) {
            const channelIds = [
              ...new Set<string>(
                results.map((v: any) => v.channelId as string),
              ),
            ];
            const thumbs = await fetchChannelThumbnails(channelIds);
            const final = results.map((v: any) => ({
              ...v,
              channelThumbnail: thumbs[v.channelId] || "",
            }));
            cacheSet(cacheKey, final, DEFAULT_TTL_MS);
            return final;
          }
        }
      } catch {}
    }
  }

  return fetchTrending();
}

export async function fetchChannelVideos(channelId: string): Promise<{
  channel: {
    id: string;
    title: string;
    thumbnail: string;
    description: string;
    subscriberCount: string;
  };
  videos: YouTubeSearchResult[];
}> {
  const cacheKey = `channel_${channelId}`;
  const cached = cacheGet<any>(cacheKey);
  if (cached) return cached;

  const key = getApiKey();
  const [channelRes, searchRes] = await Promise.all([
    fetch(
      `${BASE}/channels?part=snippet,statistics&id=${channelId}&key=${key}`,
    ),
    fetch(
      `${BASE}/search?part=snippet&channelId=${channelId}&type=video&maxResults=24&order=viewCount&key=${key}`,
    ),
  ]);
  const channelData = await channelRes.json();
  const ch = channelData.items?.[0];
  const channel = {
    id: channelId,
    title: ch?.snippet?.title || "",
    thumbnail:
      ch?.snippet?.thumbnails?.medium?.url ||
      ch?.snippet?.thumbnails?.default?.url ||
      "",
    description: ch?.snippet?.description || "",
    subscriberCount: ch?.statistics?.subscriberCount || "0",
  };
  const searchData = await searchRes.json();
  const rawVideos = (searchData.items || []).map((item: any) => {
    const vid = item.id?.videoId || item.id;
    return {
      id: vid,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      thumbnail: bestThumb(item.snippet.thumbnails, vid),
      publishedAt: item.snippet.publishedAt,
      description: item.snippet.description,
    };
  });
  const ids = rawVideos.map((v: any) => v.id).join(",");
  let availableIds = new Set<string>(rawVideos.map((v: any) => v.id));
  try {
    const vRes = await fetch(`${BASE}/videos?part=status&id=${ids}&key=${key}`);
    if (vRes.ok) {
      const vData = await vRes.json();
      availableIds = new Set(
        (vData.items || []).filter(isAvailable).map((i: any) => i.id),
      );
    }
  } catch {}
  const videos: YouTubeSearchResult[] = rawVideos.filter((v: any) =>
    availableIds.has(v.id),
  );
  const result = { channel, videos };
  cacheSet(cacheKey, result, CHANNEL_TTL_MS);
  return result;
}
