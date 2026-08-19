"use client";

import { useState } from "react";

interface YouTubeEmbedProps {
  /** YouTube video id, not a full URL. */
  id: string;
  title: string;
  artist?: string;
}

/**
 * Click-to-load player. Nothing is requested from YouTube until someone presses
 * the pad, so a slide carrying several examples stays cheap on a phone.
 *
 * The "Watch on YouTube" link is not decoration: it keeps the lesson reachable
 * if a rights holder later disables embedding.
 */
export function YouTubeEmbed({ id, title, artist }: YouTubeEmbedProps) {
  const [live, setLive] = useState(false);
  const label = artist ? `${title} — ${artist}` : title;

  return (
    <div className="embed">
      {live ? (
        <div className="embed-frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : (
        <button type="button" className="embed-btn" onClick={() => setLive(true)}>
          <span className="embed-btn-label">{label}</span>
          <span className="embed-btn-hint">Press to load player</span>
        </button>
      )}
      <p className="embed-link">
        <a
          href={`https://www.youtube.com/watch?v=${id}`}
          target="_blank"
          rel="noopener"
        >
          Watch on YouTube
        </a>
      </p>
    </div>
  );
}
