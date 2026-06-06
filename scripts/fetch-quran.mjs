import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions';

const SOURCES = {
  arabic: 'https://api.islamic.app/v1/quran/verses/uthmani',
  english_qarai: 'eng-aliquliqarai.min.json',
  urdu_jawadi: 'urd-syedzeeshanhaid.min.json',
  urdu_najafi: 'urd-muhammadhussain.min.json',
  german_bubenheim: 'https://tanzil.net/trans/de.bubenheim',
};

async function fetchEd(name, url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${name}: ${resp.status}`);
  const raw = await resp.json();
  const data = raw.quran || raw;
  console.log(`  ${name}: ${data.length} verses`);
  return data;
}

async function fetchTanzilPlain(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch german: ${resp.status}`);
  const text = await resp.text();
  const lines = text.trim().split('\n').filter(l => l && !l.startsWith('#'));
  const data = lines.map(line => {
    const parts = line.split('|');
    return { chapter: Number(parts[0]), verse: Number(parts[1]), text: parts.slice(2).join('|') };
  });
  console.log(`  german_bubenheim: ${data.length} verses`);
  return data;
}

async function fetchIslamicApp(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch arabic: ${resp.status}`);
  const raw = await resp.json();
  const ayahs = raw.data.ayahs;
  console.log(`  arabic: ${ayahs.length} verses`);
  // Convert to same format as other sources
  return ayahs.map(a => ({
    chapter: Number(a.verse_key.split(':')[0]),
    verse: Number(a.verse_key.split(':')[1]),
    text: a.text,
  }));
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
    if (name === 'arabic') {
      tasks[name] = fetchIslamicApp(file);
    } else if (name === 'german_bubenheim') {
      tasks[name] = fetchTanzilPlain(file);
    } else {
      tasks[name] = fetchEd(name, `${BASE}/${file}`);
    }
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
  const germanMap = extractVerseMap(results.german_bubenheim);

  const allKeys = new Set([
    ...Object.keys(arabicMap),
    ...Object.keys(englishMap),
    ...Object.keys(urduJawadiMap),
    ...Object.keys(urduNajafiMap),
    ...Object.keys(germanMap),
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
    const de = germanMap[key];

    verses.push({
      id,
      surah: surahNum,
      ayah: ayahNum,
      arabic: a?.text || '',
      english_qarai: en?.text || '',
      urdu_jawadi: urJ?.text || '',
      urdu_najafi: urN?.text || '',
      german_bubenheim: de?.text || '',
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
