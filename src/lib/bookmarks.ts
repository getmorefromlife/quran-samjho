export interface Bookmark {
  surah: number;
  verse: number;
  addedAt: number;
}

export interface LastReadPosition {
  surah: number;
  verse: number;
  timestamp: number;
}

const BOOKMARKS_KEY = 'quran-samjho-bookmarks';
const LAST_READ_KEY = 'quran-samjho-last-read';

export function getBookmarks(): Bookmark[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addBookmark(surah: number, verse: number): Bookmark[] {
  const bookmarks = getBookmarks();
  const exists = bookmarks.some((b) => b.surah === surah && b.verse === verse);
  if (exists) return bookmarks;
  const updated = [...bookmarks, { surah, verse, addedAt: Date.now() }];
  try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated)); } catch {}
  return updated;
}

export function removeBookmark(surah: number, verse: number): Bookmark[] {
  const updated = getBookmarks().filter((b) => !(b.surah === surah && b.verse === verse));
  try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated)); } catch {}
  return updated;
}

export function isBookmarked(surah: number, verse: number): boolean {
  return getBookmarks().some((b) => b.surah === surah && b.verse === verse);
}

export function getLastReadPosition(): LastReadPosition | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_READ_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setLastReadPosition(surah: number, verse: number) {
  try {
    localStorage.setItem(LAST_READ_KEY, JSON.stringify({ surah, verse, timestamp: Date.now() }));
  } catch {}
}
