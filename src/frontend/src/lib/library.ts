export interface LibraryVideo {
  id: string;
  title: string;
  channelTitle: string;
  channelId: string;
  thumbnail: string;
  duration?: string;
  savedAt: number;
}

export interface LibraryPlaylist {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  videoCount: number;
  savedAt: number;
}

const VIDEOS_KEY = "modxtube_library_videos";
const PLAYLISTS_KEY = "modxtube_library_playlists";

export function getSavedVideos(): LibraryVideo[] {
  try {
    const raw = localStorage.getItem(VIDEOS_KEY);
    if (raw) return JSON.parse(raw) as LibraryVideo[];
  } catch {}
  return [];
}

export function getSavedPlaylists(): LibraryPlaylist[] {
  try {
    const raw = localStorage.getItem(PLAYLISTS_KEY);
    if (raw) return JSON.parse(raw) as LibraryPlaylist[];
  } catch {}
  return [];
}

export function isVideoSaved(id: string): boolean {
  return getSavedVideos().some((v) => v.id === id);
}

export function saveVideo(video: LibraryVideo): void {
  const videos = getSavedVideos().filter((v) => v.id !== video.id);
  videos.unshift(video);
  try {
    localStorage.setItem(VIDEOS_KEY, JSON.stringify(videos));
  } catch {}
}

export function removeVideo(id: string): void {
  const videos = getSavedVideos().filter((v) => v.id !== id);
  try {
    localStorage.setItem(VIDEOS_KEY, JSON.stringify(videos));
  } catch {}
}

export function savePlaylist(playlist: LibraryPlaylist): void {
  const playlists = getSavedPlaylists().filter((p) => p.id !== playlist.id);
  playlists.unshift(playlist);
  try {
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
  } catch {}
}

export function removePlaylist(id: string): void {
  const playlists = getSavedPlaylists().filter((p) => p.id !== id);
  try {
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
  } catch {}
}

export function isPlaylistSaved(id: string): boolean {
  return getSavedPlaylists().some((p) => p.id === id);
}
