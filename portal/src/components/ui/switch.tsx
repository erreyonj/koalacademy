"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[1.6rem] w-[2.75rem] shrink-0 items-center rounded-full border-[3px] border-[color:var(--ka-edge)] bg-[var(--ka-slate)] outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[var(--hw-green)] motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[1.05rem] rounded-full bg-[var(--ka-on-dark)] shadow-[0_1px_2px_rgba(0,0,0,0.28)] ring-0 transition-transform translate-x-[0.12rem] data-[state=checked]:translate-x-[1.18rem] motion-reduce:transition-none"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
