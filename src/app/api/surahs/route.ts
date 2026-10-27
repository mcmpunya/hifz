import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSurahList } from "@/lib/quran";

export const dynamic = "force-dynamic";

// GET /api/surahs -> all surahs with memorization aggregates
export async function GET() {
  const surahs = getSurahList();
  const [progress, dueAgg] = await Promise.all([
    db.verseProgress.findMany({
      select: { surah: true, status: true },
    }),
    db.verseProgress.findMany({
      where: { status: "memorized", nextReviewAt: { lte: new Date() } },
      select: { surah: true },
    }),
  ]);

  const agg: Record<number, { memorized: number; learning: number; due: number }> = {};
  for (const p of progress) {
    if (!agg[p.surah]) agg[p.surah] = { memorized: 0, learning: 0, due: 0 };
    if (p.status === "memorized") agg[p.surah].memorized++;
    else agg[p.surah].learning++;
  }
  for (const d of dueAgg) {
    if (agg[d.surah]) agg[d.surah].due++;
  }

  const payload = surahs.map((s) => ({
    ...s,
    memorized: agg[s.n]?.memorized ?? 0,
    learning: agg[s.n]?.learning ?? 0,
    due: agg[s.n]?.due ?? 0,
  }));

  return NextResponse.json({ surahs: payload });
}
