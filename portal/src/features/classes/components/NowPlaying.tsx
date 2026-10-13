"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Pause, Play, Shuffle } from "lucide-react";
import type { BandId } from "@/lib/types";

/** Entry music. One is picked at random each time the homeroom opens. */
const VIDEOS = ["CBSlu_VMS9U", "kWnxXiFUkag", "lq_bftO4_Bs"] as const;
/** K-2: the mindfulness animal film from the slides, plus two more to shuffle. */
const K2_VIDEOS = ["oRDRfikj2z8", "EOZxywobD_I", "g5cQJ43KPWA"] as const;

/* Minimal slice of the YouTube IFrame API that this player touches. */
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  loadVideoById(id: string): void;
  getVideoData(): { title?: string } | undefined;
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      width?: number | string;
      height?: number | string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (event: { target: YTPlayer }) => void;
        onStateChange?: (event: { data: number; target: YTPlayer }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        if (window.YT) resolve(window.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

function videosFor(band: BandId): readonly string[] {
  return band === "k-2" ? K2_VIDEOS : VIDEOS;
}

function pickVideo(band: BandId, except?: string): string {
  const pool = videosFor(band).filter((id) => id !== except);
  return pool[Math.floor(Math.random() * pool.length)];
}

type Status = "loading" | "ready" | "playing" | "paused";

/**
 * Audio-first YouTube mini player. YouTube will not hand over audio without
 * its iframe, so the video sits inside the small "screen" box with the chrome
 * turned off; the controls beside it are the only thing meant to be touched.
 */
export function NowPlaying({ band }: { band: BandId }) {
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [title, setTitle] = useState<string>("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Picked on the client only so the server markup matches on hydration.
  useEffect(() => {
    setVideoId(pickVideo(band));
  }, [band]);

  useEffect(() => {
    if (!videoId || !mount.current || player.current) return;
    let cancelled = false;
    const host = document.createElement("div");
    mount.current.appendChild(host);

    void loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      player.current = new YT.Player(host, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0,
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          fs: 0,
          disablekb: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event) => {
            setStatus("ready");
            setTitle(event.target.getVideoData()?.title ?? "");
          },
          onStateChange: (event) => {
            setTitle(event.target.getVideoData()?.title ?? "");
            if (event.data === YT.PlayerState.PLAYING) setStatus("playing");
            else if (event.data === YT.PlayerState.PAUSED) setStatus("paused");
            else if (event.data === YT.PlayerState.ENDED) setStatus("ready");
          },
        },
      });
    });

    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
      host.remove();
    };
  }, [videoId]);

  const toggle = useCallback(() => {
    if (!player.current || status === "loading") return;
    if (status === "playing") player.current.pauseVideo();
    else player.current.playVideo();
  }, [status]);

  const shuffle = useCallback(() => {
    if (!player.current || !videoId) return;
    const next = pickVideo(band, videoId);
    setVideoId(next);
    setStatus("ready");
    player.current.loadVideoById(next);
  }, [band, videoId]);

  const toggleExpanded = useCallback(() => {
    setExpanded((open) => !open);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  const playing = status === "playing";
  const caption =
    status === "loading" ? "Tuning in…" : playing ? `Now playing · ${title}` : title || "Ready";

  return (
    <div className={`homeroom-screen${expanded ? " is-expanded" : ""}`}>
      <span className="homeroom-screen-label">Screen</span>
      <div className="homeroom-player" ref={mount} aria-hidden="true" />
      <div className="homeroom-screen-side">
        <div className="homeroom-screen-controls">
          <button
            type="button"
            className="homeroom-screen-button"
            onClick={toggle}
            disabled={status === "loading"}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="homeroom-screen-button"
            onClick={shuffle}
            disabled={status === "loading"}
            aria-label="Pick another song"
            title="Pick another song"
          >
            <Shuffle aria-hidden="true" />
          </button>
          <button
            type="button"
            className="homeroom-screen-button"
            onClick={toggleExpanded}
            aria-label={expanded ? "Shrink screen" : "Expand screen"}
            title={expanded ? "Shrink screen" : "Expand screen"}
            aria-pressed={expanded}
          >
            {expanded ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
          </button>
        </div>
        <p className="lcd homeroom-screen-lcd" aria-live="polite">
          {caption}
        </p>
      </div>
    </div>
  );
}
