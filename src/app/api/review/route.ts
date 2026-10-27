import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerses } from "@/lib/quran";
import { schedule, dateKey, type Rating } from "@/lib/srs";
import type { ReviewVerse } from "@/lib/quran-client";

export const dynamic = "force-dynamic";

// GET /api/review -> verses due for review (oldest first, capped)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));

  const rows = await db.verseProgress.findMany({
    where: { status: "memorized", nextReviewAt: { lte: new Date() } },
    orderBy: { nextReviewAt: "asc" },
    take: limit,
  });

  const q = getVerses(rows.map((r) => ({ surah: r.surah, verse: r.verse })));
  const verses: (ReviewVerse & { surah: number })[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const v = q[i];
    if (v && v.n === r.verse) {
      verses.push({
        ...v,
        surah: r.surah,
        intervalDays: r.intervalDays,
        repetitions: r.repetitions,
        lapses: r.lapses,
      });
    }
  }

  const total = await db.verseProgress.count({
    where: { status: "memorized", nextReviewAt: { lte: new Date() } },
  });

  return NextResponse.json({ verses, total });
}

// POST /api/review -> submit a rating for a verse
export async function POST(req: Request) {
  let body: { surah: number; verse: number; rating: Rating };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { surah, verse, rating } = body;
  const valid: Rating[] = ["again", "hard", "good", "easy"];
  if (!Number.isInteger(surah) || !Number.isInteger(verse) || !valid.includes(rating)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await db.verseProgress.findUnique({
    where: { surah_verse: { surah, verse } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Verse not tracked" }, { status: 404 });
  }

  const next = schedule(
    {
      status: existing.status,
      repetitions: existing.repetitions,
      intervalDays: existing.intervalDays,
      lapses: existing.lapses,
      ease: existing.ease,
    },
    rating
  );

  await db.verseProgress.update({
    where: { surah_verse: { surah, verse } },
    data: {
      status: next.status,
      repetitions: next.repetitions,
      intervalDays: next.intervalDays,
      lapses: next.lapses,
      ease: next.ease,
      nextReviewAt: next.nextReviewAt,
      lastReviewedAt: new Date(),
      memorizedAt: next.memorizedAt ?? existing.memorizedAt,
    },
  });

  await db.activityLog.upsert({
    where: { date: dateKey() },
    create: { date: dateKey(), reviewed: 1 },
    update: { reviewed: { increment: 1 } },
  });

  return NextResponse.json({
    ok: true,
    status: next.status,
    intervalDays: next.intervalDays,
    nextReviewAt: next.nextReviewAt.toISOString(),
  });
}
