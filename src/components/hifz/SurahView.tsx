"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Brain,
  Check,
  GraduationCap,
  Loader2,
  MoreHorizontal,
  Play,
  RotateCcw,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-hifz-settings";
import { useVerseAudio } from "@/hooks/use-verse-audio";
import { BISMILLAH, audioUrl, type SurahDetail, type VerseProgressInfo } from "@/lib/quran-client";
import type { View } from "@/app/page";

function StatusDot({ p }: { p: VerseProgressInfo }) {
  if (p.status === "memorized")
    return <span className="inline-block size-2 rounded-full bg-primary" title={`Memorized · review in ${p.intervalDays}d`} />;
  if (p.status === "learning")
    return <span className="inline-block size-2 rounded-full bg-amber-500" title="Learning" />;
  return null;
}

export default function SurahView({ surah: surahNum, go }: { surah: number; go: (v: View) => void }) {
  const [data, setData] = useState<SurahDetail | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("1");
  const { settings } = useSettings();
  const audio = useVerseAudio();
  const { toast } = useToast();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/surah/${surahNum}`)
      .then((r) => r.json())
      .then((d: SurahDetail) => {
        setData(d);
        if (d.verses?.length) {
          setFrom("1");
          setTo(String(Math.min(d.verses.length, 5)));
        }
      })
      .catch(() => {});
  }, [surahNum]);

  const surah = data?.surah;
  const verses = data?.verses ?? [];
  const memorized = verses.filter((v) => v.progress.status === "memorized").length;
  const pct = verses.length ? Math.round((memorized / verses.length) * 100) : 0;

  const mark = async (verse: number, action: "markLearning" | "markMemorized" | "reset") => {
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surah: surahNum, verse, action }),
    });
    if (res.ok) {
      setData((d) =>
        d
          ? {
              ...d,
              verses: d.verses.map((v) =>
                v.n === verse
                  ? {
                      ...v,
                      progress: {
                        ...v.progress,
                        status: action === "reset" ? "none" : action === "markMemorized" ? "memorized" : "learning",
                      },
                    }
                  : v
              ),
            }
          : d
      );
      if (action === "markMemorized")
        toast({ title: `Verse ${surahNum}:${verse} marked memorized`, description: "Scheduled for review tomorrow." });
      else if (action === "markLearning")
        toast({ title: `Verse ${surahNum}:${verse} marked as learning` });
      else toast({ title: `Progress reset for ${surahNum}:${verse}` });
    }
  };

  const playVerse = (verse: number) => {
    if (audio.playing) {
      audio.stop();
      return;
    }
    audio.play({ url: audioUrl(settings.reciter, surahNum, verse), repeats: 1, delay: 0 });
  };

  const startMemorize = () => {
    const f = Math.min(parseInt(from, 10), parseInt(to, 10));
    const t = Math.max(parseInt(from, 10), parseInt(to, 10));
    window.localStorage.setItem("hifz:lastSurah", String(surahNum));
    go({ name: "memorize", surah: surahNum, from: f, to: t });
  };

  if (!data || !surah) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-5" ref={listRef}>
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => go({ name: "browse" })}>
        <ArrowLeft className="size-4" aria-hidden /> All surahs
      </Button>

      {/* Surah header */}
      <Card className="overflow-hidden shadow-sm">
        <div className="pattern-hero text-primary-foreground p-6 text-center relative">
          <p className="text-xs uppercase tracking-widest text-amber-200/90 font-semibold">
            Surah {surah.n} · {surah.type} · revealed {surah.order}
            <sup>th</sup>
          </p>
          <h1 className="font-arabic text-4xl mt-2 leading-snug" dir="rtl">
            {surah.name}
          </h1>
          <p className="mt-1 font-semibold text-amber-100">
            {surah.tname} — {surah.ename}
          </p>
          <p className="text-xs text-white/70 mt-1">{surah.ayas} verses</p>
        </div>
        <div className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-3 flex-1 w-full">
            <Progress value={pct} className="h-2 flex-1" />
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              {memorized}/{surah.ayas} memorized
            </span>
          </div>
          <Button className="w-full sm:w-auto font-semibold" onClick={() => setRangeOpen(true)}>
            <Brain className="size-4" aria-hidden /> Memorize
          </Button>
        </div>
      </Card>

      {/* Bismillah */}
      {surah.n !== 1 && surah.n !== 9 && (
        <p className="font-quran text-center text-2xl text-primary py-2" dir="rtl">
          {BISMILLAH}
        </p>
      )}

      {/* Verses */}
      <div className="space-y-3">
        {verses.map((v) => {
          const isCurrent = audio.playing && audio.url === audioUrl(settings.reciter, surah.n, v.n);
          return (
            <Card key={v.n} className={`p-4 shadow-sm transition-shadow ${isCurrent ? "ring-2 ring-amber-400/70" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 pt-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-primary hover:bg-primary/10"
                    onClick={() => playVerse(v.n)}
                    aria-label={isCurrent ? "Stop audio" : `Play verse ${v.n}`}
                  >
                    {isCurrent ? <Square className="size-3.5" /> : <Play className="size-4" />}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" aria-label="Verse actions">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {v.progress.status === "memorized" ? (
                        <DropdownMenuItem onClick={() => mark(v.n, "reset")}>
                          <RotateCcw className="size-4" aria-hidden /> Reset progress
                        </DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={() => mark(v.n, "markMemorized")}>
                            <Check className="size-4" aria-hidden /> Mark memorized
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => mark(v.n, "markLearning")}>
                            <GraduationCap className="size-4" aria-hidden /> Mark learning
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="ayah-text text-[1.65rem] sm:text-3xl text-right" dir="rtl" lang="ar">
                    {v.t}{" "}
                    <span className="inline-flex items-center gap-1 align-middle mx-1">
                      <span className="medallion size-6 bg-secondary border border-amber-500/40 text-primary text-[10px] font-bold">
                        {v.n}
                      </span>
                      <StatusDot p={v.progress} />
                    </span>
                  </p>
                  {settings.showTranslit && (
                    <p className="text-sm italic text-muted-foreground mt-3" lang="la">
                      {v.tl}
                    </p>
                  )}
                  {settings.showTranslation && (
                    <p className="text-sm text-foreground/80 mt-3 leading-relaxed">{v.tr}</p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Range dialog */}
      <Dialog open={rangeOpen} onOpenChange={setRangeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Choose verses to memorize</DialogTitle>
            <DialogDescription>
              Session: {surah.tname} · pick a range, then follow the 3 steps: listen, recall, test.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="from-v">From verse</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger id="from-v">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60 slim-scroll">
                  {verses.map((v) => (
                    <SelectItem key={v.n} value={String(v.n)}>
                      {v.n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to-v">To verse</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger id="to-v">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60 slim-scroll">
                  {verses.map((v) => (
                    <SelectItem key={v.n} value={String(v.n)}>
                      {v.n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {verses.length >= 10 &&
              [5, 10].map((len) => (
                <Button
                  key={len}
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setFrom("1");
                    setTo(String(Math.min(len, verses.length)));
                  }}
                >
                  First {Math.min(len, verses.length)}
                </Button>
              ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setFrom("1");
                setTo(String(verses.length));
              }}
            >
              Whole surah
            </Button>
          </div>
          <DialogFooter>
            <Button
              className="font-semibold"
              onClick={startMemorize}
              disabled={audio.playing}
            >
              {audio.playing ? <Loader2 className="size-4 animate-spin" /> : <Brain className="size-4" aria-hidden />}
              Start session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
