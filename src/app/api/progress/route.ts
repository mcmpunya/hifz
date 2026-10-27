import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dateKey } from "@/lib/srs";

export const dynamic = "force-dynamic";

interface ProgressBody {
  surah: number;
  verse: number;
  action: "markLearning" | "markMemorized" | "reset";
}

async function bumpActivity(field: "memorized" | "reviewed", amount = 1) {
  const key = dateKey();
  await db.activityLog.upsert({
    where: { date: key },
    create: { date: key, [field]: amount },
    update: { [field]: { increment: amount } },
  });
}

// POST /api/progress -> mark / unmark a verse
export async function POST(req: Request) {
  let body: ProgressBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { surah, verse, action } = body;
  if (
    !Number.isInteger(surah) || surah < 1 || surah > 114 ||
    !Number.isInteger(verse) || verse < 1 ||
    !["markLearning", "markMemorized", "reset"].includes(action)
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (action === "reset") {
    await db.verseProgress.deleteMany({ where: { surah, verse } });
    return NextResponse.json({ ok: true, status: "none" });
  }

  if (action === "markLearning") {
    const existing = await db.verseProgress.findUnique({
      where: { surah_verse: { surah, verse } },
    });
    if (existing?.status === "memorized") {
      return NextResponse.json({ ok: true, status: "memorized" });
    }
    const row = await db.verseProgress.upsert({
      where: { surah_verse: { surah, verse } },
      create: { surah, verse, status: "learning" },
      update: { status: "learning" },
    });
    return NextResponse.json({ ok: true, status: row.status });
  }

  // markMemorized -> start SRS: due tomorrow
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  const row = await db.verseProgress.upsert({
    where: { surah_verse: { surah, verse } },
    create: {
      surah,
      verse,
      status: "memorized",
      repetitions: 1,
      intervalDays: 1,
      memorizedAt: now,
      nextReviewAt: next,
      lastReviewedAt: now,
    },
    update: {
      status: "memorized",
      repetitions: 1,
      intervalDays: 1,
      memorizedAt: now,
      nextReviewAt: next,
      lastReviewedAt: now,
    },
  });
  await bumpActivity("memorized");
  return NextResponse.json({ ok: true, status: row.status });
}
