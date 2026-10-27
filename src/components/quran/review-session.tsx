"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  Frown,
  Meh,
  PartyPopper,
  Repeat2,
  Smile,
  Volume2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMushafStore } from "@/lib/store";
import { ratingHints } from "@/lib/srs";
import {
  RECITERS,
  verseAudioUrl,
  type DueResponse,
  type ReviewRating,
} from "@/lib/types";
import { useApi } from "./use-api";
import { cn } from "@/lib/utils";

interface ReviewSessionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Tally {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export function ReviewSession({ open, onOpenChange }: ReviewSessionProps) {
  const { data, loading, refetch } = useApi<DueResponse>(
    open ? "/api/review?limit=40" : null
  );
  const { settings, bumpRefresh } = useMushafStore();
  const { toast } = useToast();

  const [queue, setQueue] = useState<DueResponse["due"]>([]);
  const [phase, setPhase] = useState<"recall" | "rate">("recall");
  const [seen, setSeen] = useState(0);
  const [tally, setTally] = useState<Tally>({ again: 0, hard: 0, good: 0, easy: 0 });
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hintShown, setHintShown] = useState(false);

  const card = started ? queue[0] : undefined;
  const remaining = queue.length;
  const hints = useMemo(
    () => (card ? ratingHints(card.progress) : null),
    [card]
  );

  function start() {
    if (!data) return;
    setQueue(data.due);
    setSeen(0);
    setPhase("recall");
    setTally({ again: 0, hard: 0, good: 0, easy: 0 });
    setHintShown(false);
    setStarted(true);
  }

