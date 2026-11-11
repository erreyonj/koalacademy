"use client";

import { useEffect, useState } from "react";

/** True when the viewport is landscape (media query or width > height). */
export function useLandscape() {
  const [landscape, setLandscape] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(orientation: landscape)");
    const sync = () => {
      setLandscape(media.matches || window.innerWidth > window.innerHeight);
    };
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return landscape;
}
