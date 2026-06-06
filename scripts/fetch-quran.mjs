import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions';

const SOURCES = {
  arabic: 'ara-quranuthmanihaf.min.json',
  english_qarai: 'eng-aliquliqarai.min.json',
  urdu_jawadi: 'urd-syedzeeshanhaid.min.json',
  urdu_najafi: 'urd-muhammadhussain.min.json',
};

async function fetchEd(name, url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${name}: ${resp.status}`);
  const raw = await resp.json();
  const data = raw.quran || raw;
  console.log(`  ${name}: ${data.length} verses`);
  return data;
}

function extractVerseMap(data) {
  const map = {};
  for (const item of data) {
    const key = `${item.chapter}:${item.verse}`;
    map[key] = { surah: Number(item.chapter), ayah: Number(item.verse), text: item.text || '' };
  }
  return map;
}

async function main() {
  console.log('Fetching Quran data...\n');

  const tasks = {};
  for (const [name, file] of Object.entries(SOURCES)) {
    tasks[name] = fetchEd(name, `${BASE}/${file}`);
  }

  const results = {};
  for (const [name, task] of Object.entries(tasks)) {
    results[name] = await task;
  }

  console.log('\nCombining verses...');
  const arabicMap = extractVerseMap(results.arabic);
  const englishMap = extractVerseMap(results.english_qarai);
  const urduJawadiMap = extractVerseMap(results.urdu_jawadi);
  const urduNajafiMap = extractVerseMap(results.urdu_najafi);

  const allKeys = new Set([
    ...Object.keys(arabicMap),
    ...Object.keys(englishMap),
    ...Object.keys(urduJawadiMap),
    ...Object.keys(urduNajafiMap),
  ]);

  const verses = [];
  let id = 1;

  const surahMap = {};
  for (const key of [...allKeys].sort((a, b) => {
    const [s1, v1] = a.split(':').map(Number);
    const [s2, v2] = b.split(':').map(Number);
    return s1 !== s2 ? s1 - s2 : v1 - v2;
  })) {
    const [surahNum, ayahNum] = key.split(':').map(Number);
    const a = arabicMap[key];
    const en = englishMap[key];
    const urJ = urduJawadiMap[key];
    const urN = urduNajafiMap[key];

    verses.push({
      id,
      surah: surahNum,
      ayah: ayahNum,
      arabic: a?.text || '',
      english_qarai: en?.text || '',
      urdu_jawadi: urJ?.text || '',
      urdu_najafi: urN?.text || '',
    });
    id++;
  }

  console.log(`Total verses: ${verses.length}`);
  console.log(`Surahs: ${new Set(verses.map(v => v.surah)).size}`);

  const outDir = path.join(__dirname, '..', 'src', 'lib');
  fs.writeFileSync(path.join(outDir, 'quran-complete.json'), JSON.stringify(verses));
  console.log(`\nWritten to src/lib/quran-complete.json (${(Buffer.byteLength(JSON.stringify(verses)) / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch(console.error);
