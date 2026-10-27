import { readFileSync, statSync } from "fs";
import { join } from "path";
import type { SurahMeta, VerseData } from "./types";

/**
 * Server-side loader for the consolidated Quran dataset
 * (built from Tanzil.net source files by scripts/build-quran-data.mjs).
 */

export interface BismillahInfo {
  t: string;
  tr: string;
}

interface QuranJson {
  meta: {
    source: string;
    textVersion: string;
    translation: string;
    totalVerses: number;
    juz: number[];
  };
  bismillah: BismillahInfo;
  surahs: SurahMeta[];
  verses: Record<string, VerseData[]>;
}

const globalForQuran = globalThis as unknown as {
  quranData: QuranJson | undefined;
  quranDataMtime: number | undefined;
};

const QURAN_JSON_PATH = join(process.cwd(), "data", "quran.json");

export function getQuranData(): QuranJson {
  const mtime = statSync(QURAN_JSON_PATH).mtimeMs;
  if (globalForQuran.quranData && globalForQuran.quranDataMtime === mtime) {
    return globalForQuran.quranData;
  }
  const parsed = JSON.parse(readFileSync(QURAN_JSON_PATH, "utf8")) as QuranJson;
  if (parsed.surahs.length !== 114) {
    throw new Error("Corrupted quran.json");
  }
  globalForQuran.quranData = parsed;
  globalForQuran.quranDataMtime = mtime;
  return parsed;
}

export function getSurah(num: number): SurahMeta | undefined {
  return getQuranData().surahs.find((s) => s.n === num);
}

export function getVerses(num: number): VerseData[] {
  return getQuranData().verses[String(num)] ?? [];
}

export function getBismillah(): BismillahInfo {
  return getQuranData().bismillah;
}

export function getTotalVerses(): number {
  return getQuranData().meta.totalVerses;
}
