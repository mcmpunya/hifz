"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Eye,
  EyeOff,
  Headphones,
  Pause,
  Play,
  RotateCcw,
  Square,
  Trophy,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-hifz-settings";
import { useVerseAudio } from "@/hooks/use-verse-audio";
import { BISMILLAH, audioUrl, type VerseData } from "@/lib/quran-client";
import type { View } from "@/app/page";

type Phase = "listen" | "recall" | "test";
type HideMode = "none" | "p25" | "p50" | "p75" | "all" | "first";

const HIDE_STAGES: { key: HideMode; label: string }[] = [
  { key: "none", label: "Full text" },
  { key: "p25", label: "25% hidden" },
  { key: "p50", label: "50% hidden" },
  { key: "p75", label: "75% hidden" },
  { key: "all", label: "All hidden" },
  { key: "first", label: "First letters" },
];

interface Question {
  verseIdx: number;
  wordIdx: number;
  answer: string;
  options: string[];
}

function wordsOf(v: VerseData): string[] {
  return v.t.split(/\s+/).filter(Boolean);
}

function hiddenFraction(mode: HideMode): number {
  switch (mode) {
    case "p25":
      return 0.25;
    case "p50":
      return 0.5;
    case "p75":
      return 0.75;
    case "all":
    case "first":
      return 1;
    default:
      return 0;
  }
}

function isWordHidden(i: number, words: number, mode: HideMode): boolean {
  const f = hiddenFraction(mode);
  if (f === 0) return false;
  if (f === 1) return true;
  // evenly-spaced pattern with a per-verse offset for variety
  const step = Math.round(1 / f); // 4 or 2
  const k = Math.max(1, Math.round(step * f)); // words hidden per period
  return (i + step) % step < k;
}

