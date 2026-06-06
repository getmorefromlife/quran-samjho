'use client';

import { useEffect } from 'react';
import { Bookmark, removeBookmark } from '@/lib/bookmarks';
import { SURAH_LIST } from '@/lib/data';

interface BookmarksPanelProps {
  open: boolean;
  bookmarks: Bookmark[];
  onClose: () => void;
  onNavigate: (surah: number, verse: number) => void;
  onBookmarksChange: (bookmarks: Bookmark[]) => void;
}

export default function BookmarksPanel({
  open,
  bookmarks,
  onClose,
  onNavigate,
  onBookmarksChange,
}: BookmarksPanelProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function handleRemove(surah: number, verse: number) {
    const updated = removeBookmark(surah, verse);
    onBookmarksChange(updated);
  }

  function handleNavigate(surah: number, verse: number) {
    onNavigate(surah, verse);
    onClose();
  }

  const sorted = [...bookmarks].sort((a, b) => {
    if (a.surah !== b.surah) return a.surah - b.surah;
    return a.verse - b.verse;
  });

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed top-0 left-0 h-full w-full max-w-sm bg-background border-r border-border/40 z-50 shadow-xl transform transition-transform duration-300 ease-out overflow-y-auto ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Bookmarks"
      >
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/20 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-sans text-foreground tracking-wide">Bookmarks</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground p-1 cursor-pointer transition-colors"
            aria-label="Close bookmarks"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {bookmarks.length === 0 ? (
            <div className="text-center py-12">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mx-auto text-muted/40 mb-3"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <p className="text-sm text-muted">No bookmarks yet</p>
              <p className="text-xs text-muted/60 mt-1">Tap the bookmark icon on any verse to save it here.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {sorted.map((bm) => {
                const surahInfo = SURAH_LIST.find((s) => s.number === bm.surah);
                const label = surahInfo ? `${bm.surah}. ${surahInfo.name}` : `Surah ${bm.surah}`;
                return (
                  <li key={`${bm.surah}-${bm.verse}`}>
                    <button
                      onClick={() => handleNavigate(bm.surah, bm.verse)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded text-left transition-colors hover:bg-background-secondary cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <span className="text-xs text-foreground font-medium">{label}</span>
                        <span className="text-xs text-muted ml-2">· Verse {bm.verse}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemove(bm.surah, bm.verse); }}
                        className="p-1 text-muted/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        aria-label={`Remove bookmark for ${label} verse ${bm.verse}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
