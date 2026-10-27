"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Flame, GraduationCap, RefreshCw, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import type { View } from "@/app/page";
import type { StatsPayload } from "@/lib/quran-client";

const QUICK_SURAHS = [
  { n: 1, label: "Al-Fatiha" },
  { n: 112, label: "Al-Ikhlas" },
  { n: 67, label: "Al-Mulk" },
  { n: 36, label: "Ya-Sin" },
  { n: 55, label: "Ar-Rahman" },
  { n: 18, label: "Al-Kahf" },
];

function ProgressRing({ value, size = 132 }: { value: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, value)));
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Overall progress ${Math.round(value * 100)}%`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-white/20"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="text-amber-300 transition-all duration-700"
      />
    </svg>
  );
}

export default function Dashboard({ go }: { go: (v: View) => void }) {
  const [stats, setStats] = useState<StatsPayload | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const pct = stats ? stats.memorized / stats.totalVerses : 0;
  const lastSurah = useMemo(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("hifz:lastSurah");
    return raw ? parseInt(raw, 10) : null;
  }, []);

  const maxAct = Math.max(1, ...(stats?.activity.slice(-14).map((a) => a.memorized + a.reviewed) ?? [1]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* Hero */}
      <section className="pattern-hero rounded-2xl text-primary-foreground overflow-hidden relative">
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8">
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-amber-200/90">
              <Sparkles className="size-3.5" aria-hidden /> Quran Memorization Companion
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {stats ? (
                <>
                  {stats.memorized.toLocaleString()} of {stats.totalVerses.toLocaleString()} verses
                  <span className="block text-amber-200 text-lg sm:text-xl mt-1 font-bold">
                    {Math.round(pct * 100)}% of the Quran memorized
                  </span>
                </>
              ) : (
                "May Allah make the Quran the spring of your heart"
              )}
            </h1>
            <p className="text-sm text-primary-foreground/80 max-w-md mx-auto sm:mx-0">
              Learn verse by verse with listen &amp; repeat, strengthen recall with progressive word
              hiding, and never forget thanks to spaced reviews.
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
              <Button
                className="bg-amber-400 text-amber-950 hover:bg-amber-300 font-semibold"
                onClick={() => go({ name: "review" })}
              >
                <Zap className="size-4" aria-hidden />
                {stats && stats.dueNow > 0 ? `Review ${stats.dueNow} due` : "Start review"}
              </Button>
              <Button
                variant="outline"
                className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white"
                onClick={() => go({ name: "browse" })}
              >
                <BookOpen className="size-4" aria-hidden />
                Browse surahs
              </Button>
              {lastSurah && (
                <Button
                  variant="outline"
                  className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => go({ name: "surah", surah: lastSurah })}
                >
                  <GraduationCap className="size-4" aria-hidden />
                  Continue: surah {lastSurah}
                </Button>
              )}
            </div>
          </div>
          <div className="relative shrink-0">
            <ProgressRing value={pct} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-white">{Math.round(pct * 100)}%</span>
              <span className="text-[11px] uppercase tracking-wider text-white/70">complete</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Memorized", value: stats?.memorized, icon: Sparkles, tint: "text-primary" },
          { label: "In progress", value: stats?.learning, icon: GraduationCap, tint: "text-amber-600" },
          { label: "Due for review", value: stats?.dueNow, icon: RefreshCw, tint: "text-orange-600" },
          { label: "Day streak", value: stats?.streak, icon: Flame, tint: "text-red-500" },
        ].map((s) => (
          <Card key={s.label} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <span className={`medallion size-10 bg-secondary ${s.tint}`}>
                <s.icon className="size-4.5" aria-hidden />
              </span>
              <div>
                <div className="text-2xl font-extrabold leading-none">
                  {s.value === undefined ? <Skeleton className="h-7 w-10" /> : s.value.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Activity */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 h-28" role="img" aria-label="Activity chart">
              {(stats?.activity.slice(-14) ?? Array.from({ length: 14 }, () => null)).map((a, i) => {
                const total = a ? a.memorized + a.reviewed : 0;
                const h = total === 0 ? 4 : Math.max(8, (total / maxAct) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="w-full flex flex-col justify-end h-24">
                      <div
                        className="w-full rounded-t-md bg-primary/85 group-hover:bg-primary transition-colors relative"
                        style={{ height: `${h}%` }}
                        title={a ? `${a.memorized} memorized · ${a.reviewed} reviewed` : "No activity"}
                      >
                        {a && a.memorized > 0 && total > 0 && (
                          <div
                            className="absolute bottom-0 left-0 right-0 rounded-t-md bg-amber-400/90"
                            style={{ height: `${(a.memorized / total) * 100}%` }}
                          />
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] text-muted-foreground">{a ? a.date.slice(8) : ""}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-amber-400" /> Memorized
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-primary/85" /> Reviewed
              </span>
              <span className="ml-auto">
                Today: {stats?.todayMemorized ?? 0} memorized · {stats?.todayReviewed ?? 0} reviewed
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Quick jumps */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Popular for hifz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {QUICK_SURAHS.map((s) => {
              const sp = stats?.surahProgress.find((x) => x.n === s.n);
              const p = sp ? Math.round((sp.memorized / sp.total) * 100) : 0;
              return (
                <button
                  key={s.n}
                  onClick={() => go({ name: "surah", surah: s.n })}
                  className="w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left hover:bg-secondary transition-colors"
                >
                  <span className="medallion size-7 bg-secondary text-primary text-[11px] font-bold">
                    {s.n}
                  </span>
                  <span className="font-medium text-sm">{s.label}</span>
                  <span className="ml-auto flex items-center gap-2 w-24">
                    <Progress value={p} className="h-1.5 flex-1" />
                    <span className="text-[10px] text-muted-foreground w-8 text-right">{p}%</span>
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
