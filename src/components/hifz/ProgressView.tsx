"use client";

import { useEffect, useState } from "react";
import { Flame, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { StatsPayload } from "@/lib/quran-client";

export default function ProgressView() {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { toast } = useToast();

  const load = () => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  };

  useEffect(load, []);

  const resetAll = async () => {
    // reset every tracked verse (deleteMany via looped posts is wasteful; use dedicated call)
    const res = await fetch("/api/progress/reset-all", { method: "POST" });
    if (res.ok) {
      toast({ title: "All progress reset", description: "Fresh start — may your journey be blessed." });
      load();
    }
  };

  const maxAct = Math.max(1, ...(stats?.activity.map((a) => a.memorized + a.reviewed) ?? [1]));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <h1 className="text-xl font-extrabold">Your progress</h1>

      {/* summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Verses memorized", value: stats?.memorized, sub: `of ${stats?.totalVerses ?? "—"}` },
          { label: "In progress", value: stats?.learning, sub: "learning" },
          { label: "Day streak", value: stats?.streak, sub: "days in a row" },
          { label: "Reviewed today", value: stats?.todayReviewed, sub: "reviews" },
        ].map((s) => (
          <Card key={s.label} className="shadow-sm">
            <CardContent className="p-4">
              <div className="text-2xl font-extrabold">
                {s.value === undefined ? <Skeleton className="h-7 w-12" /> : s.value.toLocaleString()}
              </div>
              <p className="text-xs font-medium mt-1">{s.label}</p>
              <p className="text-[11px] text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 30 day activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="size-4 text-amber-500" aria-hidden /> Activity · last 30 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-[3px] h-32" role="img" aria-label="30 day activity chart">
            {(stats?.activity ?? Array.from({ length: 30 }, () => null)).map((a, i) => {
              const total = a ? a.memorized + a.reviewed : 0;
              const h = total === 0 ? 3 : Math.max(6, (total / maxAct) * 100);
              return (
                <div key={i} className="flex-1 group relative">
                  <div
                    className="w-full rounded-t-sm bg-primary/80 group-hover:bg-primary relative overflow-hidden transition-colors"
                    style={{ height: `${h}%` }}
                    title={a ? `${a.date}: ${a.memorized} memorized, ${a.reviewed} reviewed` : ""}
                  >
                    {a && a.memorized > 0 && (
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-amber-400/90"
                        style={{ height: `${(a.memorized / total) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
            <span>{stats?.activity[0]?.date.slice(5) ?? ""}</span>
            <span>Today</span>
          </div>
        </CardContent>
      </Card>

      {/* per surah */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden /> Surah breakdown
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show started only" : "Show all 114"}
          </Button>
        </CardHeader>
        <CardContent className="max-h-96 overflow-y-auto slim-scroll space-y-2.5 pr-2">
          {(stats?.surahProgress ?? [])
            .filter((s) => showAll || s.memorized > 0)
            .map((s) => {
              const pct = Math.round((s.memorized / s.total) * 100);
              return (
                <div key={s.n} className="flex items-center gap-3">
                  <span className="medallion size-7 shrink-0 bg-secondary text-primary text-[10px] font-bold">
                    {s.n}
                  </span>
                  <span className="text-sm font-medium w-36 truncate">{s.tname}</span>
                  <Progress value={pct} className="h-2 flex-1" />
                  <span className="text-[11px] text-muted-foreground w-14 text-right tabular-nums">
                    {s.memorized}/{s.total}
                  </span>
                </div>
              );
            })}
          {stats && stats.surahProgress.every((s) => s.memorized === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No verses memorized yet — your journey starts with{" "}
              <span className="font-semibold text-foreground">Al-Fatiha</span>.
            </p>
          )}
        </CardContent>
      </Card>

      {/* danger zone */}
      <Card className="border-destructive/30">
        <CardContent className="p-4 flex items-center gap-3">
          <RefreshCw className="size-4 text-muted-foreground" aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-semibold">Reset all progress</p>
            <p className="text-xs text-muted-foreground">Deletes every verse record and activity log. Cannot be undone.</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="size-3.5" aria-hidden /> Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all memorization progress?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes all verse records and activity history. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetAll}>Yes, reset everything</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
