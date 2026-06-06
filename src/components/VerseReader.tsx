'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Verse, ReadingMode, TranslationKey, TRANSLATION_SHORT, LANGUAGE_RTL, SOURCE_TRANSLATIONS } from '@/lib/types';
import { SURAH_LIST, getVersesBySurah, getSurahInfo } from '@/lib/data';
import ALL_VERSES from '@/lib/quran-complete.json';
import { DEFAULT_FONTS, getFontFamily } from '@/lib/fonts';
import { getBookmarks, addBookmark, removeBookmark, isBookmarked, getLastReadPosition, setLastReadPosition, Bookmark } from '@/lib/bookmarks';
import SettingsPanel, { TextAlignment } from '@/components/SettingsPanel';
import BookmarksPanel from '@/components/BookmarksPanel';

const FONT_MIN = 0.5;
const FONT_MAX = 2.5;
const FONT_STEP = 0.1;

const SPACE_MIN = 0.5;
const SPACE_MAX = 2.0;
const SPACE_STEP = 0.1;

const COMPARATIVE_ORDER: TranslationKey[] = ['urdu_jawadi', 'urdu_najafi', 'english_qarai', 'german_bubenheim'];

const SEARCH_FIELDS: { key: TranslationKey | 'arabic'; label: string }[] = [
  { key: 'arabic', label: 'Arabic' },
  { key: 'english_qarai', label: 'English (Ali Quli Qarai)' },
  { key: 'urdu_jawadi', label: 'Urdu (Zeeshan Haider Jawadi)' },
  { key: 'urdu_najafi', label: 'Urdu (Mohsin Ali Najafi)' },
  { key: 'german_bubenheim', label: 'German (Bubenheim & Elyas)' },
];

function getWords(text: string): string[] {
  return text.split(/[\s\-–—\u200B\u200C]+/).filter(Boolean);
}

function wordStartsWith(text: string, query: string): boolean {
  if (!query) return false;
  return getWords(text).some(word => word.startsWith(query));
}

function normalizeText(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[\u0640\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671\u0672\u0673]/g, '\u0627')
    .replace(/\u0629/g, '\u0647')
    .replace(/[\u0649\u06CC\u06D0\u06D1]/g, '\u064A')
    .replace(/\u0626/g, '\u064A')
    .replace(/\u0648\u0654/g, '\u0648')
    .toLowerCase();
}

const ALL_VERSES_ARRAY = ALL_VERSES as Verse[];
const NORMALIZED_VERSES = ALL_VERSES_ARRAY.map(v => ({
  arabic: normalizeText(v.arabic),
  english_qarai: normalizeText(v.english_qarai),
  urdu_jawadi: normalizeText(v.urdu_jawadi),
  urdu_najafi: normalizeText(v.urdu_najafi),
  german_bubenheim: normalizeText(v.german_bubenheim),
}));

