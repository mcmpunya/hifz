import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getQuran } from "@/lib/quran";
import { dateKey } from "@/lib/srs";
import type { StatsPayload } from "@/lib/quran-client";

export const dynamic = "force-dynamic";

// GET /api/stats -> dashboard stats
export async function GET() {
  const totalVerses = getQuran().meta.verseCount;

  const [memorized, learning, dueNow, activityRows, today] = await Promise.all([
    db.verseProgress.count({ where: { status: "memorized" } }),
    db.verseProgress.count({ where: { status: "learning" } }),
    db.verseProgress.count({ where: { status: "memorized", nextReviewAt: { lte: new Date() } } }),
    db.activityLog.findMany({ orderBy: { date: "asc" } }),
    db.activityLog.findUnique({ where: { date: dateKey() } }),
  ]);

  // streak: consecutive days ending today (or yesterday if today has no activity yet)
  const byDate = new Map(activityRows.map((a) => [a.date, a]));
  let streak = 0;
  const now = new Date();
  let cursor = new Date(now);
  if (!byDate.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (byDate.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // last 30 days activity
  const activity: StatsPayload["activity"] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const row = byDate.get(key);
    activity.push({ date: key, memorized: row?.memorized ?? 0, reviewed: row?.reviewed ?? 0 });
  }

  // per-surah progress
  const progRows = await db.verseProgress.findMany({
    where: { status: "memorized" },
    select: { surah: true },
  });
  const counts: Record<number, number> = {};
  for (const r of progRows) counts[r.surah] = (counts[r.surah] ?? 0) + 1;
  const surahProgress = getQuran().surahs.map((s) => ({
    n: s.n,
    tname: s.tname,
    memorized: counts[s.n] ?? 0,
    total: s.ayas,
  }));

  const payload: StatsPayload = {
    memorized,
    learning,
    dueNow,
    totalVerses,
    streak,
    todayMemorized: today?.memorized ?? 0,
    todayReviewed: today?.reviewed ?? 0,
    activity,
    surahProgress,
  };

  return NextResponse.json(payload);
}
