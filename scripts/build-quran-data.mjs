/**
 * Build consolidated quran.json from Tanzil.net source files.
 *
 * Sources (Tanzil Project — https://tanzil.net):
 *   - data/tanzil-uthmani.txt   Uthmani script (ver 1.1)
 *   - data/tanzil-clean.txt     Simple-clean script (no diacritics)
 *   - data/tanzil-en-sahih.txt  Saheeh International translation
 *   - data/quran-data.js        Quran metadata (sura list, juz, pages)
 *
 * Output: data/quran.json
 *
 * Tanzil text convention: verse 1 of every surah (except surah 1 and 9)
 * is prefixed with the Bismillah. We strip it and render Bismillah
 * separately in the UI header.
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");

// ---------- parse metadata ----------
const metaJs = readFileSync(join(dataDir, "quran-data.js"), "utf8");
const suraMatch = metaJs.match(/QuranData\.Sura\s*=\s*\[([\s\S]*?)\n\];/);
if (!suraMatch) throw new Error("Cannot parse QuranData.Sura");
// Evaluate the array contents safely
const suraRaw = suraMatch[1];
const suraList = eval(`[${suraRaw}]`); // index 0 is empty array
const juzMatch = metaJs.match(/QuranData\.Juz\s*=\s*\[([\s\S]*?)\n\];/);
const juzList = juzMatch ? eval(`[${juzMatch[1]}]`) : [];
const pageMatch = metaJs.match(/QuranData\.Page\s*=\s*\[([\s\S]*?)\n\];/);
const pageList = pageMatch ? eval(`[${pageMatch[1]}]`) : [];
// pageList[p] = [surah, ayah] of the first ayah on mushaf page p (index 0 empty)

/** Madinah mushaf page that contains the first ayah of surah `s` */
function surahStartPage(s) {
  let best = 1;
  for (let p = 1; p < pageList.length; p++) {
    const [ps, pa] = pageList[p];
    if (ps < s || (ps === s && pa <= 1)) best = p;
    else break;
  }
  return best;
}

// ---------- parse verse text files ----------
function parseVerseFile(path) {
  const lines = readFileSync(path, "utf8").split("\n");
  const map = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split("|");
    if (parts.length !== 3) continue;
    const [s, v, text] = parts;
    map[`${s}:${v}`] = text;
  }
  return map;
}

const uthmani = parseVerseFile(join(dataDir, "tanzil-uthmani.txt"));
const clean = parseVerseFile(join(dataDir, "tanzil-clean.txt"));
const enSahih = parseVerseFile(join(dataDir, "tanzil-en-sahih.txt"));

// ---------- bismillah stripping ----------
// Tanzil prefixes bismillah (4 words) on verse 1 of all surahs except 1 & 9.
function stripBismillah(surah, verse, text) {
  if (verse !== 1 || surah === 1 || surah === 9) return text;
  const words = text.split(" ");
  // bismillah is exactly 4 words: بسم / الله / الرحمن / الرحيم (with variants)
  if (words.length > 4) return words.slice(4).join(" ");
  return "";
}

// ---------- build surah + verse structures ----------
const surahs = [];
const verses = {}; // keyed by surah number as string -> array of verse objects

for (let s = 1; s <= 114; s++) {
  const meta = suraList[s]; // [start, ayas, order, rukus, name, tname, ename, type]
  const [start, ayahCount, order, rukus, arabicName, tname, ename, type] = meta;
  surahs.push({
    n: s,
    name: arabicName,
    ename,
    tname,
    type,
    ayahs: ayahCount,
    order,
    rukus,
    start,
    page: surahStartPage(s),
  });

  const list = [];
  for (let v = 1; v <= ayahCount; v++) {
    const key = `${s}:${v}`;
    const uthText = uthmani[key];
    const cleanText = clean[key];
    const trans = enSahih[key];
    if (uthText === undefined || cleanText === undefined) {
      throw new Error(`Missing verse text for ${key}`);
    }
    list.push({
      v,
      t: stripBismillah(s, v, uthText).trim(),
      c: stripBismillah(s, v, cleanText).trim(),
      tr: trans !== undefined ? trans.trim() : "",
    });
  }
  verses[String(s)] = list;
}

// ---------- sanity checks ----------
const totalVerses = Object.values(verses).reduce((a, l) => a + l.length, 0);
if (totalVerses !== 6236) throw new Error(`Expected 6236 verses, got ${totalVerses}`);
if (verses["1"].length !== 7) throw new Error("Surah 1 should have 7 verses");
if (verses["114"].length !== 6) throw new Error("Surah 114 should have 6 verses");
if (verses["2"][0].t.includes("الرحمن") && verses["2"][0].t.startsWith("بِسْمِ"))
  throw new Error("Bismillah not stripped for 2:1: " + verses["2"][0].t);
if (verses["1"][0].t === "") throw new Error("Surah 1:1 should keep bismillah");
if (verses["9"][0].t.startsWith("بِسْمِ"))
  throw new Error("Surah 9 should not have bismillah");

// ---------- write output ----------
const output = {
  meta: {
    source: "Tanzil.net",
    textVersion: "1.1",
    translation: "Saheeh International (via Tanzil.net)",
    totalVerses,
    juz: juzList.filter((x) => typeof x === "number"),
  },
  bismillah: {
    t: "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
    tr: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
  },
  surahs,
  verses,
};

writeFileSync(join(dataDir, "quran.json"), JSON.stringify(output));
console.log(`OK — wrote data/quran.json`);
console.log(`   surahs: ${surahs.length}, verses: ${totalVerses}`);
console.log(`   sample 2:1 -> ${verses["2"][0].t}`);
console.log(`   sample 112:1 -> ${verses["112"][0].t} | ${verses["112"][0].tr}`);
