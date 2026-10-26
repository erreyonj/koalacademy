"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LedText } from "@/components/LedText";
import {
  LESSON_LINKS,
  TOOLKIT_LINKS,
  screenLedColor,
  screenLinkActive,
  type ScreenLink,
} from "@/lib/screen-nav";
import type { BandId } from "@/lib/types";

export function GlassScreen({
  children,
  variant = "page",
  lessonBand,
}: {
  children: ReactNode;
  variant?: "page" | "skills" | "deck";
  lessonBand?: BandId;
}) {
  if (variant === "deck") {
    return (
      <header className="page-hero page-hero-deck">
        <div className="page-hero-inner">{children}</div>
      </header>
    );
  }

  const hero = variant === "skills" ? "skills-hero glass-screen" : "page-hero glass-screen";
  const inner = variant === "skills" ? "skills-hero-inner page-hero-inner" : "page-hero-inner";

  return (
    <header className={hero}>
      <GlassRail label="Toolkit" links={TOOLKIT_LINKS} lessonBand={lessonBand} />
      <div className={inner}>{children}</div>
      <GlassRail label="Lessons" links={LESSON_LINKS} side="lessons" lessonBand={lessonBand} />
    </header>
  );
}

function GlassRail({
  label,
  links,
  side = "toolkit",
  lessonBand,
}: {
  label: string;
  links: ScreenLink[];
  side?: "toolkit" | "lessons";
  lessonBand?: BandId;
}) {
  const pathname = usePathname();
  const [home, ...icons] = links;
  if (!home) return null;
  const homeCurrent = screenLinkActive(pathname, home, lessonBand);

  return (
    <nav className="glass-rail" data-side={side} aria-label={label}>
      <Link
        href={home.href}
        className="glass-rail-label-link"
        aria-current={homeCurrent ? "page" : undefined}
      >
        <LedText as="span" className="glass-rail-label" text={label} />
      </Link>
      <ul className="glass-rail-icons">
        {icons.map((link) => {
          const lit = screenLinkActive(pathname, link, lessonBand);
          const Icon = link.icon;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={lit ? "glass-led-icon is-lit" : "glass-led-icon"}
                style={{ "--glass-led": screenLedColor(link.led) } as CSSProperties}
                aria-label={link.title}
                aria-current={lit ? "page" : undefined}
              >
                <Icon aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
