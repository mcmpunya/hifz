"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ReviewRating } from "./types";

export type TabId = "home" | "quran" | "review" | "progress";

interface MushafSettings {
  reciter: string;
  dailyGoalMemorize: number;
  dailyGoalReview: number;
  showTranslationWhileMemorizing: boolean;
}

interface MushafState {
  tab: TabId;
  currentSurah: number | null;
  settings: MushafSettings;
  /** increments whenever progress data mutates, so views refetch */
  refreshKey: number;
  /** last surah the user memorized in (for "Continue") */
  lastMemorizeSurah: number | null;
  setTab: (t: TabId) => void;
  openSurah: (n: number) => void;
  backFromSurah: () => void;
  updateSettings: (s: Partial<MushafSettings>) => void;
  bumpRefresh: () => void;
  setLastMemorizeSurah: (n: number) => void;
}

export const useMushafStore = create<MushafState>()(
  persist(
    (set) => ({
      tab: "home",
      currentSurah: null,
      settings: {
        reciter: "Alafasy_128kbps",
        dailyGoalMemorize: 5,
        dailyGoalReview: 20,
        showTranslationWhileMemorizing: true,
      },
      refreshKey: 0,
      lastMemorizeSurah: null,
      setTab: (tab) => set({ tab, currentSurah: null }),
      openSurah: (n) => set({ tab: "quran", currentSurah: n }),
      backFromSurah: () => set({ currentSurah: null }),
      updateSettings: (s) =>
        set((st) => ({ settings: { ...st.settings, ...s } })),
      bumpRefresh: () => set((st) => ({ refreshKey: st.refreshKey + 1 })),
      setLastMemorizeSurah: (n) => set({ lastMemorizeSurah: n }),
    }),
    {
      name: "mushaf-store",
      partialize: (st) => ({
        settings: st.settings,
        lastMemorizeSurah: st.lastMemorizeSurah,
      }),
    }
  )
);

export const RATING_ORDER: ReviewRating[] = ["again", "hard", "good", "easy"];
