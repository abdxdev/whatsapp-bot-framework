"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Bot, ShieldBan, BarChart3, CreditCard, Settings, Store, Blocks, UserRound, ShieldCheck, ChevronRight, ArrowLeft, Bell, Sparkles } from "lucide-react";

import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import { Logo } from "@/components/logo";
import { groups, getGroup } from "@/lib/data";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarSeparator } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// ── Config ──────────────────────────────────────────────────────
// Item types:
//   "link"        – simple nav link   { type, label, icon, href }
//   "collapsible" – expandable group  { type, label, icon, href, items: [{ label, href }] }
//   "back"        – back button       { type, label, href }
//   "separator"   – horizontal rule   { type: "separator" }
//   "label"       – group label       { type: "label", text }

const teams = [{ name: "Whatsapp Bot Framework", logo: Logo, plan: "Enterprise" }];

/** Items that always appear at the very bottom of every sidebar context. */
const persistentItems = [{ type: "link", label: "Service Marketplace", icon: Store, href: "/marketplace" }];

/** Build the nav config array for the dashboard root. */
function getDashboardNav() {
  return [
    {
      type: "collapsible",
      label: "Groups",
      icon: Users,
      href: "/dashboard/groups",
      items: groups.map((g) => ({ label: g.name, href: `/dashboard/${g.id}` })),
    },
    { type: "link", label: "Private Services", icon: Bot, href: "/dashboard/private-services" },
    { type: "link", label: "Blacklist", icon: ShieldBan, href: "/dashboard/blacklist" },
    { type: "separator" },
    { type: "link", label: "Usage", icon: BarChart3, href: "/dashboard/usage" },
    { type: "link", label: "Billing", icon: CreditCard, href: "/dashboard/billing" },
    { type: "separator" },
    { type: "link", label: "Common Settings", icon: Settings, href: "/dashboard/common-settings" },
  ];
}

/** Build the nav config array for a selected group. */
function getGroupNav(groupId, group) {
  return [
    { type: "back", label: "All Groups", href: "/dashboard/groups" },
    { type: "label", text: group.name },
    {
      type: "collapsible",
      label: "Services",
      icon: Blocks,
      href: `/dashboard/${groupId}/services`,
      items: group.services.map((s) => ({
        label: s.name,
        href: `/dashboard/${groupId}/${s.id}`,
      })),
    },
    { type: "link", label: "Participants", icon: UserRound, href: `/dashboard/${groupId}/participants` },
    { type: "separator" },
    { type: "link", label: "Group Settings", icon: Settings, href: `/dashboard/${groupId}/group-settings` },
  ];
}

/** Build the nav config array for the account section. */
function getAccountNav() {
  return [{ type: "back", label: "Dashboard", href: "/dashboard" }, { type: "label", text: "Account" }, { type: "link", label: "Settings", icon: Settings, href: "/dashboard/account/settings" }, { type: "link", label: "Notifications", icon: Bell, href: "/dashboard/account/notifications" }, { type: "separator" }, { type: "link", label: "Upgrade", icon: Sparkles, href: "/dashboard/account/upgrade" }];
}

/** Build the nav config array for a selected service. */
function getServiceNav(groupId, serviceId, service) {
  return [{ type: "back", label: "Back to Group", href: `/dashboard/${groupId}` }, { type: "label", text: service.name }, { type: "link", label: "Roles", icon: ShieldCheck, href: `/dashboard/${groupId}/${serviceId}/roles` }, { type: "separator" }, { type: "link", label: "Service Settings", icon: Settings, href: `/dashboard/${groupId}/${serviceId}/service-settings` }];
}

// ── Generic renderer ────────────────────────────────────────────
function SidebarNav({ items, pathname }) {
  // Group items between separators / labels into visual sections
  const sections = [];
  let current = { label: null, items: [] };

  for (const item of items) {
    if (item.type === "separator") {
      sections.push(current);
      current = { label: null, items: [] };
    } else if (item.type === "label") {
      // A label starts a new section with a heading
      sections.push(current);
      current = { label: item.text, items: [] };
    } else {
      current.items.push(item);
    }
  }
  sections.push(current);

  return sections.map((section, idx) => (
    <React.Fragment key={idx}>
      {idx > 0 && sections[idx - 1].items.length > 0 && <SidebarSeparator />}

      {/* Back buttons get their own SidebarGroup */}
      {section.items.length > 0 && section.items[0].type === "back" ? (
        <SidebarGroup>
          <SidebarMenu>
            {section.items.map((item, i) =>
              item.type === "back" ? (
                <SidebarMenuItem key={i}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <Link href={item.href}>
                      <ArrowLeft />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                <NavItem key={i} item={item} pathname={pathname} />
              ),
            )}
          </SidebarMenu>
        </SidebarGroup>
      ) : section.items.length > 0 ? (
        <SidebarGroup>
          {section.label && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
          <SidebarMenu>
            {section.items.map((item, i) => (
              <NavItem key={i} item={item} pathname={pathname} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ) : null}
    </React.Fragment>
  ));
}

function NavItem({ item, pathname }) {
  if (item.type === "collapsible") {
    return (
      <Collapsible asChild defaultOpen className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={item.label} isActive={pathname === item.href}>
              {item.icon && <item.icon />}
              <span>{item.label}</span>
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.items.map((sub) => (
                <SidebarMenuSubItem key={sub.href}>
                  <SidebarMenuSubButton asChild isActive={pathname === sub.href}>
                    <Link href={sub.href}>
                      <span>{sub.label}</span>
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

  // type === "link"
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
        <Link href={item.href}>
          {Icon && <Icon />}
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// ── Main AppSidebar ─────────────────────────────────────────────
export function AppSidebar({ user, ...props }) {
  const pathname = usePathname();

  // Parse route segments: /dashboard / [groupId] / [serviceId] / ...
  const segments = pathname.replace("/dashboard", "").split("/").filter(Boolean);
  const groupId = segments[0];
  const serviceId = segments[1];

  const staticRoutes = ["private-services", "blacklist", "usage", "billing", "common-settings", "account"];

  const group = groupId && !staticRoutes.includes(groupId) ? getGroup(groupId) : null;
  const service = serviceId ? group?.services?.find((s) => String(s.id) === String(serviceId)) : null;

  // Pick the right nav config based on context
  const navItems = groupId === "account" ? getAccountNav() : service ? getServiceNav(groupId, serviceId, service) : group ? getGroupNav(groupId, group) : getDashboardNav();

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader> */}

      <SidebarContent>
        <SidebarNav items={navItems} pathname={pathname} />
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarMenu>
          {persistentItems.map((item, i) => (
            <NavItem key={i} item={item} pathname={pathname} />
          ))}
        </SidebarMenu>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
