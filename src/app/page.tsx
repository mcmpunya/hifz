"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Home, LineChart, Menu, MoonStar, Settings2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RECITERS } from "@/lib/quran-client";
import { useSettings } from "@/hooks/use-hifz-settings";

import Dashboard from "@/components/hifz/Dashboard";
import BrowseView from "@/components/hifz/BrowseView";
import SurahView from "@/components/hifz/SurahView";
import MemorizeSession from "@/components/hifz/MemorizeSession";
import ReviewSession from "@/components/hifz/ReviewSession";
import ProgressView from "@/components/hifz/ProgressView";

export type View =
  | { name: "home" }
  | { name: "browse" }
  | { name: "surah"; surah: number }
  | { name: "memorize"; surah: number; from: number; to: number }
  | { name: "review" }
  | { name: "progress" };

const NAV: { key: View["name"]; label: string; icon: typeof Home }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "browse", label: "Browse", icon: BookOpen },
  { key: "review", label: "Review", icon: Zap },
  { key: "progress", label: "Progress", icon: LineChart },
];

export default function Page() {
  const [view, setView] = useState<View>({ name: "home" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dueCount, setDueCount] = useState(0);
  const { settings, update } = useSettings();

  const refreshDue = useCallback(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setDueCount(s?.dueNow ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshDue();
  }, [refreshDue, view]);

  const go = useCallback((v: View) => {
    setView(v);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  const activeNav = NAV.some((n) => n.key === view.name) ? view.name : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => go({ name: "home" })}
            className="flex items-center gap-2 font-bold text-lg tracking-tight"
            aria-label="Hifz home"
          >
            <span className="medallion size-8 bg-primary text-primary-foreground">
              <MoonStar className="size-4" aria-hidden />
            </span>
            <span>
              Hifz<span className="text-primary">.</span>
            </span>
          </button>

          <nav className="hidden sm:flex items-center gap-1 ml-6" aria-label="Main navigation">
            {NAV.map((n) => (
              <Button
                key={n.key}
                variant={activeNav === n.key ? "secondary" : "ghost"}
                size="sm"
                className={activeNav === n.key ? "font-semibold" : "text-muted-foreground"}
                onClick={() => go({ name: n.key } as View)}
              >
                <n.icon className="size-4" aria-hidden />
                {n.label}
                {n.key === "review" && dueCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-amber-500/90 text-white text-[10px] font-bold size-4.5 px-1">
                    {dueCount > 99 ? "99+" : dueCount}
                  </span>
                )}
              </Button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="icon" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="size-4.5" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              aria-label="Open menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Menu className="size-5" aria-hidden />
            </Button>
          </div>
        </div>

        {/* mobile nav */}
        {menuOpen && (
          <nav className="sm:hidden border-t px-4 py-2 flex flex-col gap-1" aria-label="Mobile navigation">
            {NAV.map((n) => (
              <Button
                key={n.key}
                variant={activeNav === n.key ? "secondary" : "ghost"}
                size="sm"
                className="justify-start"
                onClick={() => go({ name: n.key } as View)}
              >
                <n.icon className="size-4" aria-hidden />
                {n.label}
                {n.key === "review" && dueCount > 0 && (
                  <span className="ml-auto rounded-full bg-amber-500/90 text-white text-[10px] font-bold px-1.5 py-0.5">
                    {dueCount}
                  </span>
                )}
              </Button>
            ))}
          </nav>
        )}
      </header>

      {/* ---------- Main ---------- */}
      <main className="flex-1">
        {view.name === "home" && <Dashboard go={go} />}
        {view.name === "browse" && <BrowseView go={go} />}
        {view.name === "surah" && <SurahView key={view.surah} surah={view.surah} go={go} />}
        {view.name === "memorize" && (
          <MemorizeSession
            key={`${view.surah}-${view.from}-${view.to}`}
            surah={view.surah}
            from={view.from}
            to={view.to}
            go={go}
          />
        )}
        {view.name === "review" && <ReviewSession go={go} />}
        {view.name === "progress" && <ProgressView />}
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="mt-auto border-t bg-card">
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>
            Quran text &amp; translation ©{" "}
            <a
              href="https://tanzil.net"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-primary"
            >
              Tanzil.net
            </a>{" "}
            · Recitations: everyayah.com
          </p>
          <p className="font-arabic text-[13px]">وَرَتِّلِ ٱلْقُرْءَانَ تَرْتِيلًا</p>
        </div>
      </footer>

      {/* ---------- Settings ---------- */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Personalize your memorization experience.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="reciter">Reciter</Label>
              <Select
                value={settings.reciter}
                onValueChange={(v) => update({ reciter: v })}
              >
                <SelectTrigger id="reciter" className="w-full">
                  <SelectValue placeholder="Choose reciter" />
                </SelectTrigger>
                <SelectContent>
                  {RECITERS.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="repeats">Repeats per verse (listen mode)</Label>
                <span className="text-sm font-semibold text-primary w-10 text-right">
                  {settings.repeats >= 99 ? "∞" : settings.repeats}
                </span>
              </div>
              <Slider
                id="repeats"
                min={1}
                max={10}
                step={1}
                value={[Math.min(settings.repeats, 10)]}
                onValueChange={([v]) => update({ repeats: v })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="delay">Pause between repeats</Label>
                <span className="text-sm font-semibold text-primary w-10 text-right">
                  {settings.delay}s
                </span>
              </div>
              <Slider
                id="delay"
                min={0}
                max={3}
                step={0.5}
                value={[settings.delay]}
                onValueChange={([v]) => update({ delay: v })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label htmlFor="translit" className="cursor-pointer">
                Show transliteration
              </Label>
              <Switch
                id="translit"
                checked={settings.showTranslit}
                onCheckedChange={(v) => update({ showTranslit: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="translation" className="cursor-pointer">
                Show translation
              </Label>
              <Switch
                id="translation"
                checked={settings.showTranslation}
                onCheckedChange={(v) => update({ showTranslation: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSettingsOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
