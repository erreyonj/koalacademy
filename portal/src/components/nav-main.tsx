"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Inbox,
  LayoutDashboard,
  ListMusic,
  NotebookPen,
  School,
  Search,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  isClassesSection,
  isDashboardPath,
  isLessonsSection,
  isSkillsPath,
  isToolkitSection,
  isActivePath,
} from "@/lib/nav";
import { LESSON_LINKS, TOOLKIT_LINKS, screenLinkActive, type ScreenLink } from "@/lib/screen-nav";

const ITEMS = [
  { title: "Playlists", href: "/playlists/", icon: ListMusic },
  { title: "Submissions", href: "/submissions/", icon: Inbox },
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

          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isClassesSection(pathname)}
              tooltip="Classes"
            >
              <Link href="/classes/">
                <School />
                <span>Classes</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <NavSection
            title="Lessons"
            icon={NotebookPen}
            defaultOpen={isLessonsSection(pathname)}
            isActive={isLessonsSection(pathname)}
            items={LESSON_LINKS}
          />

          <NavSection
            title="Toolkit"
            icon={Wrench}
            defaultOpen={isToolkitSection(pathname)}
            isActive={isToolkitSection(pathname)}
            items={TOOLKIT_LINKS}
          />

          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isSkillsPath(pathname)}
              tooltip="Skills"
            >
              <Link href="/skills/">
                <Search />
                <span>Skills</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

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
  items,
}: {
  title: string;
  icon: LucideIcon;
  defaultOpen: boolean;
  isActive: boolean;
  items: readonly ScreenLink[];
}) {
  const pathname = usePathname();
  const { state, isMobile } = useSidebar();
  const [sectionOpen, setSectionOpen] = useState(defaultOpen);
  const collapsed = state === "collapsed" && !isMobile;

  if (collapsed) {
    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton isActive={isActive}>
              <Icon />
              <span>{title}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-auto min-w-48">
            {items.map((item) => (
              <DropdownMenuItem
                key={item.href}
                asChild
                data-active={screenLinkActive(pathname, item) || undefined}
                className="data-active:bg-accent data-active:font-medium data-active:text-accent-foreground"
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible
      open={sectionOpen}
      onOpenChange={setSectionOpen}
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
          <SidebarMenuSub>
            {items.map((item) => (
              <SidebarMenuSubItem key={item.href}>
                <SidebarMenuSubButton asChild isActive={screenLinkActive(pathname, item)}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
