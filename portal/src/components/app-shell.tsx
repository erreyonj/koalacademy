"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <div className="flex min-h-svh w-full flex-col">
          <SiteHeader />
          <div className="flex min-h-0 flex-1 bg-sidebar">
            <AppSidebar />
            <SidebarInset className="min-w-0 overflow-hidden md:rounded-l-xl">
              <div id="main" className="flex-1">
                {children}
              </div>
              <SiteFooter />
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
