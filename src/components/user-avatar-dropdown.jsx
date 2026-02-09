"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, Settings, FolderOpen, Command, Sun, Moon, Monitor, LogOut, Check, Sparkle, Sparkles, Bell } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function UserAvatarDropdown({ user }) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative h-8 w-8 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 rounded-lg" align="end" sideOffset={8}>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.full_name || "User"} />
              <AvatarFallback className="rounded-lg">CN</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user?.user_metadata?.full_name || "User"}</span>
              <span className="truncate text-xs">{user?.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Navigation items */}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/account/upgrade">
              <Sparkles className="mr-2 h-4 w-4" />
              Upgrade to Pro
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/account/settings">
              <Settings className="mr-2 h-4 w-4" />
              Account Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/account/notifications">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        {/* Theme */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">Theme</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <Monitor className="mr-2 h-4 w-4" />
            System
            {theme === "system" && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon className="mr-2 h-4 w-4" />
            Dark
            {theme === "dark" && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="mr-2 h-4 w-4" />
            Light
            {theme === "light" && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
