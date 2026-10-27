"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useMushafStore } from "@/lib/store";
import { RECITERS } from "@/lib/types";

export function SettingsDialog({ onDone }: { onDone: () => void }) {
  const { settings, updateSettings } = useMushafStore();

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>
          Personalize your memorization experience.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="reciter">Reciter (audio)</Label>
          <Select
            value={settings.reciter}
            onValueChange={(v) => updateSettings({ reciter: v })}
          >
            <SelectTrigger id="reciter" className="w-full">
              <SelectValue placeholder="Choose a reciter" />
            </SelectTrigger>
            <SelectContent>
              {RECITERS.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Verse-by-verse recitation audio from everyayah.com
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="goal-memo">New ayahs / day</Label>
            <Input
              id="goal-memo"
              type="number"
              min={1}
              max={100}
              value={settings.dailyGoalMemorize}
              onChange={(e) =>
                updateSettings({
                  dailyGoalMemorize: Math.max(
                    1,
                    Math.min(100, Number(e.target.value) || 1)
                  ),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-review">Reviews / day</Label>
            <Input
              id="goal-review"
              type="number"
              min={1}
              max={300}
              value={settings.dailyGoalReview}
              onChange={(e) =>
                updateSettings({
                  dailyGoalReview: Math.max(
                    1,
                    Math.min(300, Number(e.target.value) || 1)
                  ),
                })
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="show-tr" className="font-normal">
              Show translation while memorizing
            </Label>
            <p className="text-xs text-muted-foreground">
              Display the meaning under each ayah in practice mode
            </p>
          </div>
          <Switch
            id="show-tr"
            checked={settings.showTranslationWhileMemorizing}
            onCheckedChange={(v) =>
              updateSettings({ showTranslationWhileMemorizing: v })
            }
          />
        </div>

        <Separator />

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Quran text: Tanzil.net (Uthmani, v1.1) · Translation: Saheeh
          International · Recitation: everyayah.com. We keep the text unchanged
          as required by the Tanzil license.
        </p>
      </div>
    </DialogContent>
  );
}
