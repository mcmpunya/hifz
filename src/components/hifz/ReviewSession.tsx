"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Play, Sparkles, Square, ThumbsDown, ThumbsUp, Volume2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-hifz-settings";
import { useVerseAudio } from "@/hooks/use-verse-audio";
import { previewIntervals } from "@/lib/srs";
import { audioUrl, type ReviewVerse } from "@/lib/quran-client";
import type { View } from "@/app/page";

type Rated = { again: number; hard: number; good: number; easy: number };

export default function ReviewSession({ go }: { go: (v: View) => void }) {
  const [queue, setQueue] = useState<ReviewVerse[] | null>(null);
  const [total, setTotal] = useState(0);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [showTrans, setShowTrans] = useState(false);
  const [done, setDone] = useState(false);
  const [rated, setRated] = useState<Rated>({ again: 0, hard: 0, good: 0, easy: 0 });
  const { settings } = useSettings();
  const audio = useVerseAudio();
  const { toast } = useToast();

  const load = useCallback(() => {
    fetch("/api/review?limit=20")
      .then((r) => r.json())
      .then((d) => {
        setQueue(d.verses ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    return () => audio.stop();
  }, [load]);

  const current = queue?.[idx];
  const words = useMemo(() => (current ? current.t.split(/\s+/).filter(Boolean) : []), [current]);
  const hiddenCount = showAll ? 0 : words.length - revealed.size;

  const revealAll = () => {
    setShowAll(true);
    setShowTrans(true);
  };

  const rate = async (r: "again" | "hard" | "good" | "easy") => {
    if (!current) return;
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surah: current.surah, verse: current.n, rating: r }),
    });
    if (!res.ok) {
      toast({ title: "Something went wrong", variant: "destructive" });
      return;
    }
    setRated((s) => ({ ...s, [r]: s[r] + 1 }));
    if (idx + 1 < (queue?.length ?? 0)) {
      setIdx((i) => i + 1);
      setRevealed(new Set());
      setShowAll(false);
      setShowTrans(false);
    } else {
      setDone(true);
    }
  };

  if (queue === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <span className="medallion size-16 bg-secondary text-primary mx-auto border border-primary/20">
          <Check className="size-7" aria-hidden />
        </span>
        <h1 className="text-2xl font-extrabold">
          {total === 0 ? "Nothing to review yet" : "All caught up!"}
        </h1>
        <p className="text-muted-foreground max-w-sm mx-auto">
          {total === 0
            ? "Memorize a few verses first — reviews are scheduled the day after you memorize them, then spaced out over time."
            : `You've reviewed everything due today. ${total > 0 ? "" : ""}Come back tomorrow to keep your streak strong.`}
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <Button variant="outline" onClick={() => go({ name: "browse" })}>
            Memorize something new
          </Button>
          <Button variant="ghost" onClick={() => go({ name: "home" })}>
            <ArrowLeft className="size-4 rotate-180" aria-hidden /> Home
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    const totalReviewed = rated.again + rated.hard + rated.good + rated.easy;
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <span className="medallion size-16 bg-secondary text-amber-600 mx-auto border border-amber-500/30">
          <Zap className="size-7" aria-hidden />
        </span>
        <h1 className="text-2xl font-extrabold">Review complete</h1>
        <p className="text-muted-foreground">
          {totalReviewed} verse{totalReviewed === 1 ? "" : "s"} reviewed — memory reinforced.
        </p>
        <div className="flex justify-center gap-2 flex-wrap text-xs">
          {(["again", "hard", "good", "easy"] as const).map((k) => (
            <span key={k} className="rounded-full border bg-card px-3 py-1.5 font-semibold capitalize">
              {k}: {rated[k]}
            </span>
          ))}
        </div>
        <div className="flex gap-2 justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => {
              load();
              setIdx(0);
              setDone(false);
              setRated({ again: 0, hard: 0, good: 0, easy: 0 });
            }}
          >
            Check for more
          </Button>
          <Button onClick={() => go({ name: "home" })}>Done</Button>
        </div>
      </div>
    );
  }

  const preview = previewIntervals(current?.intervalDays ?? 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-extrabold inline-flex items-center gap-2">
          <Zap className="size-5 text-amber-500" aria-hidden /> Spaced review
        </h1>
        <p className="text-xs font-semibold text-muted-foreground">
          {idx + 1} / {queue.length} due
        </p>
      </div>
      <Progress value={(idx / queue.length) * 100} className="h-1.5" />

      {current && (
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">
                Surah {current.surah} · verse {current.n}
                {current.lapses > 0 && <span className="text-orange-600"> · slipped {current.lapses}×</span>}
              </span>
              <span>Recall it, then rate yourself</span>
            </div>

            <div
              className="rounded-xl border bg-card p-4 cursor-pointer min-h-28"
              onClick={() => {
                if (hiddenCount > 0) revealAll();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && hiddenCount > 0 && revealAll()}
              aria-label="Tap to reveal verse"
            >
              <p className="ayah-text text-[1.7rem] sm:text-3xl text-right" dir="rtl" lang="ar">
                {words.map((w, i) => {
                  const hidden = !showAll && !revealed.has(i);
                  return (
                    <span key={i} className={cn("ayah-word", hidden && "is-hidden")}>
                      {hidden ? w : w}
                      {i < words.length - 1 ? " " : ""}
                    </span>
                  );
                })}
                <span className="inline-flex items-center align-middle mx-1">
                  <span className="medallion size-6 bg-secondary border border-amber-500/40 text-primary text-[10px] font-bold">
                    {current.n}
                  </span>
                </span>
              </p>
            </div>

            {showTrans ? (
              <p className="text-sm text-foreground/75 leading-relaxed">{current.tr}</p>
            ) : (
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setShowTrans(true)}>
                Show translation
              </Button>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Play recitation"
                onClick={() =>
                  audio.playing
                    ? audio.stop()
                    : audio.play({
                        url: audioUrl(settings.reciter, current.surah, current.n),
                        repeats: 1,
                        delay: 0,
                      })
                }
              >
                {audio.playing ? <Square className="size-4" /> : <Play className="size-4" />}
              </Button>
              {hiddenCount > 0 ? (
                <Button className="flex-1 font-semibold" onClick={revealAll}>
                  <Sparkles className="size-4" aria-hidden /> Reveal verse ({hiddenCount} words left)
                </Button>
              ) : (
                <p className="flex-1 text-xs text-muted-foreground text-center">
                  <Volume2 className="size-3.5 inline mr-1" aria-hidden />
                  How well did you recall it?
                </p>
              )}
            </div>

            {/* rating buttons */}
            <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-2 transition-opacity", hiddenCount > 0 && "opacity-40 pointer-events-none")}>
              <Button variant="destructive" className="flex-col h-auto py-2 gap-0.5" onClick={() => rate("again")}>
                <ThumbsDown className="size-4" aria-hidden />
                <span className="font-semibold text-xs">Forgot</span>
                <span className="text-[10px] opacity-80">today</span>
              </Button>
              <Button variant="secondary" className="flex-col h-auto py-2 gap-0.5" onClick={() => rate("hard")}>
                <span className="font-semibold text-xs">Hard</span>
                <span className="text-[10px] text-muted-foreground">{preview.hard}d</span>
              </Button>
              <Button variant="secondary" className="flex-col h-auto py-2 gap-0.5" onClick={() => rate("good")}>
                <span className="font-semibold text-xs">Good</span>
                <span className="text-[10px] text-muted-foreground">{preview.good}d</span>
              </Button>
              <Button className="flex-col h-auto py-2 gap-0.5" onClick={() => rate("easy")}>
                <ThumbsUp className="size-4" aria-hidden />
                <span className="font-semibold text-xs">Easy</span>
                <span className="text-[10px] opacity-80">{preview.easy}d</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
