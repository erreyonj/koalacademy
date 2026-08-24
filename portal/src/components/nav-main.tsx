"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Inbox,
  LayoutDashboard,
  ListMusic,
  NotebookPen,
  Wrench,
  type LucideIcon,
} from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { BANDS } from "@/lib/types";
import {
  isActivePath,
  isDashboardPath,
  isLessonsSection,
  isToolkitSection,
} from "@/lib/nav";

const ITEMS = [
  { title: "Playlists", href: "/playlists/", icon: ListMusic },
  { title: "Submissions", href: "/submissions/", icon: Inbox },
] as const;

const TOOLKIT_LINKS = [
  { title: "Toolkit Home", href: "/toolkit/" },
  { title: "Notation sandbox", href: "/tools/notation/" },
  { title: "Circle of Fifths", href: "/tools/circle-of-fifths/" },
] as const;

export function NavMain() {
  const pathname = usePathname();

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

          <NavSection
            title="Lessons"
            icon={NotebookPen}
            defaultOpen={isLessonsSection(pathname)}
            isActive={isLessonsSection(pathname)}
          >
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
          </NavSection>

          <NavSection
            title="Toolkit"
            icon={Wrench}
            defaultOpen={isToolkitSection(pathname)}
            isActive={isToolkitSection(pathname)}
          >
            {TOOLKIT_LINKS.map((item) => (
              <SidebarMenuSubItem key={item.href}>
                <SidebarMenuSubButton
                  asChild
                  isActive={isActivePath(pathname, item.href)}
                >
                  <Link href={item.href}>{item.title}</Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </NavSection>

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

function NavSection({
  title,
  icon: Icon,
  defaultOpen,
  isActive,
  children,
}: {
  title: string;
  icon: LucideIcon;
  defaultOpen: boolean;
  isActive: boolean;
  children: ReactNode;
}) {
  const { state, setOpen, isMobile } = useSidebar();
  const [sectionOpen, setSectionOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={sectionOpen}
      onOpenChange={(next) => {
        if (state === "collapsed" && !isMobile) {
          setOpen(true);
          setSectionOpen(true);
          return;
        }
        setSectionOpen(next);
      }}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={title} isActive={isActive}>
            <Icon />
            <span>{title}</span>
            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>{children}</SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
