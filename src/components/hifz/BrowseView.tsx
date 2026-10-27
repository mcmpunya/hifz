"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { View } from "@/app/page";
import type { SurahWithProgress } from "@/lib/quran-client";

type Filter = "all" | "meccan" | "medinan" | "started" | "done";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "meccan", label: "Meccan" },
  { key: "medinan", label: "Medinan" },
  { key: "started", label: "In progress" },
  { key: "done", label: "Memorized" },
];

export default function BrowseView({ go }: { go: (v: View) => void }) {
  const [surahs, setSurahs] = useState<SurahWithProgress[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    fetch("/api/surahs")
      .then((r) => r.json())
      .then((d) => setSurahs(d.surahs))
      .catch(() => {});
  }, []);

  const list = useMemo(() => {
    if (!surahs) return [];
    const needle = q.trim().toLowerCase();
    return surahs.filter((s) => {
      if (needle) {
        const hay = `${s.n} ${s.tname} ${s.ename} ${s.name}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      switch (filter) {
        case "meccan":
          return s.type === "Meccan";
        case "medinan":
          return s.type === "Medinan";
        case "started":
          return s.memorized + s.learning > 0 && s.memorized < s.ayas;
        case "done":
          return s.memorized >= s.ayas;
        default:
          return true;
      }
    });
  }, [surahs, q, filter]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search surah by name or number…"
            className="pl-9"
            aria-label="Search surahs"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter surahs">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!surahs ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((s) => {
            const pct = Math.round((s.memorized / s.ayas) * 100);
            const done = s.memorized >= s.ayas;
            return (
              <button
                key={s.n}
                onClick={() => go({ name: "surah", surah: s.n })}
                className="text-left rounded-xl border bg-card p-4 shadow-sm hover:border-primary/50 hover:shadow transition-all focus-visible:outline-2 focus-visible:outline-ring"
              >
                <div className="flex items-center gap-3">
                  <span className="medallion size-9 shrink-0 bg-secondary text-primary text-xs font-bold border border-primary/20">
                    {s.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">
                      {s.tname} <span className="text-muted-foreground font-normal text-xs">· {s.ename}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.ayas} verses · {s.type}
                    </p>
                  </div>
                  {done ? (
                    <CheckCircle2 className="size-5 text-primary shrink-0" aria-label="Surah memorized" />
                  ) : s.memorized + s.learning > 0 ? (
                    <CircleDashed className="size-5 text-amber-500 shrink-0" aria-label="Surah in progress" />
                  ) : null}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Progress value={pct} className="h-1.5 flex-1" />
                  <span className="text-[10px] font-medium text-muted-foreground w-9 text-right">{pct}%</span>
                </div>
                <p className="font-arabic text-lg text-right mt-1 leading-snug truncate" dir="rtl">
                  {s.name}
                </p>
              </button>
            );
          })}
          {list.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-10">
              No surahs match your search.
            </p>
          )}
        </div>
      )}

      {surahs && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {list.length} of {surahs.length} surahs
          {filter !== "all" && <Badge variant="secondary" className="ml-2">{filter}</Badge>}
        </p>
      )}
    </div>
  );
}
