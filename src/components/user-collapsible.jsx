"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Sparkles, Settings, Bell, LogOut, Monitor, Moon, Sun, Check, ChevronDown, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

export function UserCollapsible({ user }) {
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };
  return (
    <Collapsible className="border rounded-lg bg-muted/50">
      <CollapsibleTrigger asChild>
        <Button size="lg" variant="ghost" className="h-15 gap-4 w-full">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.full_name || "User"} />
            <AvatarFallback className="rounded-lg">CN</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user?.user_metadata?.full_name || "User"}</span>
            <span className="truncate text-xs">{user?.email}</span>
          </div>
          <ChevronDown className="ml-auto size-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col items-start gap-2 p-2.5 pt-0">
        {/* Navigation items */}
        <Separator />

        <div>
          <Link className="flex items-center gap-3 my-2 mx-2" href="/dashboard/account/upgrade">
            <Sparkles className="h-5 w-5" />
            Upgrade to Pro
          </Link>

          <Link className="flex items-center gap-3 my-2 mx-2" href="/dashboard">
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </Link>

          <Link className="flex items-center gap-3 my-2 mx-2" href="/dashboard/account/settings">
            <Settings className="h-5 w-5" />
            Account Settings
          </Link>

          <Link className="flex items-center gap-3 my-2 mx-2" href="/dashboard/account/notifications">
            <Bell className="h-5 w-5" />
            Notifications
          </Link>
        </div>
        <Separator />

        {/* Theme */}
        <div>
          <Label className="text-xs text-muted-foreground font-medium">Theme</Label>
          <div className="flex items-center gap-3 my-2 mx-2" onClick={() => setTheme("system")}>
            <Monitor className="h-5 w-5" />
            System
            {theme === "system" && <Check className="ml-auto h-4 w-4" />}
          </div>
          <div className="flex items-center gap-3 my-2 mx-2" onClick={() => setTheme("dark")}>
            <Moon className="h-5 w-5" />
            Dark
            {theme === "dark" && <Check className="ml-auto h-4 w-4" />}
          </div>
          <div className="flex items-center gap-3 my-2 mx-2" onClick={() => setTheme("light")}>
            <Sun className="h-5 w-5" />
            Light
            {theme === "light" && <Check className="ml-auto h-4 w-4" />}
          </div>
        </div>
        <Separator />

        {/* Logout */}
        <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
