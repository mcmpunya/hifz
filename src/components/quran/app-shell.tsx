"use client";

import { useState } from "react";
import {
  BookOpen,
  Flame,
  Home,
  Library,
  Moon,
  Repeat2,
  Settings,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMushafStore, type TabId } from "@/lib/store";
import type { StatsResponse } from "@/lib/types";
import { useApi } from "./use-api";
import { SettingsDialog } from "./settings-dialog";

const TABS: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "quran", label: "Quran", icon: BookOpen },
  { id: "review", label: "Review", icon: Repeat2 },
  { id: "progress", label: "Progress", icon: Library },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { tab, setTab } = useMushafStore();
  const [open, setOpen] = useState(false);
  const { data: stats } = useApi<StatsResponse>("/api/stats");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center gap-3">
          <button
            className="flex items-center gap-2.5 mr-2 focus-visible:outline-none"
            onClick={() => setTab("home")}
            aria-label="Mushaf home"
          >
            <span className="medallion size-8 bg-primary text-primary-foreground shadow-sm">
              <span className="text-base leading-none font-bold">م</span>
            </span>
            <span className="flex flex-col items-start leading-none">
              <span className="font-bold text-lg tracking-tight">Mushaf</span>
              <span className="text-[10px] text-muted-foreground hidden sm:block">
                Quran Memorization Companion
              </span>
            </span>
          </button>

          {/* Desktop tabs */}
          <nav className="hidden md:flex items-center gap-1 ml-auto" aria-label="Main">
            {TABS.map((t) => (
              <Button
                key={t.id}
                variant={tab === t.id ? "secondary" : "ghost"}
                size="sm"
                className={
                  tab === t.id
                    ? "font-medium text-primary"
                    : "text-muted-foreground"
                }
                onClick={() => setTab(t.id)}
              >
                <t.icon className="size-4" />
                {t.label}
                {t.id === "review" && stats && stats.due > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 px-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0"
                  >
                    {stats.due}
                  </Badge>
                )}
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-1 ml-auto md:ml-2">
            {stats && stats.streak > 0 && (
              <span className="hidden sm:flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2.5 py-1 text-xs font-semibold mr-1">
                <Flame className="size-3.5" />
                {stats.streak}
              </span>
            )}
            <ThemeToggle />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Settings">
                  <Settings className="size-4.5" />
                </Button>
              </DialogTrigger>
              <SettingsDialog onDone={() => setOpen(false)} />
            </Dialog>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-8">{children}</main>

      <footer className="mt-auto border-t border-border/70 bg-card/60 hidden md:block">
        <div className="mx-auto max-w-5xl px-4 py-4 text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            Quran text ©{" "}
            <a
              className="underline underline-offset-2 hover:text-foreground"
              href="https://tanzil.net"
              target="_blank"
              rel="noreferrer"
            >
              Tanzil.net
            </a>{" "}
            (Uthmani text v1.1)
          </span>
          <span>Translation: Saheeh International</span>
          <span>Audio: everyayah.com</span>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        aria-label="Main mobile"
      >
        <div className="grid grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium min-h-[56px] ${
                tab === t.id
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <span className="relative">
                <t.icon className="size-5" />
                {t.id === "review" && stats && stats.due > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-4 h-4 px-0.5 rounded-full bg-amber-500 text-[9px] text-white flex items-center justify-center font-bold">
                    {stats.due > 99 ? "99+" : stats.due}
                  </span>
                )}
              </span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Sun className="size-4.5 hidden dark:block" />
      <Moon className="size-4.5 dark:hidden" />
    </Button>
  );
}
