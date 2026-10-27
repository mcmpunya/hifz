// Prepare Quran data from Tanzil.net source files into a single app JSON
// Source files (downloaded from tanzil.net):
//   - tanzil-uthmani.txt        (Uthmani script, ver 1.1)
//   - tanzil-simple-clean.txt   (no diacritics)
//   - tanzil-en-sahih.txt       (Sahih International translation)
//   - tanzil-en-translit.txt    (transliteration, has HTML tags)
//   - quran-data.xml            (metadata: surah names/types/counts)

import fs from 'node:fs';
import path from 'node:path';

const DATA = '/home/z/my-project/data';
const OUT = path.join(DATA, 'quran.json');

function readVerseFile(file) {
  const lines = fs.readFileSync(path.join(DATA, file), 'utf8').split('\n');
  const map = new Map(); // "s:a" -> text
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('#=')) continue;
    const m = t.match(/^(\d+)\|(\d+)\|(.+)$/);
    if (!m) continue;
    const s = parseInt(m[1], 10), a = parseInt(m[2], 10);
    if (s < 1 || s > 114 || a < 1) continue;
    map.set(`${s}:${a}`, m[3].trim());
  }
  return map;
}

const uthmani = readVerseFile('tanzil-uthmani.txt');
const clean = readVerseFile('tanzil-simple-clean.txt');
const sahih = readVerseFile('tanzil-en-sahih.txt');
const translitRaw = readVerseFile('tanzil-en-translit.txt');

// strip HTML tags from transliteration (e.g. <u>a</u>, <b>l</b>)
const translit = new Map();
for (const [k, v] of translitRaw) {
  translit.set(k, v.replace(/<\/?[a-zA-Z][^>]*>/g, '').replace(/\s+/g, ' ').trim());
}

// parse metadata xml
const xml = fs.readFileSync(path.join(DATA, 'quran-data.xml'), 'utf8');
const surahs = [];
const suraRe = /<sura\s+index="(\d+)"\s+ayas="(\d+)"\s+start="(\d+)"\s+name="([^"]*)"\s+tname="([^"]*)"\s+ename="([^"]*)"\s+type="([^"]*)"\s+order="(\d+)"\s+rukus="(\d+)"/g;
let m;
while ((m = suraRe.exec(xml)) !== null) {
  surahs.push({
    n: parseInt(m[1], 10),
    ayas: parseInt(m[2], 10),
    name: m[4],
    tname: m[5],
    ename: m[6],
    type: m[7],
    order: parseInt(m[8], 10),
  });
}

// --- bismillah handling -------------------------------------------------
// Fatiha (1) keeps bismillah as verse 1; Tawbah (9) has none.
// For other surahs verse 1 starts with bismillah (4 words) -> strip for
// display, and the UI shows a decorative bismillah header instead.
const BISMILLAH_UT = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
const BISMILLAH_CLEAN = 'بسم الله الرحمن الرحيم';

function stripBismillah(text, expected) {
  const words = text.split(/\s+/);
  const first4 = words.slice(0, 4).join(' ');
  // sanity: compare ignoring diacritics
  const norm = (s) => s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '');
  const expWords = expected.split(/\s+/);
  if (
    words.length > 4 &&
    norm(words[0]).startsWith(norm(expWords[0]).slice(0, 2)) &&
    norm(first4) === norm(expected)
  ) {
    return words.slice(4).join(' ');
  }
  return text;
}

const verses = {};
let verseCount = 0;
let bismillahStripped = 0;
let mismatch = 0;

for (const surah of surahs) {
  const arr = [];
  for (let a = 1; a <= surah.ayas; a++) {
    const key = `${surah.n}:${a}`;
    let t = uthmani.get(key);
    let c = clean.get(key);
    const tr = sahih.get(key);
    let tl = translit.get(key);
    if (!t || !c || !tr || !tl) {
      mismatch++;
      console.warn('MISSING', key);
      continue;
    }
    if (surah.n !== 1 && surah.n !== 9 && a === 1) {
      const t2 = stripBismillah(t, BISMILLAH_UT);
      const c2 = stripBismillah(c, BISMILLAH_CLEAN);
      const tl2 = stripBismillah(tl, 'Bismi Allahi alrrahmani alrraheemi');
      if (t2 !== t) bismillahStripped++;
      t = t2; c = c2; tl = tl2;
    }
    arr.push({ n: a, t, c, tr, tl });
    verseCount++;
  }
  verses[String(surah.n)] = arr;
}

const out = {
  meta: {
    source: 'Tanzil.net (Quran text ver 1.1)',
    translation: 'Sahih International (via tanzil.net)',
    transliteration: 'Tanzil transliteration',
    verseCount,
    generatedAt: new Date().toISOString(),
  },
  surahs,
  verses,
};

fs.writeFileSync(OUT, JSON.stringify(out), 'utf8');
const sizeMB = (fs.statSync(OUT).size / 1024 / 1024).toFixed(2);
console.log(`OK surahs=${surahs.length} verses=${verseCount} bismillahStripped=${bismillahStripped} mismatch=${mismatch} size=${sizeMB}MB`);
// quick checks
const v255 = JSON.parse(fs.readFileSync(OUT, 'utf8')).verses['2'].find(v => v.n === 255);
console.log('2:255 clean words:', v255.c.split(' ').length, '| tr:', v255.tr.slice(0, 60));
const v1 = JSON.parse(fs.readFileSync(OUT, 'utf8')).verses['2'].find(v => v.n === 1);
console.log('2:1 uthmani starts:', v1.t.split(' ')[0], '| translit starts:', v1.tl.split(' ')[0]);
