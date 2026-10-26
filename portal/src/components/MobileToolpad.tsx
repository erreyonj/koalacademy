"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  ListMusic,
  NotebookPen,
  School,
  Search,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { BacklightPicker } from "@/components/BacklightPicker";
import { NavUser } from "@/components/nav-user";
import { useSidebar } from "@/components/ui/sidebar";
import {
  applyBacklight,
  backlightSwatch,
  readBacklightId,
} from "@/features/theme/backlight";
import { useTheme } from "@/features/theme/ThemeProvider";
import {
  isActivePath,
  isClassesSection,
  isDashboardPath,
  isLessonsSection,
  isSkillsPath,
  isToolkitSection,
} from "@/lib/nav";
import {
  LESSON_LINKS,
  TOOLKIT_LINKS,
  screenLinkActive,
  type ScreenLink,
} from "@/lib/screen-nav";

type SubPageId = "lessons" | "toolkit";

type RootItem =
  | {
      kind: "link";
      title: string;
      href: string;
      icon: LucideIcon;
      isActive: (pathname: string) => boolean;
    }
  | {
      kind: "subpage";
      id: SubPageId;
      title: string;
      icon: LucideIcon;
      isActive: (pathname: string) => boolean;
    };

const ROOT_ITEMS: readonly RootItem[] = [
  {
    kind: "link",
    title: "Dashboard",
    href: "/dashboard/",
    icon: LayoutDashboard,
    isActive: isDashboardPath,
  },
  {
    kind: "link",
    title: "Classes",
    href: "/classes/",
    icon: School,
    isActive: isClassesSection,
  },
  {
    kind: "subpage",
    id: "lessons",
    title: "Lessons",
    icon: NotebookPen,
    isActive: isLessonsSection,
  },
  {
    kind: "subpage",
    id: "toolkit",
    title: "Toolkit",
    icon: Wrench,
    isActive: isToolkitSection,
  },
  {
    kind: "link",
    title: "Skills",
    href: "/skills/",
    icon: Search,
    isActive: isSkillsPath,
  },
  {
    kind: "link",
    title: "Playlists",
    href: "/playlists/",
    icon: ListMusic,
    isActive: (pathname) => isActivePath(pathname, "/playlists/"),
  },
  {
    kind: "link",
    title: "Submissions",
    href: "/submissions/",
    icon: Inbox,
    isActive: (pathname) => isActivePath(pathname, "/submissions/"),
  },
];

const SUB_PAGES: Record<SubPageId, { label: string; items: readonly ScreenLink[] }> = {
  lessons: { label: "Lessons", items: LESSON_LINKS },
  toolkit: { label: "Toolkit", items: TOOLKIT_LINKS },
};

function isPortaledMenuNode(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      '[data-radix-popper-content-wrapper], [data-slot="dropdown-menu-content"], [data-slot="alert-dialog-content"], [data-slot="dialog-content"], [role="menu"], [role="alertdialog"]',
    ),
  );
}

export function MobileToolpad() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [subPage, setSubPage] = useState<SubPageId | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();

  useEffect(() => {
    const next = backlightSwatch(theme, readBacklightId(theme));
    applyBacklight(next);
  }, [theme]);

  useEffect(() => {
    setOpen(false);
    setSubPage(null);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      if (isPortaledMenuNode(event.target)) return;
      setOpen(false);
      setSubPage(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setSubPage(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!isMobile) return null;

  const activeSub = subPage ? SUB_PAGES[subPage] : null;

  return (
    <div ref={rootRef} className="mobile-toolpad-root">
      {open ? (
        <div
          id={dialogId}
          role="dialog"
          aria-modal="false"
          aria-label={activeSub ? `${activeSub.label} navigation` : "Navigation toolpad"}
          className="mobile-toolpad"
          data-page={subPage ?? "root"}
        >
          {activeSub ? (
            <div className="mobile-toolpad-sub">
              <p className="mobile-toolpad-sub-heading">{activeSub.label}</p>
              <ul className="mobile-toolpad-sub-list" role="list">
                {activeSub.items.map((item) => {
                  const active = screenLinkActive(pathname, item);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="mobile-toolpad-sub-link"
                        data-active={active || undefined}
                        aria-current={active ? "page" : undefined}
                        onClick={() => {
                          setOpen(false);
                          setSubPage(null);
                        }}
                      >
                        <Icon aria-hidden="true" />
                        <span>{item.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                className="mobile-toolpad-back"
                aria-label="Back to navigation"
                onClick={() => setSubPage(null)}
              >
                <ArrowLeft aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="mobile-toolpad-main">
              <ul className="mobile-toolpad-grid" role="list">
                {ROOT_ITEMS.map((item) => {
                  const active = item.isActive(pathname);
                  const Icon = item.icon;
                  if (item.kind === "subpage") {
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="mobile-toolpad-item"
                          data-active={active || undefined}
                          onClick={() => setSubPage(item.id)}
                        >
                          <span className="mobile-toolpad-icon" aria-hidden="true">
                            <Icon />
                          </span>
                          <span className="mobile-toolpad-label">{item.title}</span>
                        </button>
                      </li>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="mobile-toolpad-item"
                        data-active={active || undefined}
                        aria-current={active ? "page" : undefined}
                        onClick={() => {
                          setOpen(false);
                          setSubPage(null);
                        }}
                      >
                        <span className="mobile-toolpad-icon" aria-hidden="true">
                          <Icon />
                        </span>
                        <span className="mobile-toolpad-label">{item.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="mobile-toolpad-footer">
                <NavUser />
                <BacklightPicker />
              </div>
            </div>
          )}
        </div>
      ) : null}

      <button
        type="button"
        className="mobile-toolpad-trigger"
        aria-label={open ? "Close navigation toolpad" : "Open navigation toolpad"}
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        onClick={() => {
          setOpen((prev) => {
            const next = !prev;
            if (!next) setSubPage(null);
            return next;
          });
        }}
      >
        <LayoutGrid aria-hidden="true" />
      </button>
    </div>
  );
}
