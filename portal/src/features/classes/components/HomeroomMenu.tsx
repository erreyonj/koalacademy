"use client";

import Link from "next/link";
import { Armchair, FolderKanban, LayoutGrid, ListMusic, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HomeroomMenuProps {
  className: string;
  onEditSeating: () => void;
}

/** Top-left hamburger: class projects, seating editor, and the Vanguard songs. */
export function HomeroomMenu({ className, onEditSeating }: HomeroomMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="homeroom-menu-button" aria-label="Class menu">
          <Menu aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="student-tile-menu-content">
        <DropdownMenuLabel>{className}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled title="Untitled app projects, art, and more — coming soon.">
          <FolderKanban aria-hidden="true" />
          Class Projects
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onEditSeating}>
          <Armchair aria-hidden="true" />
          Create/Edit Seating Chart
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/playlists/">
            <ListMusic aria-hidden="true" />
            Vanguard Songs
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/classes/">
            <LayoutGrid aria-hidden="true" />
            All classes
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
