"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { skillHashtag, skillHref } from "@/lib/skills";

const RESOURCE_ITEMS = [
  {
    href: "/resources/#investigate",
    label: ".Investigate",
    lcd: "INVESTIGATE",
    led: "led-sky",
  },
  {
    href: "/resources/#playlist",
    label: ".Playlist",
    lcd: "PLAYLIST",
    led: "led-yellow",
  },
] as const;

const IDLE_LCD = "OPTIONS — SELECT";

interface LessonToolbarProps {
  slug: string;
  skills: string[];
}

/**
 * Floating MPC options pad. Collapsed by default on every breakpoint; expands
 * into a small LED screen with out-of-lesson links. .Skills opens a tooltip of
 * this lesson’s tags instead of swapping the whole menu.
 */
export function LessonToolbar({ slug, skills }: LessonToolbarProps) {
  const [open, setOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [lcd, setLcd] = useState(IDLE_LCD);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const skillsId = useId();

  useEffect(() => {
    if (!open) {
      setLcd(IDLE_LCD);
      setSkillsOpen(false);
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (skillsOpen) {
        setSkillsOpen(false);
        setLcd(IDLE_LCD);
        return;
      }
      setOpen(false);
    }

    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, skillsOpen]);

  return (
    <div className={`lesson-toolbar${open ? " is-open" : ""}`} ref={rootRef}>
      <div
        className="lesson-toolbar-panel"
        id={panelId}
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <div className="lesson-toolbar-lcd">
          <span className="lcd">{lcd}</span>
        </div>
        <nav className="lesson-toolbar-nav" aria-label="Out-of-lesson material">
          {RESOURCE_ITEMS.map((item) => (
            <Link
              key={item.href}
              className="lesson-toolbar-item"
              href={item.href}
              onMouseEnter={() => setLcd(item.lcd)}
              onMouseLeave={() => setLcd(IDLE_LCD)}
              onFocus={() => setLcd(item.lcd)}
              onBlur={() => setLcd(IDLE_LCD)}
            >
              <span className={`led ${item.led}`} aria-hidden="true" />
              {item.label}
            </Link>
          ))}
          <div className="lesson-toolbar-skills-wrap">
            <button
              type="button"
              className="lesson-toolbar-item"
              aria-expanded={skillsOpen}
              aria-controls={skillsId}
              onMouseEnter={() => setLcd("SKILLS")}
              onMouseLeave={() => {
                if (!skillsOpen) setLcd(IDLE_LCD);
              }}
              onFocus={() => setLcd("SKILLS")}
              onBlur={() => {
                if (!skillsOpen) setLcd(IDLE_LCD);
              }}
              onClick={() => {
                setSkillsOpen((current) => !current);
                setLcd("SKILLS");
              }}
            >
              <span className="led led-green" aria-hidden="true" />
              .Skills
            </button>
            {skillsOpen ? (
              <div className="lesson-toolbar-skills-tip" id={skillsId} role="tooltip">
                {skills.length === 0 ? (
                  <p className="lesson-toolbar-empty">
                    No skills tagged yet.{" "}
                    <Link href="/skills/">Browse all skills</Link>
                  </p>
                ) : (
                  <nav aria-label={`Skills for ${slug}`}>
                    {skills.map((id) => (
                      <Link
                        key={id}
                        href={skillHref(id)}
                        onMouseEnter={() => setLcd(id.toUpperCase())}
                        onMouseLeave={() => setLcd("SKILLS")}
                        onFocus={() => setLcd(id.toUpperCase())}
                        onBlur={() => setLcd("SKILLS")}
                      >
                        {skillHashtag(id)}
                      </Link>
                    ))}
                  </nav>
                )}
              </div>
            ) : null}
          </div>
        </nav>
      </div>

      <button
        type="button"
        className="lesson-toolbar-pad"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close lesson options" : "Open lesson options"}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="led led-sky" aria-hidden="true" />
        OPTIONS
      </button>
    </div>
  );
}