function AyahWords({
  verse,
  mode,
  revealed,
  onReveal,
}: {
  verse: VerseData;
  mode: HideMode;
  revealed: Set<number>;
  onReveal: (i: number) => void;
}) {
  const words = useMemo(() => wordsOf(verse), [verse]);
  return (
    <p className="ayah-text text-[1.7rem] sm:text-3xl text-right" dir="rtl" lang="ar">
      {words.map((w, i) => {
        const hidden = isWordHidden(i, words.length, mode) && !revealed.has(i);
        const display = hidden ? (mode === "first" ? w.charAt(0) : w) : w;
        return (
          <span
            key={i}
            className={cn("ayah-word", hidden && "is-hidden")}
            onClick={hidden ? () => onReveal(i) : undefined}
            role={hidden ? "button" : undefined}
            tabIndex={hidden ? 0 : undefined}
            aria-label={hidden ? "Hidden word — tap to reveal" : undefined}
            onKeyDown={hidden ? (e) => e.key === "Enter" && onReveal(i) : undefined}
          >
            {display}
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
      <span className="inline-flex items-center align-middle mx-1">
        <span className="medallion size-6 bg-secondary border border-amber-500/40 text-primary text-[10px] font-bold">
          {verse.n}
        </span>
      </span>
    </p>
  );
}

export default function MemorizeSession({
  surah,
  from,
  to,
  go,
}: {
  surah: number;
  from: number;
  to: number;
  go: (v: View) => void;
}) {
  const [all, setAll] = useState<VerseData[] | null>(null);
  const [surahName, setSurahName] = useState("");
  const [phase, setPhase] = useState<Phase>("listen");
  const [idx, setIdx] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [hideMode, setHideMode] = useState<HideMode>("all");
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const { settings } = useSettings();
  const audio = useVerseAudio();
  const { toast } = useToast();
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/surah/${surah}`)
      .then((r) => r.json())
      .then((d) => {
        setAll((d.verses as VerseData[]).slice(from - 1, to));
        setSurahName(d.surah?.tname ?? "");
      })
      .catch(() => {});
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [surah, from, to]);

  const verses = all ?? [];

  // reset per-verse state when verse changes
  useEffect(() => {
    setRevealed(new Set());
  }, [idx, phase]);

  const listenVerse = useCallback(
    (i: number, auto: boolean) => {
      const v = verses[i];
      if (!v) return;
      audio.play({
        url: audioUrl(settings.reciter, surah, v.n),
        repeats: settings.repeats,
        delay: settings.delay,
        onVerseEnd: auto
          ? () => {
              if (i < verses.length - 1) {
                advanceTimer.current = setTimeout(() => {
                  setIdx(i + 1);
                  listenVerse(i + 1, true);
                }, 900);
              }
            }
          : undefined,
      });
    },
    [verses, audio, settings, surah]
  );

  const stopAudio = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    audio.stop();
  };

  useEffect(() => stopAudio, []); // stop on unmount

  const nextVerse = () => {
    stopAudio();
    setIdx((i) => Math.min(verses.length - 1, i + 1));
  };
  const prevVerse = () => {
    stopAudio();
    setIdx((i) => Math.max(0, i - 1));
  };

  // build quiz when entering test phase
  const buildQuiz = useCallback(() => {
    const pool: string[] = [];
    for (const v of verses) pool.push(...wordsOf(v).map((w) => w.replace(/[^\u0621-\u064A\u0670\u0640]/g, "")).filter(Boolean));
    const qs: Question[] = [];
    for (let vi = 0; vi < verses.length; vi++) {
      const words = wordsOf(verses[vi]);
      const blanks = Math.max(1, Math.min(3, Math.round(words.length / 12)));
      const candidates = Array.from({ length: Math.max(1, words.length - 1) }, (_, k) => k + 1);
      shuffle(candidates);
      const positions = candidates.slice(0, Math.min(blanks, candidates.length));
      for (const pos of positions) {
        const answer = words[pos];
        const distractors = new Set<string>();
        let guard = 0;
        while (distractors.size < 3 && guard++ < 200) {
          const cand = pool[Math.floor(Math.random() * pool.length)];
          if (cand && cand !== answer && !words.includes(cand)) distractors.add(cand);
        }
        while (distractors.size < 3) {
          const cand = pool[Math.floor(Math.random() * pool.length)];
          if (cand && cand !== answer) distractors.add(cand);
        }
        qs.push({ verseIdx: vi, wordIdx: pos, answer, options: shuffle([answer, ...distractors]) });
      }
    }
    setQuestions(qs);
    setQIdx(0);
    setPicked(null);
    setScore(0);
  }, [verses]);

  const currentQ = questions?.[qIdx];
  const currentQVerse = currentQ ? verses[currentQ.verseIdx] : null;

  const answer = (opt: string) => {
    if (picked || !currentQ) return;
    setPicked(opt);
    if (opt === currentQ.answer) setScore((s) => s + 1);
    setTimeout(() => {
      if (qIdx + 1 < (questions?.length ?? 0)) {
        setQIdx((i) => i + 1);
        setPicked(null);
      } else {
        setDone(true);
      }
    }, 700);
  };

  const markAllMemorized = async () => {
    setSaving(true);
    try {
      for (const v of verses) {
        await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ surah, verse: v.n, action: "markMemorized" }),
        });
      }
      window.localStorage.setItem("hifz:lastSurah", String(surah));
      toast({
        title: `MashaAllah! ${verses.length} verses memorized`,
        description: "Reviews scheduled — come back tomorrow to lock them in.",
      });
      go({ name: "surah", surah });
    } finally {
      setSaving(false);
    }
  };

  if (!all) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (verses.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
        Invalid verse range.
        <Button variant="link" onClick={() => go({ name: "surah", surah })}>
          Back to surah
        </Button>
      </div>
    );
  }

  const v = verses[idx];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => { stopAudio(); go({ name: "surah", surah }); }}>
          <ArrowLeft className="size-4" aria-hidden /> {surahName || `Surah ${surah}`}
        </Button>
        <p className="text-xs font-semibold text-muted-foreground">
          Verses {from === to ? from : `${from}–${to}`}
        </p>
      </div>

      {/* Stepper */}
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Session steps">
        {(
          [
            { key: "listen", label: "1 · Listen & repeat", icon: Headphones },
            { key: "recall", label: "2 · Recall", icon: EyeOff },
            { key: "test", label: "3 · Test", icon: ClipboardCheck },
          ] as const
        ).map((s) => (
          <button
            key={s.key}
            role="tab"
            aria-selected={phase === s.key}
            onClick={() => {
              stopAudio();
              setPhase(s.key);
              if (s.key === "test") buildQuiz();
            }}
            className={cn(
              "rounded-lg border px-2 py-2.5 text-xs font-semibold flex flex-col items-center gap-1 transition-colors",
              phase === s.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground hover:bg-secondary"
            )}
          >
            <s.icon className="size-4" aria-hidden />
            {s.label}
          </button>
        ))}
      </div>

      {/* ---------- LISTEN ---------- */}
      {phase === "listen" && (
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">
                Verse {idx + 1} of {verses.length}
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => setAutoAdvance(e.target.checked)}
                  className="accent-[hsl(var(--primary))]"
                />
                Auto-advance
              </label>
            </div>
            <Progress value={((idx + 1) / verses.length) * 100} className="h-1.5" />

            <p className="ayah-text text-[1.8rem] sm:text-4xl text-right min-h-32" dir="rtl" lang="ar">
              {idx === 0 && <span className="block font-quran text-xl text-primary text-center mb-4" dir="rtl">{BISMILLAH}</span>}
              {v.t}
            </p>
            <p className="text-sm text-foreground/75 leading-relaxed">{v.tr}</p>

            {/* Player */}
            <div className="rounded-xl border bg-secondary/40 p-4 flex items-center gap-3">
              <Button
                size="icon"
                className="size-12 rounded-full shrink-0"
                onClick={() => (audio.playing ? stopAudio() : listenVerse(idx, autoAdvance))}
                aria-label={audio.playing ? "Stop" : "Play with repeats"}
              >
                {audio.playing ? <Square className="size-5" /> : <Play className="size-5" />}
              </Button>
              {audio.playing && (
                <Button size="icon" variant="secondary" className="size-9 rounded-full" onClick={audio.pauseToggle} aria-label="Pause">
                  <Pause className="size-4" />
                </Button>
              )}
              <div className="text-sm">
                <p className="font-semibold">
                  {audio.playing
                    ? audio.repeats >= 9999
                      ? "Looping…"
                      : `${audio.repeats} repeat${audio.repeats === 1 ? "" : "s"} left`
                    : `Play × ${settings.repeats >= 99 ? "∞" : settings.repeats} · ${settings.delay}s pause`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Listen, then recite along. Repetition builds memory.
                </p>
              </div>
              <div className="ml-auto flex gap-1">
                <Button variant="outline" size="icon" onClick={prevVerse} disabled={idx === 0} aria-label="Previous verse">
                  <ArrowRight className="size-4 rotate-180" aria-hidden />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={nextVerse}
                  disabled={idx === verses.length - 1}
                  aria-label="Next verse"
                >
                  <ArrowLeft className="size-4 rotate-180" aria-hidden />
                </Button>
              </div>
            </div>

            {idx === verses.length - 1 && (
              <Button
                className="w-full font-semibold"
                onClick={() => {
                  stopAudio();
                  setPhase("recall");
                }}
              >
                Now test your recall <ArrowLeft className="size-4 rotate-180" aria-hidden />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---------- RECALL ---------- */}
      {phase === "recall" && (
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Hiding level">
              {HIDE_STAGES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    setHideMode(s.key);
                    setRevealed(new Set());
                  }}
                  aria-pressed={hideMode === s.key}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    hideMode === s.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="rounded-xl border bg-card p-4 min-h-36">
              <AyahWords
                verse={v}
                mode={hideMode}
                revealed={revealed}
                onReveal={(i) => setRevealed((s) => new Set(s).add(i))}
              />
            </div>
            <p className="text-sm text-foreground/75 leading-relaxed">{v.tr}</p>
            <p className="text-xs text-muted-foreground">
              Tap a hidden word to peek. Recite from memory before revealing.
            </p>

            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" onClick={prevVerse} disabled={idx === 0}>
                <ArrowRight className="size-4 rotate-180" aria-hidden /> Prev
              </Button>
              <span className="text-xs text-muted-foreground font-semibold">
                {idx + 1} / {verses.length}
              </span>
              {idx === verses.length - 1 ? (
                <Button size="sm" className="font-semibold" onClick={() => { stopAudio(); setPhase("test"); buildQuiz(); }}>
                  Take the test <ClipboardCheck className="size-4" aria-hidden />
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={nextVerse}>
                  Next <ArrowLeft className="size-4 rotate-180" aria-hidden />
                </Button>
              )}
            </div>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setRevealed(new Set())}>
              <RotateCcw className="size-3.5" aria-hidden /> Hide revealed words
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ---------- TEST ---------- */}
      {phase === "test" && (
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-5">
            {!questions ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Preparing quiz…</div>
            ) : !done && currentQ && currentQVerse ? (
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold">
                    Question {qIdx + 1} of {questions.length}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-primary">
                    <Check className="size-3.5" aria-hidden /> {score}
                  </span>
                </div>
                <Progress value={(qIdx / questions.length) * 100} className="h-1.5" />

                <p className="ayah-text text-[1.7rem] sm:text-3xl text-right" dir="rtl" lang="ar">
                  {wordsOf(currentQVerse).map((w, i) => {
                    if (i === currentQ.wordIdx) {
                      return (
                        <span
                          key={i}
                          className="ayah-word bg-amber-300/50 border-b-2 border-amber-500 rounded px-1.5 font-bold text-primary/40 select-none"
                          aria-label="missing word"
                        >
                          {"_____"}
                        </span>
                      );
                    }
                    return (
                      <span key={i}>
                        {w}
                        {i < wordsOf(currentQVerse).length - 1 ? " " : ""}
                      </span>
                    );
                  })}
                  <span className="inline-flex items-center align-middle mx-1">
                    <span className="medallion size-6 bg-secondary border border-amber-500/40 text-primary text-[10px] font-bold">
                      {currentQVerse.n}
                    </span>
                  </span>
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  Which word belongs in the highlighted slot? (verse {surah}:{currentQVerse.n})
                </p>

                <div className="grid grid-cols-2 gap-2" dir="rtl">
                  {currentQ.options.map((opt) => {
                    const isAnswer = opt === currentQ.answer;
                    const state = !picked ? "idle" : isAnswer ? "correct" : opt === picked ? "wrong" : "idle";
                    return (
                      <button
                        key={opt}
                        onClick={() => answer(opt)}
                        disabled={!!picked}
                        className={cn(
                          "font-quran text-2xl rounded-xl border px-3 py-3 transition-colors",
                          state === "idle" && "hover:bg-secondary",
                          state === "correct" && "bg-primary text-primary-foreground border-primary",
                          state === "wrong" && "bg-destructive text-white border-destructive"
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              /* test summary */
              <div className="py-6 space-y-4 text-center">
                <Trophy className="size-12 text-amber-500 mx-auto" aria-hidden />
                <p className="text-2xl font-extrabold">
                  {score} / {questions.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  {score === questions.length
                    ? "Perfect! Your memory is solid."
                    : score >= questions.length * 0.7
                      ? "Strong recall — a bit more polish and you're there."
                      : "Keep practicing — go back to Recall for tricky spots."}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                  <Button variant="outline" onClick={() => buildQuiz()}>
                    <RotateCcw className="size-4" aria-hidden /> Retry test
                  </Button>
                  <Button className="font-semibold" onClick={markAllMemorized} disabled={saving}>
                    {saving ? "Saving…" : (
                      <>
                        <Check className="size-4" aria-hidden /> Mark {verses.length} verse{verses.length > 1 ? "s" : ""} memorized
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {!done && questions && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => {
                  stopAudio();
                  setDone(true);
                }}
              >
                <X className="size-3.5" aria-hidden /> End test early
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
