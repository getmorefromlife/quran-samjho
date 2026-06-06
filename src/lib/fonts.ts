export interface FontOption {
  id: string;
  name: string;
  family: string;
  type: 'arabic' | 'urdu' | 'english';
}

export const ARABIC_FONTS: FontOption[] = [
  { id: 'amiri-quran', name: 'Amiri Quran', family: 'Amiri Quran', type: 'arabic' },
  { id: 'amiri', name: 'Amiri', family: 'Amiri', type: 'arabic' },
  { id: 'aref-ruqaa', name: 'Aref Ruqaa', family: 'Aref Ruqaa', type: 'arabic' },
  { id: 'el-messiri', name: 'El Messiri', family: 'El Messiri', type: 'arabic' },
  { id: 'alkalami', name: 'Alkalami', family: 'Alkalami', type: 'arabic' },
  { id: 'fustat', name: 'Fustat', family: 'Fustat', type: 'arabic' },
  { id: 'harmattan', name: 'Harmattan', family: 'Harmattan', type: 'arabic' },
  { id: 'kfgqpc', name: 'KFGQPC Uthman Taha Naskh', family: 'KFGQPC Uthman Taha Naskh', type: 'arabic' },
  { id: 'al-qalam', name: 'Al Qalam Quran Majeed', family: 'Al Qalam Quran Majeed Web', type: 'arabic' },
  { id: 'me-quran', name: 'Me Quran Volt Newmet', family: 'Me Quran Volt Newmet', type: 'arabic' },
  { id: 'scheherazade', name: 'Scheherazade New', family: 'Scheherazade New', type: 'arabic' },
  { id: 'noto-naskh', name: 'Noto Naskh Arabic', family: 'Noto Naskh Arabic', type: 'arabic' },
];

export const URDU_FONTS: FontOption[] = [
  { id: 'noto-nastaliq', name: 'Noto Nastaliq Urdu', family: 'Noto Nastaliq Urdu', type: 'urdu' },
  { id: 'jameel-noori', name: 'Jameel Noori Nastaleeq', family: 'Jameel Noori Nastaleeq', type: 'urdu' },
];

export const ENGLISH_FONTS: FontOption[] = [
  { id: 'georgia', name: 'Georgia', family: 'Georgia', type: 'english' },
  { id: 'times', name: 'Times New Roman', family: 'Times New Roman', type: 'english' },
  { id: 'palatino', name: 'Palatino Linotype', family: 'Palatino Linotype', type: 'english' },
  { id: 'garamond', name: 'Garamond', family: 'Garamond', type: 'english' },
  { id: 'system-serif', name: 'System Serif', family: 'serif', type: 'english' },
];

export const DEFAULT_FONTS = {
  arabic: 'scheherazade',
  urdu: 'noto-nastaliq',
  english: 'georgia',
};

export function getFontFamily(id: string): string {
  const name = [...ARABIC_FONTS, ...URDU_FONTS, ...ENGLISH_FONTS].find((f) => f.id === id)?.family ?? 'serif';
  if (name.includes(' ') && !name.includes('"')) {
    return `"${name}"`;
  }
  return name;
}
