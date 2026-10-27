"use client";

import {
  BookOpenCheck,
  Brain,
  CheckCircle2,
  Flame,
  Play,
  Quote,
  Repeat2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useMushafStore } from "@/lib/store";
import type { StatsResponse, SurahsResponse } from "@/lib/types";
import { useApi } from "./use-api";
import { MemorizeSession } from "./memorize-session";
import { ReviewSession } from "./review-session";
import { useState } from "react";

export function Dashboard() {
  const { data: stats, loading } = useApi<StatsResponse>("/api/stats");
  const { data: surahsData } = useApi<SurahsResponse>("/api/surahs");
  const { openSurah, settings, lastMemorizeSurah } = useMushafStore();
  const [memorizeOpen, setMemorizeOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const percent = stats
    ? Math.round((stats.memorized / stats.totalVerses) * 10000) / 100
    : 0;

  const continueSurah =
    surahsData?.surahs.find(
      (s) => s.n === (lastMemorizeSurah ?? 1)
    ) ?? surahsData?.surahs[0];

  const nextFresh = surahsData?.surahs.find(
    (s) => s.memorized + s.learning < s.ayahs
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Hero */}
      <section className="pattern-hero rounded-2xl text-primary-foreground p-6 sm:p-8 relative overflow-hidden shadow-sm">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1 space-y-2">
            <p className="text-primary-foreground/75 text-sm font-medium">
              As-salamu alaykum
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Keep your heart connected to the Quran
            </h1>
            <p className="text-primary-foreground/85 text-sm max-w-md">
              Learn new ayahs, revisit what you know with spaced repetition,
              and watch your hifz grow day by day.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="secondary"
                className="bg-white/15 hover:bg-white/25 text-primary-foreground border border-white/20"
                onClick={() => setMemorizeOpen(true)}
              >
                <Sparkles className="size-4" />
                Start memorizing
              </Button>
              <Button
                variant="secondary"
                className="bg-white/15 hover:bg-white/25 text-primary-foreground border border-white/20"
                onClick={() => setReviewOpen(true)}
              >
                <Repeat2 className="size-4" />
                Review due ayahs
                {stats && stats.due > 0 ? ` (${stats.due})` : ""}
              </Button>
            </div>
          </div>

          {/* Ring */}
          <div className="flex items-center gap-4 sm:flex-col sm:gap-2 shrink-0">
            <ProgressRing percent={percent} />
            <div className="sm:text-center">
              <p className="text-2xl font-bold leading-none">
                {stats ? stats.memorized.toLocaleString() : "—"}
              </p>
              <p className="text-xs text-primary-foreground/80">
                of {stats ? stats.totalVerses.toLocaleString() : "6,236"} ayahs
                memorized
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Flame className="size-4 text-amber-600" />}
          label="Day streak"
          value={stats ? String(stats.streak) : "—"}
          sub={stats && stats.streak === 0 ? "Start today" : "Keep going"}
          loading={loading}
        />
        <StatCard
          icon={<Repeat2 className="size-4 text-emerald-700" />}
          label="Due today"
          value={stats ? String(stats.due) : "—"}
          sub="ayahs to review"
          loading={loading}
          action={
            stats && stats.due > 0 ? (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={() => setReviewOpen(true)}>
                Review
              </Button>
            ) : undefined
          }
        />
        <StatCard
          icon={<Brain className="size-4 text-amber-600" />}
          label="In learning"
          value={stats ? String(stats.learning) : "—"}
          sub="ayahs in progress"
          loading={loading}
        />
        <StatCard
          icon={<CheckCircle2 className="size-4 text-emerald-700" />}
          label="Memorized"
          value={stats ? String(stats.memorized) : "—"}
          sub={`${percent}% of the Quran`}
          loading={loading}
        />
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Daily goals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              Today&apos;s goal
            </CardTitle>
            <CardDescription>
              Small consistent steps — even one ayah a day compounds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoalRow
              label="New ayahs memorized"
              value={stats?.today.versesMemorized ?? 0}
              goal={settings.dailyGoalMemorize}
            />
            <GoalRow
              label="Ayahs reviewed"
              value={stats?.today.versesReviewed ?? 0}
              goal={settings.dailyGoalReview}
            />
          </CardContent>
        </Card>

        {/* Continue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpenCheck className="size-4 text-primary" />
              Continue memorizing
            </CardTitle>
            <CardDescription>Pick up where you left off.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {continueSurah ? (
              <button
                className="w-full flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3 text-left hover:bg-secondary/70 transition-colors"
                onClick={() => openSurah(continueSurah.n)}
              >
                <span className="medallion size-10 border-2 border-amber-600/50 text-primary">
                  <span className="text-sm font-bold">{continueSurah.n}</span>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold truncate">
                    {continueSurah.tname} ·{" "}
                    <span className="font-arabic text-lg">{continueSurah.name}</span>
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Surah {continueSurah.n} · {continueSurah.ayahs} ayahs ·{" "}
                    {continueSurah.memorized} memorized
                  </span>
                </span>
                <Play className="size-4 text-primary shrink-0" />
              </button>
            ) : (
              <Skeleton className="h-16 w-full" />
            )}
            {nextFresh && nextFresh.n !== continueSurah?.n && (
              <button
                className="w-full flex items-center gap-3 rounded-xl border border-dashed border-border p-3 text-left hover:bg-secondary/40 transition-colors"
                onClick={() => openSurah(nextFresh.n)}
              >
                <span className="medallion size-10 border-2 border-border text-muted-foreground">
                  <span className="text-sm font-bold">{nextFresh.n}</span>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold truncate">
                    Start something new: {nextFresh.tname}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {nextFresh.ename}
                  </span>
                </span>
                <Sparkles className="size-4 text-muted-foreground shrink-0" />
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Motivation */}
      <Card className="border-dashed">
        <CardContent className="pt-6 flex items-start gap-3">
          <Quote className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">
              «خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              “The best among you are those who learn the Quran and teach it.”
              <span className="ml-2 text-xs">— Sahih al-Bukhari 5027</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {memorizeOpen && (
        <MemorizeSession
          open={memorizeOpen}
          onOpenChange={setMemorizeOpen}
          surah={continueSurah?.n ?? 1}
        />
      )}
      <ReviewSession open={reviewOpen} onOpenChange={setReviewOpen} />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  loading,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <Card className="p-4 gap-1">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {icon}
          {label}
        </span>
        {action}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <span className="text-2xl font-bold leading-none">{value}</span>
      )}
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </Card>
  );
}

function GoalRow({
  label,
  value,
  goal,
}: {
  label: string;
  value: number;
  goal: number;
}) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  const done = value >= goal;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={done ? "font-semibold text-primary" : "font-medium"}>
          {value} / {goal}
          {done ? " ✓" : ""}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg width="92" height="92" viewBox="0 0 92 92" className="shrink-0">
      <circle
        cx="46"
        cy="46"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        className="text-white/20"
      />
      <circle
        cx="46"
        cy="46"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * Math.min(100, percent)) / 100}
        transform="rotate(-90 46 46)"
        className="text-amber-300 transition-all duration-700"
      />
      <text
        x="46"
        y="51"
        textAnchor="middle"
        className="fill-current text-[15px] font-bold"
      >
        {percent}%
      </text>
    </svg>
  );
}
