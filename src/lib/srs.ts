// Lightweight spaced-repetition scheduler for verse reviews
// Ladder: 1 -> 3 -> 7 -> 14 -> 30 -> 60 -> 120 -> 180 days

export type Rating = "again" | "hard" | "good" | "easy";

const LADDER = [1, 3, 7, 14, 30, 60, 120, 180];

export interface SrsState {
  status: string; // learning | memorized
  repetitions: number;
  intervalDays: number;
  lapses: number;
  ease: string;
}

export interface SrsResult {
  status: string;
  repetitions: number;
  intervalDays: number;
  lapses: number;
  ease: string;
  nextReviewAt: Date;
  memorizedAt?: Date;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function schedule(state: SrsState, rating: Rating, now = new Date()): SrsResult {
  const { repetitions, intervalDays, lapses } = state;

  if (rating === "again") {
    // forgot: back to today, relearn
    return {
      status: "learning",
      repetitions: 0,
      intervalDays: 0,
      lapses: lapses + 1,
      ease: "hard",
      nextReviewAt: now,
    };
  }

  // successful review
  const newRep = repetitions + 1;

  if (state.status !== "memorized") {
    // graduating from learning to memorized on first success
    const interval = rating === "easy" ? 3 : 1;
    return {
      status: "memorized",
      repetitions: newRep,
      intervalDays: interval,
      lapses,
      ease: rating,
      nextReviewAt: addDays(now, interval),
      memorizedAt: now,
    };
  }

  // already memorized: advance along the ladder
  const idx = LADDER.indexOf(intervalDays);
  const base = idx === -1 ? 0 : idx;
  let interval: number;
  if (rating === "hard") {
    interval = Math.max(1, Math.round(intervalDays * 0.6));
  } else if (rating === "easy") {
    interval = LADDER[Math.min(LADDER.length - 1, base + 2)] ?? intervalDays * 2;
    if (interval <= intervalDays) interval = Math.round(intervalDays * 1.5);
  } else {
    interval = LADDER[Math.min(LADDER.length - 1, base + 1)];
    if (interval <= intervalDays) interval = Math.round(intervalDays * 1.3);
  }
  interval = Math.min(interval, 240);

  return {
    status: "memorized",
    repetitions: newRep,
    intervalDays: interval,
    lapses,
    ease: rating,
    nextReviewAt: addDays(now, interval),
  };
}

// preview next intervals (days) for hard/good/easy given current interval
export function previewIntervals(intervalDays: number): { hard: number; good: number; easy: number } {
  const idx = LADDER.indexOf(intervalDays);
  const base = idx === -1 ? 0 : idx;
  let hard = Math.max(1, Math.round(intervalDays * 0.6));
  let good = LADDER[Math.min(LADDER.length - 1, base + 1)];
  if (good <= intervalDays) good = Math.round(intervalDays * 1.3);
  let easy = LADDER[Math.min(LADDER.length - 1, base + 2)];
  if (easy <= intervalDays) easy = Math.round(intervalDays * 1.5);
  hard = Math.min(hard, 240);
  good = Math.min(good, 240);
  easy = Math.min(easy, 240);
  return { hard, good, easy };
}

// local yyyy-mm-dd key (used by ActivityLog)
export function dateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}
