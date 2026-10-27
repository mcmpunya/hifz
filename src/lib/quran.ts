// Server-side loader for the Tanzil Quran data bundle (data/quran.json)
import fs from "fs";
import path from "path";

export interface SurahMeta {
  n: number;
  ayas: number;
  name: string;
  tname: string;
  ename: string;
  type: string;
  order: number;
}

export interface VerseData {
  n: number; // verse number
  t: string; // uthmani text
  c: string; // clean text (no diacritics)
  tr: string; // Sahih International translation
  tl: string; // transliteration
}

interface QuranBundle {
  meta: { source: string; translation: string; verseCount: number };
  surahs: SurahMeta[];
  verses: Record<string, VerseData[]>;
}

const DATA_PATH = path.join(process.cwd(), "data", "quran.json");

let cached: QuranBundle | null = null;

export function getQuran(): QuranBundle {
  if (!cached) {
    cached = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as QuranBundle;
  }
  return cached;
}

export function getSurahList(): SurahMeta[] {
  return getQuran().surahs;
}

export function getSurah(num: number): { surah: SurahMeta; verses: VerseData[] } | null {
  const q = getQuran();
  const surah = q.surahs.find((s) => s.n === num);
  if (!surah) return null;
  return { surah, verses: q.verses[String(num)] ?? [] };
}

export function getVerses(refs: { surah: number; verse: number }[]): VerseData[] {
  const q = getQuran();
  const out: VerseData[] = [];
  for (const r of refs) {
    const arr = q.verses[String(r.surah)];
    if (!arr) continue;
    const v = arr.find((x) => x.n === r.verse);
    if (v) out.push(v);
  }
  return out;
}

// Bismillah shown as decorative header for all surahs except 1 and 9
export const HAS_BISMILLAH_HEADER = (n: number) => n !== 1 && n !== 9;
