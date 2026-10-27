// Shared client-side types and constants

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
  n: number;
  t: string;
  c: string;
  tr: string;
  tl: string;
}

export interface VerseProgressInfo {
  status: string; // none | learning | memorized
  intervalDays: number;
  nextReviewAt: string | null;
  lapses: number;
}

export interface SurahWithProgress extends SurahMeta {
  memorized: number;
  learning: number;
}

export interface SurahDetail {
  surah: SurahMeta;
  verses: (VerseData & { progress: VerseProgressInfo })[];
}

export interface ReviewVerse extends VerseData {
  intervalDays: number;
  repetitions: number;
  lapses: number;
}

export interface StatsPayload {
  memorized: number;
  learning: number;
  dueNow: number;
  totalVerses: number;
  streak: number;
  todayMemorized: number;
  todayReviewed: number;
  activity: { date: string; memorized: number; reviewed: number }[];
  surahProgress: { n: number; tname: string; memorized: number; total: number }[];
}

export const RECITERS = [
  { id: "Alafasy_128kbps", name: "Mishary Alafasy" },
  { id: "Abdul_Basit_Murattal_192kbps", name: "Abdul Basit" },
  { id: "Husary_128kbps", name: "Mahmoud Al-Husary" },
  { id: "Minshawy_Murattal_128kbps", name: "Mohamed Al-Minshawi" },
] as const;

export function audioUrl(reciter: string, surah: number, verse: number): string {
  const s = String(surah).padStart(3, "0");
  const v = String(verse).padStart(3, "0");
  return `https://everyayah.com/data/${reciter}/${s}${v}.mp3`;
}

export const BISMILLAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
