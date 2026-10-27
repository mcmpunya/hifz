"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Circle, Play, Sparkles, StopCircle, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMushafStore } from "@/lib/store";
import { toArabicDigits } from "@/lib/arabic";
import { verseAudioUrl, type SurahDetailResponse } from "@/lib/types";
import { useApi } from "./use-api";
import { MemorizeSession } from "./memorize-session";
import { cn } from "@/lib/utils";

const PAGE = 30;

export function SurahView({ num }: { num: number }) {
  const { data, loading, error, refetch } = useApi<SurahDetailResponse>(
    `/api/surah/${num}`
  );
  const { backFromSurah, settings, setLastMemorizeSurah } = useMushafStore();
  const { toast } = useToast();
  const [visible, setVisible] = useState(PAGE);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [rangeFrom, setRangeFrom] = useState<string>("1");
  const [rangeTo, setRangeTo] = useState<string>("3");
  const [playingVerse, setPlayingVerse] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const surah = data?.surah;
  const verses = data?.verses ?? [];

  const defaultFrom = useMemo(() => {
    const first = verses.find((v) => !v.progress || v.progress.status !== "memorized");
    return first ? first.v : 1;
  }, [verses]);

  const firstUnmemorized = useMemo(() => {
    const found = verses.find((v) => v.progress?.status !== "memorized");
    return found?.v ?? verses.length;
  }, [verses]);

  function playVerse(verse: number) {
    if (playingVerse === verse) {
      audioRef.current?.pause();
      setPlayingVerse(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const a = new Audio(verseAudioUrl(settings.reciter, num, verse));
    audioRef.current = a;
    a.addEventListener("ended", () => setPlayingVerse(null));
    a.addEventListener("error", () => {
      setPlayingVerse(null);
      toast({
        title: "Audio unavailable",
        description: "Could not load recitation. Check your connection.",
      });
    });
    setPlayingVerse(verse);
    void a.play().catch(() => setPlayingVerse(null));
  }

  async function toggleMemorized(verse: number, memorized: boolean) {
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        surah: num,
        verse,
        action: memorized ? "memorized" : "reset",
      }),
    });
    if (res.ok) {
      if (memorized) setLastMemorizeSurah(num);
      void refetch();
      toast({
        title: memorized ? "Ayah memorized ✓" : "Progress reset",
        description: memorized
          ? `Surah ${num}:${verse} added to your review schedule.`
          : `Surah ${num}:${verse} cleared.`,
      });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
      <Button
        variant="ghost"
        size="sm"
        onClick={backFromSurah}
        className="-ml-2 text-muted-foreground"
      >
        <ArrowRight className="size-4" /> All surahs
      </Button>

      {/* Surah header */}
      <Card className="overflow-hidden p-0">
        <div className="pattern-hero text-primary-foreground px-6 py-7 text-center relative">
          <div className="relative z-10 space-y-1.5">
            <p className="text-xs uppercase tracking-widest text-primary-foreground/70">
              Surah {num} · {surah?.type}
              {surah?.page ? ` · Page ${surah.page}` : ""}
            </p>
            <h1 className="font-arabic text-4xl leading-snug">
              {surah ? `سورة ${surah.name}` : "…"}
            </h1>
            <p className="text-sm text-primary-foreground/90">
              {surah?.tname} — {surah?.ename} · {surah?.ayahs} ayahs
            </p>
          </div>
        </div>

        {data?.bismillah && (
          <div className="border-b border-border bg-card px-6 py-4 text-center">
            <p className="font-quran text-xl sm:text-2xl" dir="rtl">
              {data.bismillah.t}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {data.bismillah.tr}
            </p>
          </div>
        )}

        {/* Memorize launcher */}
        <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-secondary/30">
          <div className="flex items-center gap-2 flex-1">
            <Badge variant="secondary" className="shrink-0 gap-1">
              <Sparkles className="size-3" /> Memorize
            </Badge>
            <Select value={rangeFrom} onValueChange={(v) => {
              setRangeFrom(v);
              if (Number(v) > Number(rangeTo)) setRangeTo(v);
            }}>
              <SelectTrigger size="sm" className="flex-1 min-w-24" aria-label="From ayah">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {verses.map((v) => (
                  <SelectItem key={v.v} value={String(v.v)}>
                    Ayah {v.v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground shrink-0">to</span>
            <Select value={rangeTo} onValueChange={setRangeTo}>
              <SelectTrigger size="sm" className="flex-1 min-w-24" aria-label="To ayah">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {verses
                  .filter((v) => v.v >= Number(rangeFrom))
                  .map((v) => (
                    <SelectItem key={v.v} value={String(v.v)}>
                      Ayah {v.v}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => {
              setLastMemorizeSurah(num);
              setSessionOpen(true);
            }}
          >
            <Play className="size-4" />
            Start session
          </Button>
        </CardContent>
      </Card>

      {/* Verses */}
      {loading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="h-6 w-3/4 bg-muted rounded animate-pulse mb-3" />
              <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-muted-foreground">
          {error} —{" "}
          <button className="underline text-primary" onClick={() => void refetch()}>
            retry
          </button>
        </Card>
      ) : (
        <div className="space-y-3">
          {verses.slice(0, visible).map((v) => {
            const isMemorized = v.progress?.status === "memorized";
            const isLearning = v.progress?.status === "learning";
            const isPlaying = playingVerse === v.v;
            return (
              <Card
                key={v.v}
                id={`ayah-${v.v}`}
                className={cn(
                  "p-5 gap-3 group",
                  isMemorized && "border-primary/30 bg-primary/[0.035]"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="medallion size-7 border border-amber-600/40 text-[11px] font-bold text-primary bg-secondary">
                    <span>{v.v}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {num}:{v.v} · {toArabicDigits(v.v)}
                  </span>
                  {isMemorized && (
                    <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">
                      memorized
                    </Badge>
                  )}
                  {isLearning && (
                    <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0">
                      learning
                    </Badge>
                  )}
                  <span className="flex-1" />
                  <span className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      aria-label={`Play ayah ${v.v}`}
                      onClick={() => playVerse(v.v)}
                    >
                      {isPlaying ? (
                        <StopCircle className="size-4 text-primary" />
                      ) : (
                        <Volume2 className="size-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      aria-label={isMemorized ? `Reset ayah ${v.v}` : `Mark ayah ${v.v} memorized`}
                      onClick={() => void toggleMemorized(v.v, !isMemorized)}
                    >
                      {isMemorized ? (
                        <CheckCircle2 className="size-4 text-primary" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground" />
                      )}
                    </Button>
                  </span>
                </div>
                <p className="ayah-text text-right text-[1.55rem] sm:text-[1.75rem]" dir="rtl" lang="ar">
                  {v.t}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed border-t border-border/60 pt-3">
                  {v.tr}
                </p>
              </Card>
            );
          })}

          {verses.length > visible && (
            <div className="text-center">
              <Button variant="outline" onClick={() => setVisible((x) => x + PAGE)}>
                Load {Math.min(PAGE, verses.length - visible)} more ayahs
              </Button>
            </div>
          )}
        </div>
      )}

      {sessionOpen && surah && (
        <MemorizeSession
          open={sessionOpen}
          onOpenChange={setSessionOpen}
          surah={num}
          initialFrom={Number(rangeFrom) || firstUnmemorized}
          initialTo={Number(rangeTo) || Math.min((Number(rangeFrom) || 1) + 2, surah.ayahs)}
        />
      )}
    </div>
  );
}