function loadFontPref(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

function saveFontPref(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { }
}

export default function VerseReader() {
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [readingMode, setReadingMode] = useState<ReadingMode>('single-translation');
  const [primaryLanguage, setPrimaryLanguage] = useState<TranslationKey>('arabic');
  const [selectedTranslation, setSelectedTranslation] = useState<TranslationKey>('english_qarai');
  const [comparativeSelections, setComparativeSelections] = useState<TranslationKey[]>([
    'urdu_jawadi',
    'urdu_najafi',
    'english_qarai',
    'german_bubenheim',
  ]);
  const [comparativeLayout, setComparativeLayout] = useState<'stacked' | 'columns'>('columns');
  const [fontScale, setFontScale] = useState(1);
  const [spacingScale, setSpacingScale] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<TranslationKey | 'arabic' | ''>('');

  const [arabicFont, setArabicFont] = useState(DEFAULT_FONTS.arabic);
  const [urduFont, setUrduFont] = useState(DEFAULT_FONTS.urdu);
  const [englishFont, setEnglishFont] = useState(DEFAULT_FONTS.english);
  const [textAlign, setTextAlign] = useState<TextAlignment>('auto');
  const [mobileToolbarOpen, setMobileToolbarOpen] = useState(false);

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bookmarksPanelOpen, setBookmarksPanelOpen] = useState(false);
  const [pendingInitialVerse, setPendingInitialVerse] = useState<number | null>(null);
  const [showContinueReading, setShowContinueReading] = useState(false);
  const [continueReadingSurah, setContinueReadingSurah] = useState<number | null>(null);
  const [continueReadingVerse, setContinueReadingVerse] = useState<number | null>(null);

  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(5000);

  const versesContainerRef = useRef<HTMLDivElement>(null);
  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    setArabicFont(loadFontPref('arabicFont', DEFAULT_FONTS.arabic));
    setUrduFont(loadFontPref('urduFont', DEFAULT_FONTS.urdu));
    setEnglishFont(loadFontPref('englishFont', DEFAULT_FONTS.english));
    setFontScale(loadFontScale());
    setSpacingScale(loadSpacingScale());
    setTextAlign(loadTextAlign());

    setBookmarks(getBookmarks());

    const lastRead = getLastReadPosition();
    if (lastRead && (lastRead.surah !== 1 || lastRead.verse !== 1)) {
      setContinueReadingSurah(lastRead.surah);
      setContinueReadingVerse(lastRead.verse);
      setShowContinueReading(true);
    }
  }, []);

  useEffect(() => {
    setAutoScrollActive(false);
    if (pendingInitialVerse !== null) {
      setSelectedVerse(pendingInitialVerse);
      const v = pendingInitialVerse;
      setPendingInitialVerse(null);
      setTimeout(() => scrollToVerse(v), 300);
    } else {
      setSelectedVerse(1);
    }
    setSearchQuery('');
  }, [selectedSurah]);

  const allVerses = getVersesBySurah(selectedSurah);
  const surahInfo = getSurahInfo(selectedSurah);
  const totalVerses = allVerses.length;
  const isComparativeColumns = readingMode === 'comparative' && comparativeLayout === 'columns';

  const debouncedQuery = useRef('');
  const [pendingSearch, setPendingSearch] = useState('');
  useEffect(() => {
    if (!searchQuery) {
      setPendingSearch('');
      return;
    }
    const timer = setTimeout(() => setPendingSearch(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredVerses = useMemo(() => {
    if (!pendingSearch.trim()) return allVerses;
    const q = normalizeText(pendingSearch);
    return ALL_VERSES_ARRAY.filter((v, i) => {
      const n = NORMALIZED_VERSES[i];
      if (searchField === '' || searchField === 'arabic') {
        if (wordStartsWith(n.arabic, q)) return true;
      }
      if (searchField === '' || searchField === 'english_qarai') {
        if (wordStartsWith(n.english_qarai, q)) return true;
      }
      if (searchField === '' || searchField === 'urdu_jawadi') {
        if (wordStartsWith(n.urdu_jawadi, q)) return true;
      }
      if (searchField === '' || searchField === 'urdu_najafi') {
        if (wordStartsWith(n.urdu_najafi, q)) return true;
      }
      if (searchField === '' || searchField === 'german_bubenheim') {
        if (wordStartsWith(n.german_bubenheim, q)) return true;
      }
      return false;
    });
  }, [allVerses, pendingSearch, searchField]);

  useEffect(() => {
    if (!pendingSearch) return;
    const idx = filteredVerses.findIndex((v) => v.ayah === selectedVerse);
    if (idx === -1 && filteredVerses.length > 0) {
      setSelectedVerse(filteredVerses[0].ayah);
    }
  }, [pendingSearch, filteredVerses.length]);

  useEffect(() => {
    setLastReadPosition(selectedSurah, selectedVerse);
  }, [selectedSurah, selectedVerse]);

  useEffect(() => {
    if (!autoScrollActive || totalVerses <= 1) return;
    const interval = setInterval(() => {
      setSelectedVerse((prev) => {
        const next = prev + 1;
        if (next > totalVerses) {
          setAutoScrollActive(false);
          return prev;
        }
        return next;
      });
    }, autoScrollSpeed);
    return () => clearInterval(interval);
  }, [autoScrollActive, autoScrollSpeed, totalVerses]);

  useEffect(() => {
    if (!autoScrollActive) return;
    const timer = setTimeout(() => scrollToVerse(selectedVerse), 120);
    return () => clearTimeout(timer);
  }, [selectedVerse, autoScrollActive]);

  function loadFontScale(): number {
    if (typeof window === 'undefined') return 1;
    try { return parseFloat(localStorage.getItem('fontScale') || '1'); } catch { return 1; }
  }

  function loadSpacingScale(): number {
    if (typeof window === 'undefined') return 1;
    try { return parseFloat(localStorage.getItem('spacingScale') || '1'); } catch { return 1; }
  }

  function loadTextAlign(): TextAlignment {
    if (typeof window === 'undefined') return 'auto';
    try {
      const v = localStorage.getItem('textAlign');
      if (v === 'auto' || v === 'left' || v === 'center' || v === 'right' || v === 'justify') return v;
      return 'auto';
    } catch { return 'auto'; }
  }

  const handleArabicFontChange = useCallback((id: string) => {
    setArabicFont(id);
    saveFontPref('arabicFont', id);
  }, []);

  const handleUrduFontChange = useCallback((id: string) => {
    setUrduFont(id);
    saveFontPref('urduFont', id);
  }, []);

  const handleEnglishFontChange = useCallback((id: string) => {
    setEnglishFont(id);
    saveFontPref('englishFont', id);
  }, []);

  const handleFontScaleChange = useCallback((val: number) => {
    setFontScale(val);
    try { localStorage.setItem('fontScale', String(val)); } catch { }
  }, []);

  const handleSpacingScaleChange = useCallback((val: number) => {
    setSpacingScale(val);
    try { localStorage.setItem('spacingScale', String(val)); } catch { }
  }, []);

  const handleTextAlignChange = useCallback((val: TextAlignment) => {
    setTextAlign(val);
    try { localStorage.setItem('textAlign', val); } catch { }
  }, []);

  useEffect(() => {
    if (readingMode === 'monolingual') {
      const lang = primaryLanguage === 'english_qarai' ? 'en' : primaryLanguage === 'arabic' ? 'ar' : primaryLanguage === 'german_bubenheim' ? 'de' : 'ur';
      document.documentElement.lang = lang;
    } else {
      document.documentElement.lang = 'en';
    }
  }, [readingMode, primaryLanguage]);

  const toggleComparative = useCallback((key: TranslationKey) => {
    setComparativeSelections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  function scrollToVerse(ayah: number) {
    const el = verseRefs.current.get(ayah);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function handleToggleBookmark(surah: number, verse: number) {
    const currentlyBookmarked = isBookmarked(surah, verse);
    const updated = currentlyBookmarked
      ? removeBookmark(surah, verse)
      : addBookmark(surah, verse);
    setBookmarks(updated);
  }

  function navigateToBookmark(surah: number, verse: number) {
    setShowContinueReading(false);
    if (surah === selectedSurah) {
      setSelectedVerse(verse);
      setTimeout(() => scrollToVerse(verse), 50);
    } else {
      setPendingInitialVerse(verse);
      setSelectedSurah(surah);
    }
  }

  function dismissContinueReading() {
    setShowContinueReading(false);
  }

  function ta(): React.CSSProperties['textAlign'] | undefined {
    if (textAlign === 'auto') return undefined;
    return textAlign;
  }

  function rem(base: number) {
    return `${base * fontScale}rem`;
  }

  function lh(base: number) {
    return base * spacingScale;
  }

  function gap(base: number) {
    return `${base * spacingScale}rem`;
  }

  function highlightText(text: string): React.ReactNode {
    if (!searchQuery.trim()) return text;
    const q = normalizeText(searchQuery);
    const isDiacritic = (c: string) => {
      const code = c.charCodeAt(0);
      return code === 0x0640 || (code >= 0x064B && code <= 0x065F) || code === 0x0670 || code === 0x06E1 ||
        (code >= 0x06D6 && code <= 0x06DC) || (code >= 0x06DF && code <= 0x06E8) ||
        (code >= 0x06EA && code <= 0x06ED);
    };
    const groups: { base: string; diacs: string[] }[] = [];
    for (let i = 0; i < text.length; i++) {
      if (isDiacritic(text[i])) {
        if (groups.length > 0) groups[groups.length - 1].diacs.push(text[i]);
      } else {
        groups.push({ base: text[i], diacs: [] });
      }
    }
    const normGroups = groups.map(g => normalizeText(g.base));
    const normFull = normGroups.join('');

    // Find word-start positions in normFull
    const wordStarts: number[] = [];
    for (let i = 0; i < normFull.length; ) {
      while (i < normFull.length && /[\s\-–—\u200B\u200C]/.test(normFull[i])) i++;
      if (i >= normFull.length) break;
      wordStarts.push(i);
      while (i < normFull.length && !/[\s\-–—\u200B\u200C]/.test(normFull[i])) i++;
    }

    // Find matching word ranges
    const matches: [number, number][] = [];
    for (const pos of wordStarts) {
      if (normFull.slice(pos, pos + q.length) === q) {
        matches.push([pos, pos + q.length]);
      }
    }

    if (matches.length === 0) return text;

    // Merge overlapping/adjacent ranges
    const merged: [number, number][] = [matches[0]];
    for (let i = 1; i < matches.length; i++) {
      const last = merged[merged.length - 1];
      if (matches[i][0] <= last[1]) {
        last[1] = Math.max(last[1], matches[i][1]);
      } else {
        merged.push(matches[i]);
      }
    }

    const parts: React.ReactNode[] = [];
    let key = 0;
    let prevEnd = 0;

    for (const [start, end] of merged) {
      if (start > prevEnd) {
        parts.push(groups.slice(prevEnd, start).map(g => g.base + g.diacs.join('')).join(''));
      }
      parts.push(
        <mark key={key++} className="bg-accent/20 text-foreground rounded-sm px-0.5">
          {groups.slice(start, end).map(g => g.base + g.diacs.join('')).join('')}
        </mark>
      );
      prevEnd = end;
    }
    if (prevEnd < groups.length) {
      parts.push(groups.slice(prevEnd).map(g => g.base + g.diacs.join('')).join(''));
    }
    return <>{parts}</>;
  }

  function renderVerseArabic(verse: Verse) {
    return (
      <p
        key={`arabic-${verse.id}`}
        className="text-foreground"
        style={{
          fontSize: rem(2),
          lineHeight: lh(2.8),
          marginBottom: gap(1.5),
          fontFamily: `${getFontFamily(arabicFont)}, Noto Naskh Arabic, serif`,
          textAlign: ta(),
        }}
        dir="rtl"
      >
        {searchQuery ? highlightText(verse.arabic) : verse.arabic}
        <span className="text-foreground/80 mr-3 select-none" style={{ fontSize: rem(1.2) }}>
          {verse.ayah}
        </span>
      </p>
    );
  }

  function renderTranslation(verse: Verse, key: TranslationKey) {
    const isRtl = LANGUAGE_RTL[key];
    const font = isRtl && key === 'arabic'
      ? getFontFamily(arabicFont)
      : isRtl
        ? getFontFamily(urduFont)
        : getFontFamily(englishFont);
    return (
      <p
        key={`${key}-${verse.id}`}
        style={{
          fontSize: isRtl ? rem(1.125) : rem(1.05),
          lineHeight: lh(isRtl ? 2 : 1.7),
          marginBottom: gap(1),
          fontFamily: `${font}, ${isRtl ? 'Noto Nastaliq Urdu, serif' : 'Georgia, serif'}`,
          color: isRtl ? 'var(--color-foreground)' : 'var(--color-foreground-secondary)',
          textAlign: ta(),
        }}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {searchQuery ? highlightText(verse[key]) : verse[key]}
      </p>
    );
  }

  function renderVerses() {
    const info = surahInfo;
    const surahHeader = info ? (
      <div key={`surah-${info.number}`} className="mt-4 mb-8 text-center select-none">
        <p
          dir="rtl"
          style={{
            fontSize: rem(1.5),
            fontFamily: `${getFontFamily(arabicFont)}, Noto Naskh Arabic, serif`,
            marginBottom: rem(0.25),
            opacity: 0.8,
            textAlign: ta(),
          }}
          className="text-foreground"
        >
          {info.arabicName}
        </p>
        <p className="text-foreground text-sm sm:text-base md:text-lg font-sans tracking-wide">
          {info.number}. {info.name}
        </p>
        <p className="text-muted text-xs mt-1">
          {info.revelationType} · {info.totalAyah} verses
        </p>
      </div>
    ) : null;

    const verseBlocks = filteredVerses.map((verse) => {
      const bookmarked = isBookmarked(verse.surah, verse.ayah);

      const block = (() => {
        switch (readingMode) {
          case 'monolingual': {
            const isRtl = LANGUAGE_RTL[primaryLanguage];
            const isArabic = primaryLanguage === 'arabic';
            return (
              <div key={verse.id} style={{ marginBottom: gap(1.5) }}>
                {isRtl ? (
                  <p
                    style={{
                      fontSize: isArabic ? rem(1.6) : rem(1.2),
                      lineHeight: lh(2.2),
                      fontFamily: isArabic
                        ? `${getFontFamily(arabicFont)}, Noto Naskh Arabic, serif`
                        : `${getFontFamily(urduFont)}, Noto Nastaliq Urdu, serif`,
                      textAlign: ta(),
                    }}
                    dir="rtl"
                  >
                    {searchQuery ? highlightText(verse[primaryLanguage]) : verse[primaryLanguage]}
                    <span className="text-foreground/80 mr-3 select-none" style={{ fontSize: rem(1.2) }}>
                      {verse.ayah}
                    </span>
                  </p>
                ) : (
                  <p
                    style={{
                      fontSize: rem(1.125),
                      lineHeight: lh(1.8),
                      fontFamily: `${getFontFamily(englishFont)}, Georgia, serif`,
                      textAlign: ta(),
                    }}
                    dir="ltr"
                  >
                    <span className="text-muted align-super mr-2 select-none" style={{ fontSize: rem(0.7) }}>
                      {verse.ayah}
                    </span>
                    {searchQuery ? highlightText(verse[primaryLanguage]) : verse[primaryLanguage]}
                  </p>
                )}
              </div>
            );
          }

          case 'single-translation':
            return (
              <div key={verse.id} style={{ marginBottom: gap(2) }}>
                {renderVerseArabic(verse)}
                {renderTranslation(verse, selectedTranslation)}
              </div>
            );

          case 'comparative': {
            const sorted = COMPARATIVE_ORDER.filter((k) => comparativeSelections.includes(k));
            if (comparativeLayout === 'columns') {
              const count = sorted.length;
              const gridCols = count <= 1 ? '' :
                count === 2 ? 'md:grid-cols-2' :
                count === 4 ? 'md:grid-cols-2' :
                count <= 6 ? 'md:grid-cols-3' : 'md:grid-cols-4';
              return (
                <div key={verse.id} style={{ marginBottom: gap(2.5) }}>
                  {renderVerseArabic(verse)}
                  <div
                    className={`grid grid-cols-1 ${gridCols}`}
                    style={{ gap: gap(1.5) }}
                  >
                    {sorted.map((key, i) => (
                      <div
                        key={key}
                        dir={LANGUAGE_RTL[key] ? 'rtl' : 'ltr'}
                      >
                        <div className="text-xs text-muted/80 mb-1 text-center uppercase tracking-wider font-sans font-semibold">
                          {TRANSLATION_SHORT[key]}
                        </div>
                        {renderTranslation(verse, key)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div key={verse.id} style={{ marginBottom: gap(2.5) }}>
                {renderVerseArabic(verse)}
                <div style={{ display: 'flex', flexDirection: 'column', gap: gap(1) }}>
                  {sorted.map((key) => (
                    <div key={key} dir={LANGUAGE_RTL[key] ? 'rtl' : 'ltr'}>
                      <div className="text-xs text-muted/80 mb-0.5 text-center uppercase tracking-wider font-sans font-semibold">
                        {TRANSLATION_SHORT[key]}
                      </div>
                      {renderTranslation(verse, key)}
                    </div>
                  ))}
                </div>
              </div>
            );
          }
        }
      })();

      return (
        <div
          key={verse.id}
          ref={(el) => { if (el) verseRefs.current.set(verse.ayah, el); else verseRefs.current.delete(verse.ayah); }}
          data-verse={verse.ayah}
          className="relative group"
        >
          {searchQuery && verse.surah !== selectedSurah && (
            <div className="text-xs text-foreground/70 mb-1.5 font-sans font-medium">
              {getSurahInfo(verse.surah)?.name ?? `Surah ${verse.surah}`} · {verse.surah}:{verse.ayah}
            </div>
          )}
          {block}
          <button
            onClick={() => handleToggleBookmark(verse.surah, verse.ayah)}
            className="absolute top-0 end-0 p-1.5 text-muted/30 hover:text-accent transition-all duration-200 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
            aria-label={bookmarked ? `Remove bookmark for verse ${verse.ayah}` : `Bookmark verse ${verse.ayah}`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={bookmarked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      );
    });

    const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';

    return [
      surahHeader,
      ...(info && !searchQuery && info.number !== 1 && info.number !== 9
        ? [<p key="bismillah" dir="rtl" className="text-center text-foreground select-none mb-6" style={{ fontSize: rem(1.5), fontFamily: `${getFontFamily(arabicFont)}, Noto Naskh Arabic, serif` }}>{BISMILLAH}</p>]
        : []),
      ...verseBlocks,
    ];
  }

  return (
    <>
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        arabicFont={arabicFont}
        urduFont={urduFont}
        englishFont={englishFont}
        fontScale={fontScale}
        spacingScale={spacingScale}
        textAlign={textAlign}
        onArabicFontChange={handleArabicFontChange}
        onUrduFontChange={handleUrduFontChange}
        onEnglishFontChange={handleEnglishFontChange}
        onFontScaleChange={handleFontScaleChange}
        onSpacingScaleChange={handleSpacingScaleChange}
        onTextAlignChange={handleTextAlignChange}
      />

      <BookmarksPanel
        open={bookmarksPanelOpen}
        bookmarks={bookmarks}
        onClose={() => setBookmarksPanelOpen(false)}
        onNavigate={navigateToBookmark}
        onBookmarksChange={setBookmarks}
      />

      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/20">
          <div className={`${isComparativeColumns ? 'max-w-7xl' : 'max-w-5xl'} mx-auto px-3 sm:px-6 lg:px-8`}>
            <div className="flex items-center justify-between h-14 sm:h-16 md:h-18">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <img
                  src="/quran-samjho/logo.png"
                  alt="Quran Samjho logo"
                  className="h-10 sm:h-11 md:h-12 w-auto shrink-0"
                />
                <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl tracking-wide text-foreground font-sans truncate font-[500]">
                  Quran Samjho
                </h1>
                <span className="hidden sm:inline text-[11px] md:text-xs text-muted truncate">
                  — Maulana Syed Imon Rizvi
                </span>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
                <ModeButton
                  active={readingMode === 'monolingual'}
                  onClick={() => setReadingMode('monolingual')}
                  label="Mono"
                  fullLabel="Monolingual"
                />
                <ModeButton
                  active={readingMode === 'single-translation'}
                  onClick={() => setReadingMode('single-translation')}
                  label="Single"
                  fullLabel="Single Translation"
                />
                <ModeButton
                  active={readingMode === 'comparative'}
                  onClick={() => setReadingMode('comparative')}
                  label="Compare"
                  fullLabel="Comparative"
                />

                <button
                  onClick={() => setBookmarksPanelOpen(true)}
                  className="relative p-1.5 md:p-2 text-muted hover:text-foreground rounded transition-colors cursor-pointer"
                  aria-label="Open bookmarks"
                  title={`${bookmarks.length} bookmark${bookmarks.length !== 1 ? 's' : ''}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-5 md:h-5">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  {bookmarks.length > 0 && (
                    <span className="absolute -top-0.5 -end-0.5 flex items-center justify-center w-4 h-4 text-[9px] font-medium rounded-full bg-accent text-accent-foreground">
                      {bookmarks.length > 9 ? '9+' : bookmarks.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setSettingsOpen(true)}
                  className="ml-1 sm:ml-2 md:ml-3 p-1.5 md:p-2 text-muted hover:text-foreground rounded transition-colors cursor-pointer"
                  aria-label="Open settings"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="md:w-5 md:h-5">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
              </div>
            </div>

            <DesktopToolbar
              selectedSurah={selectedSurah}
              readingMode={readingMode}
              primaryLanguage={primaryLanguage}
              selectedTranslation={selectedTranslation}
              comparativeSelections={comparativeSelections}
              comparativeLayout={comparativeLayout}
              fontScale={fontScale}
              totalVerses={totalVerses}
              selectedVerse={selectedVerse}
              searchQuery={searchQuery}
              searchField={searchField}
              filteredCount={filteredVerses.length}
              autoScrollActive={autoScrollActive}
              autoScrollSpeed={autoScrollSpeed}
              onSurahChange={setSelectedSurah}
              onPrimaryLanguageChange={setPrimaryLanguage}
              onSelectedTranslationChange={setSelectedTranslation}
              onToggleComparative={toggleComparative}
              onComparativeLayoutChange={setComparativeLayout}
              onFontScaleChange={handleFontScaleChange}
              onVerseChange={(v) => { setSelectedVerse(v); scrollToVerse(v); }}
              onSearchQueryChange={setSearchQuery}
              onSearchFieldChange={setSearchField}
              onOpenSettings={() => setSettingsOpen(true)}
              onAutoScrollToggle={() => setAutoScrollActive((p) => !p)}
              onAutoScrollSpeedChange={setAutoScrollSpeed}
            />

            <MobileToolbarToggle
              selectedSurah={selectedSurah}
              readingMode={readingMode}
              primaryLanguage={primaryLanguage}
              selectedTranslation={selectedTranslation}
              comparativeSelections={comparativeSelections}
              comparativeLayout={comparativeLayout}
              fontScale={fontScale}
              totalVerses={totalVerses}
              selectedVerse={selectedVerse}
              searchQuery={searchQuery}
              searchField={searchField}
              filteredCount={filteredVerses.length}
              autoScrollActive={autoScrollActive}
              autoScrollSpeed={autoScrollSpeed}
              open={mobileToolbarOpen}
              onToggle={() => setMobileToolbarOpen(!mobileToolbarOpen)}
              onSurahChange={setSelectedSurah}
              onPrimaryLanguageChange={setPrimaryLanguage}
              onSelectedTranslationChange={setSelectedTranslation}
              onToggleComparative={toggleComparative}
              onComparativeLayoutChange={setComparativeLayout}
              onFontScaleChange={handleFontScaleChange}
              onVerseChange={(v) => { setSelectedVerse(v); scrollToVerse(v); }}
              onSearchQueryChange={setSearchQuery}
              onSearchFieldChange={setSearchField}
              onOpenSettings={() => setSettingsOpen(true)}
              onAutoScrollToggle={() => setAutoScrollActive((p) => !p)}
              onAutoScrollSpeedChange={setAutoScrollSpeed}
            />
          </div>
        </header>

        <main className={`${isComparativeColumns ? 'max-w-7xl' : 'max-w-5xl'} mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 md:py-12`}>
          {showContinueReading && continueReadingSurah !== null && continueReadingVerse !== null && (
            <div className="mb-6 flex items-center justify-center gap-3 text-xs text-muted bg-background-secondary/60 border border-border/20 rounded-lg px-4 py-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <span>
                Continue from {SURAH_LIST.find((s) => s.number === continueReadingSurah)?.name ?? `Surah ${continueReadingSurah}`}, Verse {continueReadingVerse}
              </span>
              <button
                onClick={() => navigateToBookmark(continueReadingSurah, continueReadingVerse)}
                className="text-accent hover:text-accent/80 font-medium transition-colors cursor-pointer"
              >
                Go
              </button>
              <button
                onClick={dismissContinueReading}
                className="text-muted/50 hover:text-muted transition-colors cursor-pointer p-0.5"
                aria-label="Dismiss"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {searchQuery && (
            <div className="text-center mb-6 text-xs text-muted">
              {filteredVerses.length} verse{filteredVerses.length !== 1 ? 's' : ''} match
              {filteredVerses.length > 0 && filteredVerses.length !== totalVerses && (
                <> (across all surahs)</>
              )}
            </div>
          )}

          <div ref={versesContainerRef} className={fontScale >= 1.8 ? '' : 'space-y-2'}>
            {renderVerses()}
          </div>

          <footer className="mt-12 sm:mt-16 pt-8 pb-6 border-t border-border/20 text-center text-xs text-muted select-none">
            <img
              src="/quran-samjho/logo.png"
              alt="Quran Samjho logo"
              className="h-16 w-auto mx-auto mb-3 opacity-80"
            />
            <p className="text-sm text-foreground/70 font-sans tracking-wide">Quran Samjho</p>
            <p className="mt-1.5 text-muted leading-relaxed max-w-lg mx-auto">
              A community service initiative by Syed Imon Rizvi — offering a space
              to read, understand, and reflect on the Holy Quran.
            </p>
            <p className="mt-3 text-muted/70 leading-relaxed max-w-md mx-auto italic">
              &ldquo;Reading with understanding is an act of reflection.
              It opens the heart, quiets the mind, and draws us closer
              to what matters most.&rdquo;
            </p>
            <p className="mt-3 text-muted/70 leading-relaxed max-w-md mx-auto">
              Mercer and Mills is committed to interfaith dialogue and
              humanitarian work — because peace begins when we seek
              to understand one another.
            </p>
            <div className="mt-5 pt-4 border-t border-border/10">
              <p className="text-foreground/60">— Maulana Syed Imon Rizvi</p>
              <p
                dir="rtl"
                style={{ fontFamily: `${getFontFamily(urduFont)}, Noto Nastaliq Urdu, serif` }}
                className="mt-1 text-foreground/50"
              >
                مولانا سیّد آئمن رضوی
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/10">
              <a
                href="mailto:mercerandmills@gmail.com,syedimonrizvipmp@gmail.com?subject=Quran%20Samjho%20Feedback"
                className="text-muted/50 hover:text-accent transition-colors"
              >
                Share feedback
              </a>
            </div>
          </footer>
        </main>
      </div>

      <a
        href="mailto:mercerandmills@gmail.com,syedimonrizvipmp@gmail.com?subject=Quran%20Samjho%20Feedback"
        className="fixed bottom-5 end-5 z-40 text-[11px] text-muted/40 hover:text-accent bg-background/80 backdrop-blur-sm border border-border/20 rounded-full px-3.5 py-2 transition-all duration-200 hover:border-accent/30 hover:text-accent select-none"
        aria-label="Send feedback"
      >
        Feedback
      </a>
    </>
  );
}

function DesktopToolbar({
  selectedSurah,
  readingMode,
  primaryLanguage,
  selectedTranslation,
  comparativeSelections,
  comparativeLayout,
  fontScale,
  totalVerses,
  selectedVerse,
  searchQuery,
  searchField,
  filteredCount,
  autoScrollActive,
  autoScrollSpeed,
  onSurahChange,
  onPrimaryLanguageChange,
  onSelectedTranslationChange,
  onToggleComparative,
  onComparativeLayoutChange,
  onFontScaleChange,
  onVerseChange,
  onSearchQueryChange,
  onSearchFieldChange,
  onOpenSettings,
  onAutoScrollToggle,
  onAutoScrollSpeedChange,
}: {
  selectedSurah: number;
  readingMode: ReadingMode;
  primaryLanguage: TranslationKey;
  selectedTranslation: TranslationKey;
  comparativeSelections: TranslationKey[];
  comparativeLayout: 'stacked' | 'columns';
  fontScale: number;
  totalVerses: number;
  selectedVerse: number;
  searchQuery: string;
  searchField: TranslationKey | 'arabic' | '';
  filteredCount: number;
  autoScrollActive: boolean;
  autoScrollSpeed: number;
  onSurahChange: (n: number) => void;
  onPrimaryLanguageChange: (k: TranslationKey) => void;
  onSelectedTranslationChange: (k: TranslationKey) => void;
  onToggleComparative: (k: TranslationKey) => void;
  onComparativeLayoutChange: (layout: 'stacked' | 'columns') => void;
  onFontScaleChange: (v: number) => void;
  onVerseChange: (v: number) => void;
  onSearchQueryChange: (q: string) => void;
  onSearchFieldChange: (f: TranslationKey | 'arabic' | '') => void;
  onOpenSettings: () => void;
  onAutoScrollToggle: () => void;
  onAutoScrollSpeedChange: (speed: number) => void;
}) {
  return (
    <div className="hidden sm:block border-t border-border/20">
      <div className="flex flex-wrap items-center gap-2 py-2">
        <ToolbarFirstRow
          selectedSurah={selectedSurah}
          readingMode={readingMode}
          primaryLanguage={primaryLanguage}
          selectedTranslation={selectedTranslation}
          comparativeSelections={comparativeSelections}
          comparativeLayout={comparativeLayout}
          fontScale={fontScale}
          onSurahChange={onSurahChange}
          onPrimaryLanguageChange={onPrimaryLanguageChange}
          onSelectedTranslationChange={onSelectedTranslationChange}
          onToggleComparative={onToggleComparative}
          onComparativeLayoutChange={onComparativeLayoutChange}
          onFontScaleChange={onFontScaleChange}
          onOpenSettings={onOpenSettings}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 pb-2.5">
        <VerseSlider
          totalVerses={totalVerses}
          selectedVerse={selectedVerse}
          onChange={onVerseChange}
        />
        <AutoScrollControls
          active={autoScrollActive}
          speed={autoScrollSpeed}
          totalVerses={totalVerses}
          selectedVerse={selectedVerse}
          onToggle={onAutoScrollToggle}
          onSpeedChange={onAutoScrollSpeedChange}
        />
        <SearchBar
          searchQuery={searchQuery}
          searchField={searchField}
          filteredCount={filteredCount}
          onChange={onSearchQueryChange}
          onFieldChange={onSearchFieldChange}
        />
      </div>
    </div>
  );
}

function MobileToolbarToggle({
  selectedSurah,
  readingMode,
  primaryLanguage,
  selectedTranslation,
  comparativeSelections,
  comparativeLayout,
  fontScale,
  totalVerses,
  selectedVerse,
  searchQuery,
  searchField,
  filteredCount,
  autoScrollActive,
  autoScrollSpeed,
  open,
  onToggle,
  onSurahChange,
  onPrimaryLanguageChange,
  onSelectedTranslationChange,
  onToggleComparative,
  onComparativeLayoutChange,
  onFontScaleChange,
  onVerseChange,
  onSearchQueryChange,
  onSearchFieldChange,
  onOpenSettings,
  onAutoScrollToggle,
  onAutoScrollSpeedChange,
}: {
  selectedSurah: number;
  readingMode: ReadingMode;
  primaryLanguage: TranslationKey;
  selectedTranslation: TranslationKey;
  comparativeSelections: TranslationKey[];
  comparativeLayout: 'stacked' | 'columns';
  fontScale: number;
  totalVerses: number;
  selectedVerse: number;
  searchQuery: string;
  searchField: TranslationKey | 'arabic' | '';
  filteredCount: number;
  autoScrollActive: boolean;
  autoScrollSpeed: number;
  open: boolean;
  onToggle: () => void;
  onSurahChange: (n: number) => void;
  onPrimaryLanguageChange: (k: TranslationKey) => void;
  onSelectedTranslationChange: (k: TranslationKey) => void;
  onToggleComparative: (k: TranslationKey) => void;
  onComparativeLayoutChange: (layout: 'stacked' | 'columns') => void;
  onFontScaleChange: (v: number) => void;
  onVerseChange: (v: number) => void;
  onSearchQueryChange: (q: string) => void;
  onSearchFieldChange: (f: TranslationKey | 'arabic' | '') => void;
  onOpenSettings: () => void;
  onAutoScrollToggle: () => void;
  onAutoScrollSpeedChange: (speed: number) => void;
}) {
  return (
    <div className="sm:hidden border-t border-border/20">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-1 py-2 text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
      >
        <span className="truncate mr-2">
          {SURAH_LIST.find((s) => s.number === selectedSurah)?.name ?? `Surah ${selectedSurah}`}
          {totalVerses > 0 && <> · {selectedVerse}/{totalVerses}</>}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="pb-3 space-y-2">
          <ToolbarFirstRow
            selectedSurah={selectedSurah}
            readingMode={readingMode}
            primaryLanguage={primaryLanguage}
            selectedTranslation={selectedTranslation}
            comparativeSelections={comparativeSelections}
            comparativeLayout={comparativeLayout}
            fontScale={fontScale}
            onSurahChange={onSurahChange}
            onPrimaryLanguageChange={onPrimaryLanguageChange}
            onSelectedTranslationChange={onSelectedTranslationChange}
            onToggleComparative={onToggleComparative}
            onComparativeLayoutChange={onComparativeLayoutChange}
            onFontScaleChange={onFontScaleChange}
            onOpenSettings={onOpenSettings}
          />
          <div className="flex items-center gap-2">
            <VerseSlider
              totalVerses={totalVerses}
              selectedVerse={selectedVerse}
              onChange={onVerseChange}
            />
            <AutoScrollControls
              active={autoScrollActive}
              speed={autoScrollSpeed}
              totalVerses={totalVerses}
              selectedVerse={selectedVerse}
              onToggle={onAutoScrollToggle}
              onSpeedChange={onAutoScrollSpeedChange}
            />
          </div>
          <SearchBar
            searchQuery={searchQuery}
            searchField={searchField}
            filteredCount={filteredCount}
            onChange={onSearchQueryChange}
            onFieldChange={onSearchFieldChange}
          />
        </div>
      )}
    </div>
  );
}

function ToolbarFirstRow({
  selectedSurah,
  readingMode,
  primaryLanguage,
  selectedTranslation,
  comparativeSelections,
  comparativeLayout,
  fontScale,
  onSurahChange,
  onPrimaryLanguageChange,
  onSelectedTranslationChange,
  onToggleComparative,
  onComparativeLayoutChange,
  onFontScaleChange,
  onOpenSettings,
}: {
  selectedSurah: number;
  readingMode: ReadingMode;
  primaryLanguage: TranslationKey;
  selectedTranslation: TranslationKey;
  comparativeSelections: TranslationKey[];
  comparativeLayout: 'stacked' | 'columns';
  fontScale: number;
  onSurahChange: (n: number) => void;
  onPrimaryLanguageChange: (k: TranslationKey) => void;
  onSelectedTranslationChange: (k: TranslationKey) => void;
  onToggleComparative: (k: TranslationKey) => void;
  onComparativeLayoutChange: (layout: 'stacked' | 'columns') => void;
  onFontScaleChange: (v: number) => void;
  onOpenSettings: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <select
        value={selectedSurah}
        onChange={(e) => onSurahChange(Number(e.target.value))}
        className="bg-transparent text-xs sm:text-sm text-muted border border-border/40 rounded px-2 sm:px-3 py-1.5 focus:outline-none focus:border-border cursor-pointer min-w-0 max-w-[160px] sm:max-w-[200px]"
      >
        {SURAH_LIST.map((s) => (
          <option key={s.number} value={s.number}>
            {s.number}. {s.name}
          </option>
        ))}
      </select>

      {readingMode === 'monolingual' && (
        <select
          value={primaryLanguage}
          onChange={(e) => onPrimaryLanguageChange(e.target.value as TranslationKey)}
          className="bg-transparent text-xs sm:text-sm text-muted border border-border/40 rounded px-2 sm:px-3 py-1.5 focus:outline-none focus:border-border cursor-pointer"
        >
          {(['arabic', 'english_qarai', 'urdu_jawadi', 'urdu_najafi', 'german_bubenheim'] as TranslationKey[]).map((key) => (
            <option key={key} value={key}>
              {TRANSLATION_SHORT[key]}
            </option>
          ))}
        </select>
      )}

      {readingMode === 'single-translation' && (
        <select
          value={selectedTranslation}
          onChange={(e) => onSelectedTranslationChange(e.target.value as TranslationKey)}
          className="bg-transparent text-xs sm:text-sm text-muted border border-border/40 rounded px-2 sm:px-3 py-1.5 focus:outline-none focus:border-border cursor-pointer"
        >
          {SOURCE_TRANSLATIONS.map((key) => (
            <option key={key} value={key}>
              {TRANSLATION_SHORT[key]}
            </option>
          ))}
        </select>
      )}

      {readingMode === 'comparative' && (
        <div className="flex flex-wrap items-center gap-1">
          {SOURCE_TRANSLATIONS.map((key) => (
            <button
              key={key}
              onClick={() => onToggleComparative(key)}
              className={`text-[11px] sm:text-xs px-2 sm:px-3 py-1 rounded-full border transition-colors duration-200 cursor-pointer ${
                comparativeSelections.includes(key)
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'border-border/40 text-muted hover:border-border/70'
              }`}
            >
              {TRANSLATION_SHORT[key]}
            </button>
          ))}
          <span className="w-px h-4 bg-border/20 mx-1" />
          <button
            onClick={() => onComparativeLayoutChange('columns')}
            className={`text-[11px] px-2 py-1 rounded border transition-colors duration-200 cursor-pointer ${
              comparativeLayout === 'columns'
                ? 'bg-accent/10 text-accent border-accent/30'
                : 'border-border/40 text-muted hover:border-border/70'
            }`}
            title="Column layout"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="inline-block align-middle">
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <rect x="14" y="3" width="7" height="18" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => onComparativeLayoutChange('stacked')}
            className={`text-[11px] px-2 py-1 rounded border transition-colors duration-200 cursor-pointer ${
              comparativeLayout === 'stacked'
                ? 'bg-accent/10 text-accent border-accent/30'
                : 'border-border/40 text-muted hover:border-border/70'
            }`}
            title="Stacked layout"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="inline-block align-middle">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        <label className="flex items-center gap-1 text-xs text-muted cursor-pointer" title="Font size">
          <span style={{ fontSize: '0.55rem' }} className="hidden xs:inline">A</span>
          <input
            type="range"
            min={FONT_MIN}
            max={FONT_MAX}
            step={FONT_STEP}
            value={fontScale}
            onChange={(e) => onFontScaleChange(parseFloat(e.target.value))}
            aria-label="Font size"
            className="w-12 sm:w-16 h-1 accent-foreground cursor-pointer"
          />
          <span style={{ fontSize: '0.8rem' }} className="hidden xs:inline">A</span>
        </label>

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-muted hover:text-foreground rounded transition-colors cursor-pointer sm:hidden"
          aria-label="More settings"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function VerseSlider({
  totalVerses,
  selectedVerse,
  onChange,
}: {
  totalVerses: number;
  selectedVerse: number;
  onChange: (v: number) => void;
}) {
  const [inputVal, setInputVal] = useState(String(selectedVerse));

  useEffect(() => {
    setInputVal(String(selectedVerse));
  }, [selectedVerse]);

  if (totalVerses <= 1) return null;

  function handleSubmit() {
    const num = parseInt(inputVal, 10);
    if (!isNaN(num) && num >= 1 && num <= totalVerses) {
      onChange(num);
    } else {
      setInputVal(String(selectedVerse));
    }
  }

  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <span className="text-[11px] text-muted shrink-0 w-5 text-right tabular-nums">{selectedVerse}</span>
      <input
        type="range"
        min={1}
        max={totalVerses}
        step={1}
        value={selectedVerse}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        aria-label={`Verse ${selectedVerse} of ${totalVerses}`}
        className="flex-1 h-1 accent-foreground cursor-pointer min-w-[60px]"
      />
      <input
        type="number"
        min={1}
        max={totalVerses}
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        onBlur={handleSubmit}
        aria-label="Go to verse"
        className="w-10 sm:w-12 text-[11px] text-muted bg-transparent border border-border/40 rounded px-1.5 py-0.5 text-center focus:outline-none focus:border-border tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-[11px] text-muted shrink-0 w-5 tabular-nums">{totalVerses}</span>
    </div>
  );
}

function SearchBar({
  searchQuery,
  searchField,
  filteredCount,
  onChange,
  onFieldChange,
}: {
  searchQuery: string;
  searchField: TranslationKey | 'arabic' | '';
  filteredCount: number;
  onChange: (q: string) => void;
  onFieldChange: (f: TranslationKey | 'arabic' | '') => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex items-center gap-1.5">
      <div className={`flex items-center gap-1 transition-all duration-200 ${expanded ? 'w-auto' : 'w-0 overflow-hidden'}`}>
        {expanded && (
          <>
            <select
              value={searchField}
              onChange={(e) => onFieldChange(e.target.value as TranslationKey | 'arabic' | '')}
              className="bg-transparent text-[11px] text-muted border border-border/40 rounded px-1.5 py-1 focus:outline-none focus:border-border cursor-pointer max-w-[90px]"
            >
              <option value="">All</option>
              {SEARCH_FIELDS.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Search verses..."
              className="bg-transparent text-xs text-foreground border border-border/40 rounded px-2 py-1 focus:outline-none focus:border-border w-[130px] sm:w-[160px] placeholder:text-muted/50"
            />
            {searchQuery && (
              <span className="text-[10px] text-muted shrink-0 tabular-nums">{filteredCount}</span>
            )}
          </>
        )}
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`p-1 rounded transition-colors cursor-pointer ${
          expanded || searchQuery
            ? 'text-accent'
            : 'text-muted hover:text-foreground'
        }`}
        aria-label={expanded ? 'Close search' : 'Search'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {expanded ? (
            <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
          ) : (
            <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>
          )}
        </svg>
      </button>
    </div>
  );
}

function AutoScrollControls({
  active,
  speed,
  totalVerses,
  selectedVerse,
  onToggle,
  onSpeedChange,
}: {
  active: boolean;
  speed: number;
  totalVerses: number;
  selectedVerse: number;
  onToggle: () => void;
  onSpeedChange: (speed: number) => void;
}) {
  const SPEED_OPTIONS = [
    { label: '3s', value: 3000 },
    { label: '5s', value: 5000 },
    { label: '8s', value: 8000 },
    { label: '12s', value: 12000 },
    { label: '20s', value: 20000 },
  ];

  if (totalVerses <= 1) return null;

  return (
    <div className={`flex items-center gap-1.5 transition-opacity duration-200 ${active || selectedVerse < totalVerses ? 'opacity-100' : 'opacity-50'}`}>
      <button
        onClick={onToggle}
        className={`p-1 rounded transition-colors cursor-pointer ${
          active ? 'text-accent' : 'text-muted hover:text-foreground'
        }`}
        aria-label={active ? 'Pause auto-scroll' : 'Start auto-scroll'}
        title={active ? 'Pause' : 'Auto-scroll'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          {active ? (
            <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>
          ) : (
            <polygon points="6 4 22 12 6 20" />
          )}
        </svg>
      </button>

      {active && (
        <select
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="bg-transparent text-[11px] text-muted border border-border/40 rounded px-1 py-0.5 focus:outline-none focus:border-border cursor-pointer"
          aria-label="Auto-scroll speed"
        >
          {SPEED_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
  fullLabel,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  fullLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs sm:text-sm md:text-base px-2 sm:px-4 md:px-5 py-1.5 md:py-2 rounded-full transition-colors duration-200 cursor-pointer ${
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted hover:text-foreground'
      }`}
    >
      <span className="sm:hidden">{label}</span>
      <span className="hidden sm:inline">{fullLabel}</span>
    </button>
  );
}
