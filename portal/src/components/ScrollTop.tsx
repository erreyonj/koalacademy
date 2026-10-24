"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronUp } from "lucide-react";

const SHOW_AFTER = 240;

export function ScrollTop() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const main = document.getElementById("main");
    if (!main) return;
    const onScroll = () => setVisible(main.scrollTop > SHOW_AFTER);
    onScroll();
    main.addEventListener("scroll", onScroll, { passive: true });
    return () => main.removeEventListener("scroll", onScroll);
  }, [pathname]);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="scroll-top btn-backlit"
      aria-label="Back to top"
      onClick={() => {
        const main = document.getElementById("main");
        if (!main) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        main.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }}
    >
      <ChevronUp aria-hidden="true" />
    </button>
  );
}
