"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Inbox, LayoutDashboard, ListMusic, NotebookPen, Wrench } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { BANDS } from "@/lib/types";
import { isActivePath, isDashboardPath, isLessonsSection } from "@/lib/nav";

const ITEMS = [
  { title: "Toolkit", href: "/toolkit/", icon: Wrench },
  { title: "Playlists", href: "/playlists/", icon: ListMusic },
  { title: "Submissions", href: "/submissions/", icon: Inbox },
] as const;

export function NavMain() {
  const pathname = usePathname();
  const lessonsOpen = isLessonsSection(pathname);

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="h-auto min-h-[var(--tap-min)] gap-2 group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:opacity-100">
        <SidebarTrigger />
        <span className="lcd group-data-[collapsible=icon]:hidden">Navigate</span>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isDashboardPath(pathname)}
              tooltip="Dashboard"
            >
              <Link href="/dashboard/">
                <LayoutDashboard />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <Collapsible defaultOpen={lessonsOpen} className="group/collapsible">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip="Lessons">
                  <NotebookPen />
                  <span>Lessons</span>
                  <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={isActivePath(pathname, "/lessons")}
                    >
                      <Link href="/lessons/">Lessons Home</Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  {BANDS.map((band) => (
                    <SidebarMenuSubItem key={band.id}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={isActivePath(pathname, `/grades/${band.id}`)}
                      >
                        <Link href={`/grades/${band.id}/`}>{band.short}</Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>

          {ITEMS.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActivePath(pathname, item.href)}
                tooltip={item.title}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
