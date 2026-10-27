/** Shared types for the Mushaf app */

export interface SurahMeta {
  n: number; // 1..114
  name: string; // Arabic name
  ename: string; // English transliterated name
  tname: string; // English meaning
  type: "Meccan" | "Medinan";
  ayahs: number;
  order: number;
  rukus: number;
  start: number;
  page: number | null;
}

export interface VerseData {
  v: number; // verse number within surah
  t: string; // uthmani text
  c: string; // clean text (no diacritics) for quiz matching
  tr: string; // Saheeh International translation
}

export type VerseStatus = "learning" | "memorized";

/** Per-verse progress record as returned by the API */
export interface VerseProgress {
  surah: number;
  verse: number;
  status: VerseStatus;
  level: number;
  intervalDays: number;
  ease: number;
  repetitions: number;
  lapses: number;
  nextReviewAt: string | null; // ISO
  lastReviewedAt: string | null; // ISO
  memorizedAt: string | null; // ISO
}

export interface SurahWithProgress extends SurahMeta {
  memorized: number;
  learning: number;
  due: number;
}

export interface SurahDetailResponse {
  surah: SurahMeta;
  bismillah: { t: string; tr: string } | null; // null for surah 9, surah 1 has no separate header
  verses: (VerseData & { progress: VerseProgress | null })[];
}

export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface ReviewCard {
  surah: number;
  verse: number;
  t: string;
  c: string;
  tr: string;
  progress: VerseProgress;
}

export interface DueResponse {
  count: number;
  due: ReviewCard[];
}

export interface ActivityDay {
  date: string; // yyyy-mm-dd
  versesMemorized: number;
  versesReviewed: number;
}

export interface StatsResponse {
  memorized: number;
  learning: number;
  mastered: number;
  due: number;
  totalVerses: number;
  today: {
    date: string;
    versesMemorized: number;
    versesReviewed: number;
  };
  activity: ActivityDay[];
  streak: number;
}

export interface SurahsResponse {
  surahs: SurahWithProgress[];
}

export const RECITERS = [
  { id: "Alafasy_128kbps", name: "Mishary Alafasy" },
  { id: "Abdul_Basit_Murattal_192kbps", name: "Abdul Basit" },
  { id: "Husary_128kbps", name: "Mahmoud Al-Husary" },
  { id: "Minshawy_Murattal_128kbps", name: "Al-Minshawi" },
  { id: "Ghamadi_40kbps", name: "Saad Al-Ghamdi" },
] as const;

export function verseAudioUrl(
  reciter: string,
  surah: number,
  verse: number
): string {
  const s = String(surah).padStart(3, "0");
  const v = String(verse).padStart(3, "0");
  return `https://everyayah.com/data/${reciter}/${s}${v}.mp3`;
}
