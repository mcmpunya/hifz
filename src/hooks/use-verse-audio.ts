"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface PlayOptions {
  url: string;
  repeats: number; // total plays (>=1), 99 = loop until stopped
  delay: number; // seconds between plays
  onVerseEnd?: () => void; // called after all repeats finish
}

// Verse audio player with repeat + pause-between-repeats support
export function useVerseAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [remaining, setRemaining] = useState(0); // repeats remaining (incl. current)
  const [paused, setPaused] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const optsRef = useRef<PlayOptions | null>(null);
  const playsDoneRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    optsRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
    setPaused(false);
    setRemaining(0);
    setUrl(null);
  }, [clearTimer]);

  const playNext = useCallback(() => {
    const opts = optsRef.current;
    const audio = audioRef.current;
    if (!opts || !audio) return;
    audio.src = opts.url;
    setUrl(opts.url);
    audio
      .play()
      .then(() => {
        setPlaying(true);
        setPaused(false);
      })
      .catch(() => {
        setPlaying(false);
      });
  }, []);

  const play = useCallback(
    (opts: PlayOptions) => {
      clearTimer();
      optsRef.current = opts;
      playsDoneRef.current = 0;
      const total = opts.repeats >= 99 ? 9999 : Math.max(1, opts.repeats);
      setRemaining(total);
      playNext();
    },
    [clearTimer, playNext]
  );

  const pauseToggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !playing) return;
    if (audio.paused) {
      audio.play().catch(() => {});
      setPaused(false);
    } else {
      audio.pause();
      setPaused(true);
    }
  }, [playing]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    const audio = audioRef.current;

    const onEnded = () => {
      const opts = optsRef.current;
      if (!opts) return;
      playsDoneRef.current++;
      const total = opts.repeats >= 99 ? 9999 : Math.max(1, opts.repeats);
      const left = total - playsDoneRef.current;
      setRemaining(left > 0 ? left : 0);
      if (left > 0) {
        timerRef.current = setTimeout(() => playNext(), Math.max(0, opts.delay) * 1000);
      } else {
        setPlaying(false);
        setRemaining(0);
        optsRef.current = null;
        opts.onVerseEnd?.();
      }
    };

    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.pause();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playNext]);

  return { play, stop, pauseToggle, playing, paused, remaining, url };
}
