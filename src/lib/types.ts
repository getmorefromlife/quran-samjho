export type TranslationKey = 'arabic' | 'english_qarai' | 'urdu_jawadi' | 'urdu_najafi';

export type ReadingMode = 'monolingual' | 'single-translation' | 'comparative';

export interface Verse {
  id: number;
  surah: number;
  ayah: number;
  arabic: string;
  english_qarai: string;
  urdu_jawadi: string;
  urdu_najafi: string;
}

export const TRANSLATION_LABELS: Record<TranslationKey, string> = {
  arabic: 'Arabic',
  english_qarai: 'English (Ali Quli Qarai)',
  urdu_jawadi: 'Urdu (Zeeshan Haider Jawadi)',
  urdu_najafi: 'Urdu (Mohsin Ali Najafi)',
};

export const TRANSLATION_SHORT: Record<TranslationKey, string> = {
  arabic: 'Arabic',
  english_qarai: 'English',
  urdu_jawadi: 'Urdu (Jawadi)',
  urdu_najafi: 'Urdu (Najafi)',
};

export const LANGUAGE_RTL: Record<TranslationKey, boolean> = {
  arabic: true,
  english_qarai: false,
  urdu_jawadi: true,
  urdu_najafi: true,
};

export const SOURCE_TRANSLATIONS: TranslationKey[] = [
  'english_qarai',
  'urdu_jawadi',
  'urdu_najafi',
];
