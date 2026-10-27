"use client";

import { useCallback, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useMushafStore } from "@/lib/store";
import { splitWords } from "@/lib/arabic";
import {
  verseAudioUrl,
  type SurahDetailResponse,
} from "@/lib/types";
import { useApi, sleep } from "./use-api";
import { cn } from "@/lib/utils";

const HIDE_STEPS = [0, 0.25, 0.5, 0.75, 1];
const NO_REVEALS: Set<number> = new Set();

/** Which word indices are hidden at a given level (evenly distributed) */
function hiddenMask(len: number, level: number): boolean[] {
  if (level === 0) return Array(len).fill(false);
  if (level === 1) return Array(len).fill(true);
  if (level === 0.25) return Array.from({ length: len }, (_, i) => i % 4 === 3);
  if (level === 0.5) return Array.from({ length: len }, (_, i) => i % 2 === 1);
  return Array.from({ length: len }, (_, i) => i % 4 !== 0); // 0.75
}

interface MemorizeSessionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surah: number;
  initialFrom?: number;
  initialTo?: number;
}

export function MemorizeSession({
  open,
  onOpenChange,
  surah,
  initialFrom,
  initialTo,
}: MemorizeSessionProps) {
  const { data } = useApi<SurahDetailResponse>(
    open ? `/api/surah/${surah}` : null
  );
  const { settings, bumpRefresh, setLastMemorizeSurah } = useMushafStore();
  const { toast } = useToast();

  const [from, setFrom] = useState(initialFrom ?? 1);
  const [to, setTo] = useState(
    initialTo ?? (initialFrom ? initialFrom + 2 : 3)
  );
  const [current, setCurrent] = useState(initialFrom ?? 1);
  const [hideLevel, setHideLevel] = useState(0);
  // revealed words keyed by "verse:level" so changing verse/level re-hides everything
  const [revealedMap, setRevealedMap] = useState<Record<string, Set<number>>>({});
  const [repeatCount, setRepeatCount] = useState("3");
  const [repeatDelay, setRepeatDelay] = useState("2");
  const [autoNext, setAutoNext] = useState(true);
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playToken = useRef(0);

  const ayahs = data?.verses ?? [];
  const surahMeta = data?.surah;
  const verse = ayahs.find((v) => v.v === current) ?? ayahs[0];

  const stopAudio = useCallback(() => {
    playToken.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      playToken.current += 1;
      audioRef.current?.pause();
    };
  }, []);

  const words = verse ? splitWords(verse.t) : [];
  const mask = hiddenMask(words.length, hideLevel);
  const revealKey = `${current}:${hideLevel}`;
  const revealed = revealedMap[revealKey] ?? NO_REVEALS;

  const playLoop = useCallback(async () => {
    stopAudio();
    const token = ++playToken.current;
    setPlaying(true);
    const repeats = Math.max(1, Number(repeatCount) || 1);
    const delay = Number(repeatDelay) || 0;

    for (let rep = 0; rep < repeats; rep++) {
      if (token !== playToken.current) return;
      await playAudioOnce(
        verseAudioUrl(settings.reciter, surah, current),
        audioRef
      );
      if (token !== playToken.current) return;
      if (rep < repeats - 1 && delay > 0) {
        await sleep(delay * 1000);
        if (token !== playToken.current) return;
      }
    }
    setPlaying(false);

    if (autoNext && current < to) {
      setCurrent((c) => Math.min(to, c + 1));
    }
  }, [stopAudio, repeatCount, repeatDelay, autoNext, current, to, surah, settings.reciter]);

  function markMemorized() {
    const res = fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surah, verse: current, action: "memorized" }),
    }).then(async (r) => {
      if (r.ok) {
        setLastMemorizeSurah(surah);
        bumpRefresh();
        toast({
          title: "Ayah memorized ✓",
          description: `${surahMeta?.ename ?? "Surah"} ${surah}:${current} — scheduled for review in 7 days.`,
        });
        if (current < to) {
          stopAudio();
          setCurrent(current + 1);
        }
      }
    });
    void res;
  }

  function toggleReveal(idx: number) {
    setRevealedMap((prev) => {
      const set = new Set(prev[revealKey] ?? []);
      if (set.has(idx)) set.delete(idx);
      else set.add(idx);
      return { ...prev, [revealKey]: set };
    });
  }

  const totalInRange = Math.max(1, to - from + 1);
  const positionInRange = current - from + 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) stopAudio();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl lg:max-w-3xl h-[92dvh] sm:h-[88vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-4 pb-3 border-b border-border/60 shrink-0 space-y-0">
          <div className="flex items-center gap-2">
            <DialogTitle className="flex-1 text-base sm:text-lg truncate">
              Memorizing{" "}
              <span className="font-arabic text-xl">{surahMeta?.name}</span>{" "}
              <span className="text-muted-foreground font-normal text-sm">
                {surah}:{from}–{to}
              </span>
            </DialogTitle>
            <Badge variant="secondary" className="shrink-0">
              {positionInRange} / {totalInRange}
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label="Close session"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          {/* range editor */}
          <div className="flex items-center gap-2 pt-2 text-sm">
            <span className="text-xs text-muted-foreground">Range</span>
            <Select
              value={String(from)}
              onValueChange={(v) => {
                const n = Number(v);
                setFrom(n);
                if (n > to) setTo(Math.min(n + 2, surahMeta?.ayahs ?? n));
                if (current < n) setCurrent(n);
              }}
            >
              <SelectTrigger size="sm" className="w-24" aria-label="From ayah">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {ayahs.map((v) => (
                  <SelectItem key={v.v} value={String(v.v)}>
                    {v.v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">to</span>
            <Select
              value={String(to)}
              onValueChange={(v) => {
                setTo(Number(v));
              }}
            >
              <SelectTrigger size="sm" className="w-24" aria-label="To ayah">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {ayahs
                  .filter((v) => v.v >= from)
                  .map((v) => (
                    <SelectItem key={v.v} value={String(v.v)}>
                      {v.v}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        {/* Verse display */}
        <div className="flex-1 overflow-y-auto slim-scroll p-4 sm:p-6">
          {verse ? (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-semibold">
                  Ayah {verse.v}
                </Badge>
                {verse.progress?.status === "memorized" && (
                  <Badge
                    className="text-[10px] bg-primary/10 text-primary border-0"
                    variant="secondary"
                  >
                    memorized
                  </Badge>
                )}
              </div>

              <p
                className="ayah-text text-right text-[1.8rem] sm:text-[2.2rem] leading-[2.4]"
                dir="rtl"
                lang="ar"
              >
                {words.map((w, i) => {
                  const isHidden = mask[i] && !revealed.has(i);
                  return (
                    <span
                      key={i}
                      role={isHidden ? "button" : undefined}
                      tabIndex={isHidden ? 0 : undefined}
                      aria-label={isHidden ? "Tap to reveal word" : undefined}
                      className={cn("ayah-word", isHidden && "is-hidden")}
                      onClick={() => isHidden && toggleReveal(i)}
                      onKeyDown={(e) => {
                        if (isHidden && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          toggleReveal(i);
                        }
                      }}
                    >
                      {w}
                    </span>
                  );
                })}
              </p>

              {settings.showTranslationWhileMemorizing && (
                <p className="text-sm text-muted-foreground leading-relaxed border-t border-border/60 pt-4">
                  {verse.tr}
                </p>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Eye className="size-3.5" />
                Tap covered words to peek · move the slider to test yourself
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Loading ayah…
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="shrink-0 border-t border-border/60 bg-card/60 p-3 sm:p-4 space-y-3">
          {/* hiding slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20 shrink-0">
              Cover
            </span>
            <Slider
              value={[HIDE_STEPS.indexOf(hideLevel)]}
              min={0}
              max={4}
              step={1}
              onValueChange={([v]) => setHideLevel(HIDE_STEPS[v] ?? 0)}
              aria-label="Word covering level"
            />
            <span className="text-xs font-semibold w-10 text-right">
              {Math.round(hideLevel * 100)}%
            </span>
          </div>

          {/* audio row */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={playing ? "secondary" : "default"}
              onClick={() => (playing ? stopAudio() : void playLoop())}
              className="min-w-24"
            >
              <Volume2 className="size-4" />
              {playing ? "Stop" : "Play & loop"}
            </Button>

            <Select value={repeatCount} onValueChange={setRepeatCount}>
              <SelectTrigger size="sm" className="w-28" aria-label="Repeat count">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5, 7, 10].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    ×{n} repeats
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={repeatDelay} onValueChange={setRepeatDelay}>
              <SelectTrigger size="sm" className="w-24" aria-label="Delay between repeats">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}s pause
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5 ml-auto">
              <Switch
                id="auto-next"
                checked={autoNext}
                onCheckedChange={setAutoNext}
              />
              <Label
                htmlFor="auto-next"
                className="text-xs text-muted-foreground"
              >
                Auto-next
              </Label>
            </div>
          </div>

          {/* nav row */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={current <= from}
              onClick={() => {
                stopAudio();
                setCurrent((c) => Math.max(from, c - 1));
              }}
            >
              <ChevronRight className="size-4" />
              Prev
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setRevealedMap((prev) => ({ ...prev, [revealKey]: new Set() }))
                  }
                  aria-label="Re-hide all words"
                >
                  <RotateCcw className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Re-hide all words</TooltipContent>
            </Tooltip>
            <span className="flex-1" />
            <Button size="sm" variant="secondary" onClick={markMemorized}>
              <CheckCircle2 className="size-4 text-primary" />
              Got it ✓
            </Button>
            <Button
              size="sm"
              disabled={current >= to}
              onClick={() => {
                stopAudio();
                setCurrent((c) => Math.min(to, c + 1));
              }}
            >
              Next
              <ChevronLeft className="size-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function playAudioOnce(
  url: string,
  ref: React.RefObject<HTMLAudioElement | null>
) {
  return new Promise<void>((resolve) => {
    let audio = ref.current;
    if (!audio) {
      audio = new Audio();
      ref.current = audio;
    }
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      audio?.removeEventListener("ended", done);
      audio?.removeEventListener("error", done);
      resolve();
    };
    audio.addEventListener("ended", done);
    audio.addEventListener("error", done);
    audio.src = url;
    audio.currentTime = 0;
    void audio.play().catch(done);
  });
}
