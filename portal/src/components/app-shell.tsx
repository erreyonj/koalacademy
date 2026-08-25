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
        <div className="flex h-svh w-full flex-col overflow-hidden">
          <SiteHeader />
          <div className="flex min-h-0 flex-1 bg-sidebar">
            <AppSidebar />
            <SidebarInset className="min-h-0 min-w-0 overflow-hidden md:rounded-l-xl">
              <div id="main" className="min-h-0 flex-1 overflow-y-auto">
                {children}
                <SiteFooter />
              </div>
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
