"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Brain, CheckCircle2, Flame, Repeat2, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useMushafStore } from "@/lib/store";
import type { StatsResponse, SurahsResponse } from "@/lib/types";
import { useApi } from "./use-api";

export function ProgressView() {
  const { data: stats, loading } = useApi<StatsResponse>("/api/stats");
  const { data: surahsData } = useApi<SurahsResponse>("/api/surahs");
  const { openSurah } = useMushafStore();

  const chartData =
    stats?.activity.map((a) => ({
      date: a.date.slice(5), // MM-DD
      memorized: a.versesMemorized,
      reviewed: a.versesReviewed,
    })) ?? [];

  const percent = stats
    ? Math.round((stats.memorized / stats.totalVerses) * 10000) / 100
    : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your progress</h1>
        <p className="text-sm text-muted-foreground">
          Every ayah memorized is a light in your heart — track the journey.
        </p>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ProgressStat
          icon={<Trophy className="size-4 text-amber-600" />}
          label="Mastered"
          value={stats?.mastered}
          sub="long-interval ayahs"
          loading={loading}
        />
        <ProgressStat
          icon={<CheckCircle2 className="size-4 text-primary" />}
          label="Memorized"
          value={stats?.memorized}
          sub={`${percent}% of Quran`}
          loading={loading}
        />
        <ProgressStat
          icon={<Brain className="size-4 text-amber-600" />}
          label="In learning"
          value={stats?.learning}
          sub="in the 3-day cycle"
          loading={loading}
        />
        <ProgressStat
          icon={<Flame className="size-4 text-amber-600" />}
          label="Streak"
          value={stats ? stats.streak : undefined}
          sub="consecutive days"
          loading={loading}
        />
      </div>

      {/* activity chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Repeat2 className="size-4 text-primary" />
            Last 30 days
          </CardTitle>
          <CardDescription>
            Ayahs memorized (green) and review cards completed (amber)
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          {stats ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  interval={4}
                  stroke="var(--muted-foreground)"
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickLine={false} allowDecimals={false} />
                <ReTooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="memorized" name="memorized" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="reviewed" name="reviewed" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="h-full w-full" />
          )}
        </CardContent>
      </Card>

      {/* per-surah list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Surah breakdown</CardTitle>
          <CardDescription>
            Tap a surah to open it and continue memorizing.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[420px] overflow-y-auto slim-scroll divide-y divide-border/60">
            {surahsData?.surahs.map((s) => {
              const memoPct = (s.memorized / s.ayahs) * 100;
              const learnPct = (s.learning / s.ayahs) * 100;
              return (
                <button
                  key={s.n}
                  onClick={() => openSurah(s.n)}
                  className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-xs font-semibold text-muted-foreground w-8 shrink-0 text-right">
                    {s.n}
                  </span>
                  <span className="font-arabic text-lg w-24 shrink-0 truncate" dir="rtl">
                    {s.name}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex text-[10px] text-muted-foreground justify-between mb-1">
                      <span className="truncate">{s.tname}</span>
                      <span className="shrink-0">
                        {s.memorized + s.learning > 0
                          ? `${s.memorized + s.learning}/${s.ayahs}`
                          : ""}
                      </span>
                    </span>
                    <span className="relative block h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                      <span
                        className="absolute inset-y-0 left-0 bg-primary rounded-full"
                        style={{ width: `${memoPct}%` }}
                      />
                      <span
                        className="absolute inset-y-0 left-0 bg-amber-500/60"
                        style={{
                          width: `${memoPct + learnPct}%`,
                          clipPath: `inset(0 0 0 ${memoPct}%)`,
                        }}
                      />
                    </span>
                  </span>
                  {s.due > 0 && (
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 shrink-0">
                      {s.due} due
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressStat({
  icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  sub: string;
  loading?: boolean;
}) {
  return (
    <Card className="p-4 gap-1">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </span>
      {loading || value === undefined ? (
        <Skeleton className="h-8 w-14" />
      ) : (
        <span className="text-2xl font-bold leading-none">{value.toLocaleString()}</span>
      )}
      <span className="text-xs text-muted-foreground">{sub}</span>
    </Card>
  );
}
