"use client";

import { forwardRef } from "react";
import { Hash, LogOut, Minus, MoreVertical, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MarbleBucketProps {
  total: number;
  label: string;
  /** Set briefly after a throw lands or a marble drops. */
  pulse: "in" | "out" | null;
  /** Teacher Mode is unlocked: show the bucket's three-dot menu. */
  teacher?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  onEditTotal?: () => void;
  onEmpty?: () => void;
  onExit?: () => void;
}

/**
 * Class marble bucket. Houses the count; individual marbles are not drawn —
 * the throw/drop animation supplies the motion.
 */
export const MarbleBucket = forwardRef<HTMLDivElement, MarbleBucketProps>(
  function MarbleBucket(
    { total, label, pulse, teacher, onAdd, onRemove, onEditTotal, onEmpty, onExit },
    ref,
  ) {
    return (
      <div className={`marble-bucket${pulse ? ` is-pulse-${pulse}` : ""}`} ref={ref}>
        {teacher ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="student-tile-menu marble-bucket-menu"
                aria-label={`Options for the ${label} bucket`}
              >
                <MoreVertical aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="student-tile-menu-content">
              <DropdownMenuItem onSelect={() => onAdd?.()}>
                <Plus aria-hidden="true" />
                Add marble
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onRemove?.()}>
                <Minus aria-hidden="true" />
                Remove marble
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEditTotal?.()}>
                <Hash aria-hidden="true" />
                Set total…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => onEmpty?.()}>
                <Trash2 aria-hidden="true" />
                Empty bucket
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onExit?.()}>
                <LogOut aria-hidden="true" />
                Exit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <div role="status" aria-live="polite" aria-label={`${label} class marbles: ${total}`}>
          <svg
            className="marble-bucket-art"
            viewBox="0 0 120 120"
            aria-hidden="true"
            focusable="false"
          >
            {/* back rim */}
            <ellipse cx="60" cy="26" rx="46" ry="12" className="bucket-rim-back" />
            {/* body */}
            <path
              d="M14 26 L24 106 Q60 118 96 106 L106 26 Z"
              className="bucket-body"
            />
            {/* band */}
            <path d="M19 62 Q60 74 101 62" className="bucket-band" />
            {/* front rim */}
            <ellipse cx="60" cy="26" rx="46" ry="12" className="bucket-rim" />
            {/* mouth */}
            <ellipse cx="60" cy="26" rx="38" ry="8" className="bucket-mouth" />
            {/* handle */}
            <path d="M18 22 Q60 -16 102 22" className="bucket-handle" />
            {/* shine */}
            <path d="M30 36 L36 98" className="bucket-shine" />
          </svg>
          <div className="marble-bucket-count">
            {teacher && onEditTotal ? (
              <button
                type="button"
                className="marble-bucket-number is-editable"
                aria-label="Set class marbles"
                title="Set class marbles"
                onClick={onEditTotal}
              >
                {total}
              </button>
            ) : (
              <span className="marble-bucket-number">{total}</span>
            )}
            <span className="marble-bucket-caption">class marbles</span>
          </div>
        </div>
      </div>
    );
  },
);
