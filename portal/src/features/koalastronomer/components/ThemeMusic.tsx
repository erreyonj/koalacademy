"use client";

import { Pause, Play, Volume1, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const THEME_SRC = "/assets/koalastronomer/Galactic%20Anthem.mp3";
const DEFAULT_VOLUME = 0.45;
const DUCK_RATIO = 0.25;

/**
 * Looping observatory theme. Browsers block autoplay, so `start` must be called
 * from a user gesture (first Archive/Atlas/Observe click). `ducked` lowers the
 * theme while recovered-record notes play back.
 */
export function useThemeMusic(ducked: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userPausedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);

  useEffect(() => {
    const audio = new Audio(THEME_SRC);
    audio.loop = true;
    audio.preload = "auto";
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = ducked ? volume * DUCK_RATIO : volume;
  }, [volume, ducked]);

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => setPlaying(false));
  }, []);

  /** Starts the theme on first gameplay gesture unless the player paused it. */
  const start = useCallback(() => {
    if (!userPausedRef.current) play();
  }, [play]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      userPausedRef.current = false;
      play();
    } else {
      userPausedRef.current = true;
      audio.pause();
    }
  }, [play]);

  return { playing, volume, setVolume, start, toggle };
}

interface MusicTransportProps {
  playing: boolean;
  volume: number;
  onToggle: () => void;
  onVolume: (volume: number) => void;
}

export function MusicTransport({
  playing,
  volume,
  onToggle,
  onVolume,
}: MusicTransportProps) {
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className="obs-music" data-testid="music-transport">
      <button
        type="button"
        className="obs-music-play"
        data-testid="music-toggle"
        aria-pressed={playing}
        aria-label={playing ? "Pause theme music" : "Play theme music"}
        onClick={onToggle}
      >
        {playing ? (
          <Pause size={16} strokeWidth={2.6} aria-hidden="true" />
        ) : (
          <Play size={16} strokeWidth={2.6} aria-hidden="true" />
        )}
      </button>
      <span className="obs-music-title">Galactic Anthem</span>
      <label className="obs-music-volume">
        <VolumeIcon size={16} strokeWidth={2.4} aria-hidden="true" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          data-testid="music-volume"
          aria-label="Theme music volume"
          onChange={(event) => onVolume(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
