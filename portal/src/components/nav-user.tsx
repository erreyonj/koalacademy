"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardCheck, ExternalLink, LogOut, Moon, Settings, UserRound } from "lucide-react";
import { TeacherCodeDialog } from "@/features/teacher-progress/TeacherCodeDialog";
import { useTeacherMode } from "@/features/teacher-progress/TeacherModeProvider";
import { useTheme } from "@/features/theme/ThemeProvider";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { MARKETING_SITE_URL } from "@/lib/nav";

const PILOT_USER = {
  name: "Pilot Guest",
  role: "K–8 Pilot",
  initials: "PG",
};

export function NavUser() {
  const { unlocked } = useTeacherMode();
  const { theme, setTheme } = useTheme();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const dark = theme === "dark";

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                tooltip="Account"
                aria-label="Open account menu"
              >
                <Avatar>
                  <AvatarImage
                    src="/assets/ka-main-smile-decal-no-bg.png"
                    alt=""
                  />
                  <AvatarFallback>{PILOT_USER.initials}</AvatarFallback>
                </Avatar>
                <span className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{PILOT_USER.name}</span>
                  <span className="truncate text-xs">{PILOT_USER.role}</span>
                </span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56"
              side="top"
              align="start"
              sideOffset={8}
            >
              <DropdownMenuLabel>
                <span className="grid text-sm leading-tight">
                  <span>{PILOT_USER.name}</span>
                  <span className="font-normal text-muted-foreground">
                    {PILOT_USER.role}
                  </span>
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile/">
                  <UserRound />
                  Manage Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/">
                  <Settings />
                  Account Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={MARKETING_SITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink />
                  Koalacademy Site
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem
                role="menuitemcheckbox"
                aria-label="Dark mode"
                aria-checked={dark}
                onSelect={(event) => {
                  event.preventDefault();
                  setTheme(dark ? "light" : "dark");
                }}
              >
                <Moon />
                Dark mode
                <Switch
                  className="pointer-events-none ml-auto"
                  checked={dark}
                  onCheckedChange={(checked) =>
                    setTheme(checked ? "dark" : "light")
                  }
                  tabIndex={-1}
                  aria-hidden
                />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {unlocked ? (
                <DropdownMenuItem asChild>
                  <Link href="/teacher/">
                    <ClipboardCheck />
                    Teacher mode
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setTeacherOpen(true);
                  }}
                >
                  <ClipboardCheck />
                  Teacher mode
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  setLogoutOpen(true);
                }}
              >
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <TeacherCodeDialog
        open={teacherOpen}
        onOpenChange={setTeacherOpen}
      />

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auth is being built</AlertDialogTitle>
            <AlertDialogDescription>
              There is no account to sign out of yet. Login and logout will land
              with the first auth pass.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
