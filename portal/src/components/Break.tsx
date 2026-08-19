"use client";

import { useEffect, useState } from "react";

interface BreakProps {
  src: string;
  /** Describe the joke, not the file. Screen reader users get the bit too. */
  alt: string;
  caption?: string;
}

/**
 * An attention reset between blocks. Deliberately a plain img: the gifs are
 * remote, the export is static, and animation is the whole point.
 *
 * When the viewer prefers reduced motion, the gif is replaced by its alt text
 * so nothing on the page is looping.
 */
export function Break({ src, alt, caption }: BreakProps) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  if (reduceMotion) {
    return (
      <figure className="break break-still">
        <p className="break-alt">{alt}</p>
        {caption ? <figcaption className="break-caption">{caption}</figcaption> : null}
      </figure>
    );
  }

  return (
    <figure className="break">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" />
      {caption ? <figcaption className="break-caption">{caption}</figcaption> : null}
    </figure>
  );
}
