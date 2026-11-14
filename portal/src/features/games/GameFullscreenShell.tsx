"use client";

import { LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const GAME_INIT_MS = 2500;
const GAMES_PATH = "/toolkit/games/";

interface GameFullscreenShellProps {
  title: string;
  /** Short status line under the progress bar while booting. */
  bootLabel: string;
  theme: "observatory" | "vault" | "field";
  /** What happens to the player's run if they leave now. */
  exitNote: string;
  children: ReactNode;
}

/**
 * Boots a toolkit game behind a short initializing screen, then takes over the
 * viewport (site header, sidebar, and footer hidden) until the player exits.
 */
export function GameFullscreenShell({
  title,
  bootLabel,
  theme,
  exitNote,
  children,
}: GameFullscreenShellProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), GAME_INIT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.dataset.gameFullscreen = "true";
    return () => {
      delete root.dataset.gameFullscreen;
    };
  }, [ready]);

  const handleExit = () => {
    delete document.documentElement.dataset.gameFullscreen;
    router.push(GAMES_PATH);
  };

  if (!ready) {
    return (
      <div
        className={`game-boot game-boot--${theme}`}
        role="status"
        aria-live="polite"
        data-testid="game-initializing"
      >
        <span className="game-boot-title">{title}</span>
        <span className="game-boot-label">Initializing</span>
        <span className="game-boot-bar" aria-hidden="true">
          <span
            className="game-boot-bar-fill"
            style={{ animationDuration: `${GAME_INIT_MS}ms` }}
          />
        </span>
        <span className="game-boot-sub">{bootLabel}</span>
      </div>
    );
  }

  return (
    <div className="game-fullscreen" data-testid="game-fullscreen">
      {children}

      <button
        type="button"
        className="game-exit-btn"
        aria-label="Leave game"
        data-testid="game-exit-btn"
        onClick={() => setExitOpen(true)}
      >
        <LayoutDashboard size={20} strokeWidth={2.2} aria-hidden="true" />
      </button>

      <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
        <AlertDialogContent data-testid="game-exit-modal">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {title}?</AlertDialogTitle>
            <AlertDialogDescription>{exitNote}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="game-exit-cancel">
              Keep playing
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="game-exit-confirm"
              onClick={handleExit}
            >
              Back to Games
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
