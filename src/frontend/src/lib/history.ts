export interface HistoryEntry {
  id: string;
  title: string;
  channelTitle: string;
  channelId?: string;
  channelThumbnail?: string;
  thumbnail: string;
  publishedAt: string;
  duration?: string;
  watchedAt: number;
  resumeTime: number;
}

const HISTORY_KEY = "modxtube_history";
const MAX_HISTORY = 50;

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return parsed
      .sort((a, b) => b.watchedAt - a.watchedAt)
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

export function saveToHistory(entry: Omit<HistoryEntry, "watchedAt">): void {
  try {
    const history = getHistory();
    const existing = history.findIndex((e) => e.id === entry.id);
    const newEntry: HistoryEntry = { ...entry, watchedAt: Date.now() };
    if (existing !== -1) {
      history[existing] = { ...history[existing], ...newEntry };
    } else {
      history.unshift(newEntry);
    }
    const trimmed = history.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore storage errors
  }
}

export function updateResumeTime(id: string, seconds: number): void {
  try {
    const history = getHistory();
    const idx = history.findIndex((e) => e.id === id);
    if (idx !== -1) {
      history[idx].resumeTime = Math.floor(seconds);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  } catch {
    // ignore
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}
