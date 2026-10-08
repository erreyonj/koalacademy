"use client";

import { useRef } from "react";
import {
  ArrowRightLeft,
  Award,
  MessageCircle,
  MoreVertical,
  PenLine,
  UserMinus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  avatarHue,
  displayName,
  initials,
  marbleTone,
  shownFirst,
  type BehaviorStudent,
} from "../types";

export interface StudentTileProps {
  student: BehaviorStudent;
  /** Teacher Mode is unlocked: show the three-dot menu. */
  teacher: boolean;
  onAdjust: (student: BehaviorStudent, delta: 1 | -1, origin: Element) => void;
  onMove: (student: BehaviorStudent) => void;
  onRemove: (student: BehaviorStudent) => void;
  onPrize: (student: BehaviorStudent) => void;
  onRename: (student: BehaviorStudent) => void;
}

export function StudentTile({
  student,
  teacher,
  onAdjust,
  onMove,
  onRemove,
  onPrize,
  onRename,
}: StudentTileProps) {
  const avatarRef = useRef<HTMLDivElement>(null);
  const hue = avatarHue(student.avatar_seed, student.first_name);
  const tone = marbleTone(student.marbles);
  const name = displayName(student);
  const sign = student.marbles > 0 ? "+" : "";

  return (
    <li
      className={`student-tile${student.prize ? " is-prize" : ""}`}
      style={{ "--avatar-hue": hue } as React.CSSProperties}
    >
      {teacher ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="student-tile-menu"
              aria-label={`Options for ${name}`}
            >
              <MoreVertical aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="student-tile-menu-content">
            <DropdownMenuItem onSelect={() => onPrize(student)}>
              <Award aria-hidden="true" />
              {student.prize ? "Clear prize" : "Prize"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onRename(student)}>
              <PenLine aria-hidden="true" />
              Preferred name…
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onMove(student)}>
              <ArrowRightLeft aria-hidden="true" />
              Move student
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <MessageCircle aria-hidden="true" />
              Contact
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onRemove(student)}>
              <UserMinus aria-hidden="true" />
              Remove student
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <div className="student-avatar" ref={avatarRef} aria-hidden="true">
        <span className="student-avatar-initials">{initials(student)}</span>
        {student.prize ? (
          <span className="student-avatar-star">
            <Award aria-hidden="true" />
          </span>
        ) : null}
      </div>

      <p
        className="student-name"
        title={student.preferred_name ? `${name} (roster: ${student.first_name})` : name}
      >
        {shownFirst(student)}
        {student.last_initial ? (
          <span className="student-name-initial"> {student.last_initial}.</span>
        ) : null}
      </p>

      <span
        className={`marble-count is-${tone}`}
        aria-label={`${name}: ${student.marbles} marbles`}
      >
        {sign}
        {student.marbles}
      </span>

      <div className="student-controls">
        <button
          type="button"
          className="marble-btn is-minus"
          aria-label={`Take a marble from ${name}`}
          onClick={() => onAdjust(student, -1, avatarRef.current ?? document.body)}
        >
          −
        </button>
        <button
          type="button"
          className="marble-btn is-plus"
          aria-label={`Give ${name} a marble`}
          onClick={() => onAdjust(student, 1, avatarRef.current ?? document.body)}
        >
          +
        </button>
      </div>
    </li>
  );
}