  async function rate(r: ReviewRating) {
    if (!card || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surah: card.surah, verse: card.verse, rating: r }),
      });
      if (!res.ok) throw new Error("Failed to save review");
      setTally((t) => ({ ...t, [r]: t[r] + 1 }));
      setSeen((s) => s + 1);
      bumpRefresh();
      setQueue((q) => {
        const rest = q.slice(1);
        return r === "again" ? [...rest, card] : rest;
      });
      setPhase("recall");
      setHintShown(false);
    } catch {
      toast({ title: "Could not save review", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const totalWork = seen + remaining;
  const progressPct = totalWork === 0 ? 0 : (seen / totalWork) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl h-[85dvh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-4 pb-3 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2">
            <DialogTitle className="flex-1 text-base">Review session</DialogTitle>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label="Close review"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          {started && totalWork > 0 && (
            <div className="pt-2 space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{seen} reviewed</span>
                <span>{remaining} remaining</span>
              </div>
              <Progress value={progressPct} className="h-1.5" />
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto slim-scroll p-4 sm:p-6">
          {!started ? (
            loading ? (
              <p className="text-center text-muted-foreground text-sm py-16">
                Loading due ayahs…
              </p>
            ) : !data || data.count === 0 ? (
              <EmptyDue />
            ) : (
              <div className="text-center space-y-4 py-10">
                <Repeat2 className="size-10 text-primary mx-auto" />
                <h2 className="text-xl font-bold">
                  {data.count} ayah{data.count === 1 ? "" : "s"} due for review
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Try to recall each ayah from memory before revealing. Be
                  honest with your rating — the schedule adapts to you.
                </p>
                <Button onClick={start}>
                  <PartyPopper className="size-4" />
                  Start reviewing
                </Button>
              </div>
            )
          ) : !card ? (
            <div className="text-center space-y-4 py-10">
              <CheckCircle2 className="size-12 text-primary mx-auto" />
              <h2 className="text-xl font-bold">All done — mashaAllah!</h2>
              <p className="text-sm text-muted-foreground">
                You reviewed {seen} card{seen === 1 ? "" : "s"} this session
                {tally.again > 0
                  ? `, including ${tally.again} that needed extra repetition`
                  : ""}
                . Come back tomorrow to stay on schedule.
              </p>
            </div>
          ) : (
            <ReviewCardView
              key={`${card.surah}:${card.verse}:${seen}`}
              card={card}
              phase={phase}
              hintShown={hintShown}
              onShowHint={() => setHintShown(true)}
              onReveal={() => setPhase("rate")}
              onRate={rate}
              hints={hints}
              busy={busy}
              reciter={settings.reciter}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewCardView({
  card,
  phase,
  onReveal,
  onRate,
  onShowHint,
  hintShown,
  hints,
  busy,
  reciter,
}: {
  card: DueResponse["due"][number];
  phase: "recall" | "rate";
  onReveal: () => void;
  onRate: (r: ReviewRating) => void;
  onShowHint: () => void;
  hintShown: boolean;
  hints: Record<ReviewRating, string> | null;
  busy: boolean;
  reciter: string;
}) {
  const [, setPlaying] = useState(false);
  const reciterName =
    RECITERS.find((r) => r.id === reciter)?.name ?? "reciter";

  function play() {
    const a = new Audio(
      verseAudioUrl(reciter, card.surah, card.verse)
    );
    setPlaying(true);
    a.onended = () => setPlaying(false);
    a.onerror = () => setPlaying(false);
    void a.play().catch(() => setPlaying(false));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-semibold">
          {card.surah}:{card.verse}
        </Badge>
        {card.progress.status === "learning" ? (
          <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0">
            learning
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">
            memorized
          </Badge>
        )}
        <span className="flex-1" />
        <Button size="sm" variant="ghost" onClick={play}>
          <Volume2 className="size-4" />
          Audio
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Recite this ayah from memory…
      </p>

      {phase === "recall" ? (
        <div className="space-y-4">
          <div
            className="rounded-xl border border-dashed border-border bg-secondary/30 p-8 text-center select-none"
            aria-hidden
          >
            <p className="ayah-text text-2xl" dir="rtl">
              {"✦ ".repeat(Math.max(3, Math.min(12, card.t.split(" ").length)))}
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              {card.t.split(" ").length} words hidden
            </p>
          </div>
          {!hintShown && (
            <div className="text-center">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onShowHint}>
                <Eye className="size-3.5" /> Need a hint? (first words)
              </Button>
            </div>
          )}
          {hintShown && (
            <p className="ayah-text text-center text-xl text-primary" dir="rtl">
              {card.t.split(" ").slice(0, 4).join(" ")} …
            </p>
          )}
          <div className="text-center pt-2">
            <Button size="lg" onClick={onReveal}>
              <Eye className="size-4" />
              Show answer
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="ayah-text text-right text-[1.6rem]" dir="rtl" lang="ar">
            {card.t}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed border-t border-border/60 pt-3">
            {card.tr}
          </p>
          <div className="text-xs text-center text-muted-foreground">
            How well did you recall it? Audio: {reciterName}.
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <RateButton
              label="Forgot"
              hint={hints?.again}
              icon={<Frown className="size-4" />}
              className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
              disabled={busy}
              onClick={() => onRate("again")}
            />
            <RateButton
              label="Hard"
              hint={hints?.hard}
              icon={<Meh className="size-4" />}
              className="hover:bg-amber-500/10 hover:text-amber-700 hover:border-amber-500/40"
              disabled={busy}
              onClick={() => onRate("hard")}
            />
            <RateButton
              label="Good"
              hint={hints?.good}
              icon={<Smile className="size-4" />}
              className="hover:bg-primary/10 hover:text-primary hover:border-primary/40"
              disabled={busy}
              onClick={() => onRate("good")}
            />
            <RateButton
              label="Easy"
              hint={hints?.easy}
              icon={<PartyPopper className="size-4" />}
              className="hover:bg-emerald-500/10 hover:text-emerald-700 hover:border-emerald-500/40"
              disabled={busy}
              onClick={() => onRate("easy")}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function RateButton({
  label,
  hint,
  icon,
  className,
  disabled,
  onClick,
}: {
  label: string;
  hint?: string;
  icon: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className={cn("h-auto flex-col gap-0.5 py-2.5", className)}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </Button>
  );
}

function EmptyDue() {
  return (
    <div className="text-center space-y-3 py-14">
      <CheckCircle2 className="size-12 text-primary mx-auto" />
      <h2 className="text-lg font-bold">Nothing due right now</h2>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        You&apos;re fully caught up. Memorize new ayahs or come back tomorrow
        — consistency is the secret of hifz.
      </p>
    </div>
  );
}
