import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSurah } from "@/lib/quran";
import type { VerseProgressInfo } from "@/lib/quran-client";

export const dynamic = "force-dynamic";

// GET /api/surah/[num] -> surah verses + per-verse progress
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ num: string }> }
) {
  const { num } = await ctx.params;
  const n = parseInt(num, 10);
  if (!Number.isInteger(n) || n < 1 || n > 114) {
    return NextResponse.json({ error: "Invalid surah number" }, { status: 400 });
  }

  const data = getSurah(n);
  if (!data) {
    return NextResponse.json({ error: "Surah not found" }, { status: 404 });
  }

  const rows = await db.verseProgress.findMany({
    where: { surah: n },
    select: { verse: true, status: true, intervalDays: true, nextReviewAt: true, lapses: true },
  });
  const map = new Map(rows.map((r) => [r.verse, r]));

  const verses = data.verses.map((v) => {
    const p = map.get(v.n);
    const progress: VerseProgressInfo = p
      ? {
          status: p.status,
          intervalDays: p.intervalDays,
          nextReviewAt: p.nextReviewAt ? p.nextReviewAt.toISOString() : null,
          lapses: p.lapses,
        }
      : { status: "none", intervalDays: 0, nextReviewAt: null, lapses: 0 };
    return { ...v, progress };
  });

  return NextResponse.json({ surah: data.surah, verses });
}
