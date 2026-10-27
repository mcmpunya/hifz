"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useMushafStore } from "@/lib/store";
import type { SurahsResponse } from "@/lib/types";
import { useApi } from "./use-api";
import { cn } from "@/lib/utils";

type Filter = "all" | "meccan" | "medinan" | "progress" | "done";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "meccan", label: "Meccan" },
  { id: "medinan", label: "Medinan" },
  { id: "progress", label: "In progress" },
  { id: "done", label: "Memorized" },
];

export function SurahBrowser() {
  const { data, loading } = useApi<SurahsResponse>("/api/surahs");
  const { openSurah } = useMushafStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [visible, setVisible] = useState(30);

  const filtered = useMemo(() => {
    let list = data?.surahs ?? [];
    if (filter === "meccan") list = list.filter((s) => s.type === "Meccan");
    if (filter === "medinan") list = list.filter((s) => s.type === "Medinan");
    if (filter === "progress")
      list = list.filter((s) => s.memorized + s.learning > 0 && s.memorized < s.ayahs);
    if (filter === "done") list = list.filter((s) => s.memorized >= s.ayahs);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          String(s.n) === q ||
          s.ename.toLowerCase().includes(q) ||
          s.tname.toLowerCase().includes(q) ||
          s.name.includes(query.trim())
      );
    }
    return list;
  }, [data, query, filter]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">The Quran</h1>
            <p className="text-sm text-muted-foreground">
              114 surahs · 6,236 ayahs · Uthmani text (Tanzil.net)
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisible(30);
              }}
              placeholder="Search surah — e.g. 36, Yasin, Kahf…"
              className="pl-9"
              aria-label="Search surah"
            />
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto slim-scroll pb-1" role="tablist" aria-label="Filter surahs">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={filter === f.id ? "default" : "outline"}
              className="rounded-full h-8 shrink-0"
              onClick={() => {
                setFilter(f.id);
                setVisible(30);
              }}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No surahs match your search.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.slice(0, visible).map((s) => {
            const memorizedPct = (s.memorized / s.ayahs) * 100;
            const learningPct = (s.learning / s.ayahs) * 100;
            const complete = s.memorized >= s.ayahs;
            return (
              <button
                key={s.n}
                onClick={() => openSurah(s.n)}
                className={cn(
                  "group text-left rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  complete && "border-primary/30 bg-primary/[0.04]"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="medallion size-10 shrink-0 border-2 border-amber-600/40 bg-secondary text-primary">
                    <span className="text-sm font-bold">{s.n}</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold truncate">{s.tname}</span>
                      <span className="font-arabic text-xl text-primary shrink-0">
                        {s.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.ename} · {s.ayahs} ayahs · {s.type}
                      {s.due > 0 && (
                        <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 font-semibold">
                          {s.due} due
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {(s.memorized > 0 || s.learning > 0) && (
                  <div className="mt-3 space-y-1">
                    <div className="relative">
                      <Progress
                        value={memorizedPct}
                        className="h-1.5 bg-amber-500/20"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {complete
                        ? "Fully memorized ✓"
                        : `${s.memorized} memorized${
                            s.learning ? ` · ${s.learning} learning` : ""
                          }`}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length > visible && (
        <div className="text-center pt-2">
          <Button variant="outline" onClick={() => setVisible((v) => v + 30)}>
            Show more ({filtered.length - visible} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
