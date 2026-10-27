"use client";

import { useCallback, useSyncExternalStore } from "react";
import { RECITERS } from "@/lib/quran-client";

export interface HifzSettings {
  reciter: string;
  repeats: number; // listen & repeat count per verse
  delay: number; // seconds between repeats
  showTranslit: boolean;
  showTranslation: boolean;
}

const DEFAULTS: HifzSettings = {
  reciter: RECITERS[0].id,
  repeats: 5,
  delay: 1,
  showTranslit: false,
  showTranslation: true,
};

const KEY = "hifz:settings:v1";
const EVENT = "hifz:settings-changed";

function readSettings(): HifzSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function writeSettings(s: HifzSettings) {
  window.localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event(EVENT));
}

let snapshot: HifzSettings | null = null;

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

function getSnapshot(): HifzSettings {
  if (!snapshot) snapshot = readSettings();
  return snapshot;
}

function getServerSnapshot(): HifzSettings {
  return DEFAULTS;
}

export function useSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const update = useCallback((patch: Partial<HifzSettings>) => {
    const next = { ...getSnapshot(), ...patch };
    snapshot = next;
    writeSettings(next);
  }, []);

  return { settings, update };
}
