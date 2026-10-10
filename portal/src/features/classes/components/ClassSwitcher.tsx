"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BANDS } from "@/lib/types";
import { classesByBand, type ClassEntry } from "../registry";

/** Top-right class pad: jumps straight to another homeroom. */
export function ClassSwitcher({ entry }: { entry: ClassEntry }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="homeroom-class-pad is-switcher"
          aria-label={`${entry.name} — switch class`}
        >
          {entry.label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="student-tile-menu-content homeroom-class-menu">
        {classesByBand().map(({ band, classes }, index) => (
          <Fragment key={band}>
            {index > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel>{BANDS.find((item) => item.id === band)?.label ?? band}</DropdownMenuLabel>
            <div className="homeroom-class-menu-grid">
              {classes.map((item) =>
                item.id === entry.id ? (
                  <DropdownMenuItem key={item.id} disabled className="is-current" data-class={item.id}>
                    {item.label}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem key={item.id} asChild data-class={item.id}>
                    <Link href={`/classes/${item.id}/`} title={item.name}>
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ),
              )}
            </div>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
