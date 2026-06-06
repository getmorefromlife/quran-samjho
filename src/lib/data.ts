import { Verse } from './types';
import { SURAH_LIST, SurahInfo } from './surahs';
import ALL_VERSES from '@/lib/quran-complete.json';

export { SURAH_LIST };
export type { SurahInfo };

export function getVersesBySurah(surahNumber: number): Verse[] {
  return (ALL_VERSES as Verse[]).filter((v) => v.surah === surahNumber);
}

export function getSurahInfo(surahNumber: number): SurahInfo | undefined {
  return SURAH_LIST.find((s) => s.number === surahNumber);
}

export { SURAH_LIST as SURAH_NAMES };
