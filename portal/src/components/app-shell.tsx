"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileToolpad } from "@/components/MobileToolpad";
import { ScrollTop } from "@/components/ScrollTop";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TeacherModeProvider } from "@/features/teacher-progress/TeacherModeProvider";

export function AppShell({ children }: { children: ReactNode }) {
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const footer = footerRef.current?.querySelector(".footer");
    if (!footer) return;
    const apply = () => {
      const hidden = getComputedStyle(footer).display === "none";
      const height = hidden ? 0 : footer.getBoundingClientRect().height;
      document.documentElement.style.setProperty("--device-footer-h", `${height}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(footer);
    const media = window.matchMedia("(max-width: 767px)");
    media.addEventListener("change", apply);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", apply);
    };
  }, []);

  return (
    <TooltipProvider>
      <TeacherModeProvider>
        <SidebarProvider defaultOpen={false}>
          <div className="flex h-svh w-full flex-col overflow-hidden">
            <SiteHeader />
            <div className="relative flex min-h-0 flex-1 bg-sidebar">
              <AppSidebar />
              <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
                <div id="main" className="min-h-0 flex-1 overflow-y-auto">
                  {children}
                </div>
                <ScrollTop />
              </SidebarInset>
              <MobileToolpad />
            </div>
            <div ref={footerRef}>
              <SiteFooter />
            </div>
          </div>
        </SidebarProvider>
      </TeacherModeProvider>
    </TooltipProvider>
  );
}
