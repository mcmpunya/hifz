import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/progress/reset-all -> wipe all memorization data
export async function POST() {
  await db.$transaction([
    db.verseProgress.deleteMany({}),
    db.activityLog.deleteMany({}),
  ]);
  return NextResponse.json({ ok: true });
}
