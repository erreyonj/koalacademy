"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Backpack,
  BookA,
  ChevronRight,
  Dices,
  Gamepad2,
  House,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  ListMusic,
  Music,
  NotebookPen,
  Orbit,
  Piano,
  School,
  Search,
  Sprout,
  Tablet,
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
import { BANDS, type BandId } from "@/lib/types";
import {
  isActivePath,
  isClassesSection,
  isDashboardPath,
  isKeysLitePath,
  isLessonsSection,
  isSkillsPath,
  isToolkitSection,
} from "@/lib/nav";

type NavChild = {
  title: string;
  href: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

const ITEMS = [
  { title: "Playlists", href: "/playlists/", icon: ListMusic },
  { title: "Submissions", href: "/submissions/", icon: Inbox },
] as const;

const BAND_ICONS: Record<BandId, LucideIcon> = {
  "k-2": Sprout,
  "3-5": Backpack,
  "6-8": Tablet,
};

const LESSON_LINKS: NavChild[] = [
  {
    title: "Lessons Home",
    href: "/lessons/",
    icon: House,
    isActive: (pathname) => isActivePath(pathname, "/lessons"),
  },
  ...BANDS.map(
    (band): NavChild => ({
      title: band.short,
      href: `/grades/${band.id}/`,
      icon: BAND_ICONS[band.id],
      isActive: (pathname) => isActivePath(pathname, `/grades/${band.id}`),
    }),
  ),
];

const TOOLKIT_LINKS: NavChild[] = [
  {
    title: "Toolkit Home",
    href: "/toolkit/",
    icon: LayoutGrid,
    isActive: (pathname) => isActivePath(pathname, "/toolkit"),
  },
  {
    title: "Glossary",
    href: "/tools/glossary/",
    icon: BookA,
    isActive: (pathname) => isActivePath(pathname, "/tools/glossary"),
  },
  {
    title: "Games",
    href: "/toolkit/games/",
    icon: Gamepad2,
    isActive: (pathname) => isActivePath(pathname, "/toolkit/games"),
  },
  {
    title: "Notation Sandbox",
    href: "/tools/notation/",
    icon: Music,
    isActive: (pathname) => isActivePath(pathname, "/tools/notation"),
  },
  {
    title: "Rhythm Randomizer",
    href: "/tools/rhythm/",
    icon: Dices,
    isActive: (pathname) => isActivePath(pathname, "/tools/rhythm"),
  },
  {
    title: "Circle of Fifths",
    href: "/tools/circle-of-fifths/",
    icon: Orbit,
    isActive: (pathname) => isActivePath(pathname, "/tools/circle-of-fifths"),
  },
  {
    title: "Keys.lite",
    href: "/tools/keys-lite/",
    icon: Piano,
    isActive: isKeysLitePath,
  },
];

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
  items: readonly NavChild[];
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
                data-active={item.isActive(pathname) || undefined}
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
                <SidebarMenuSubButton asChild isActive={item.isActive(pathname)}>
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
