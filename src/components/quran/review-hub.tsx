"use client";

import { Repeat2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatsResponse } from "@/lib/types";
import { useApi } from "./use-api";
import { ReviewSession } from "./review-session";
import { useState } from "react";

export function ReviewHub() {
  const { data: stats } = useApi<StatsResponse>("/api/stats");
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review</h1>
        <p className="text-sm text-muted-foreground">
          Spaced repetition keeps what you memorized firm in your heart.
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="pattern-hero text-primary-foreground px-6 py-8 text-center">
          <Repeat2 className="size-9 mx-auto mb-3 text-primary-foreground/80" />
          <p className="text-4xl font-bold">{stats ? stats.due : "—"}</p>
          <p className="text-sm text-primary-foreground/85 mt-1">
            ayahs due for review today
          </p>
          <Button
            variant="secondary"
            className="mt-4 bg-white/15 hover:bg-white/25 text-primary-foreground border border-white/20"
            onClick={() => setOpen(true)}
          >
            Start review session
          </Button>
        </div>
        <CardContent className="p-5">
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold mb-0.5">How it works</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Each ayah returns at expanding intervals — today, 1 day, 3
                days, then weekly and monthly. Rate your recall and the
                schedule adapts.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-0.5">Forgot an ayah?</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Rating &quot;Forgot&quot; restarts its learning cycle from
                scratch. It&apos;s not a failure — it&apos;s how memory
                strengthens.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-0.5">Daily habit</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {stats ? stats.today.versesReviewed : 0} reviews done today.
                Aim for your goal to protect your streak and your hifz.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="size-4 text-muted-foreground" />
            Tip
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Reviews are most effective after Fajr when the mind is clear, and
            again before sleep. Choose your reciter in settings so the audio
            matches what you hear in salah.
          </p>
        </CardContent>
      </Card>

      <ReviewSession open={open} onOpenChange={setOpen} />
    </div>
  );
}
