"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsUpDown, LayoutDashboard, Slash } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Logo } from "@/components/logo";
import { groups, getGroup } from "@/lib/data";
import { Button } from "./ui/button";

/** Slug → human-readable label for all static / sub-page routes */
const slugLabels = {
  // Top-level dashboard routes
  groups: "Groups",
  "private-services": "Private Services",
  blacklist: "Blacklist",
  usage: "Usage",
  billing: "Billing",
  "common-settings": "Common Settings",
  // Account routes
  account: "Account",
  settings: "Settings",
  notifications: "Notifications",
  upgrade: "Upgrade",
  // Group sub-pages
  services: "Services",
  "group-settings": "Group Settings",
  participants: "Participants",
  // Service sub-pages
  roles: "Roles",
  "service-settings": "Service Settings",
};

/** Static top-level routes that are NOT group IDs */
const staticRoutes = ["groups", "private-services", "blacklist", "usage", "billing", "common-settings", "account"];

function formatSlug(slug) {
  return slugLabels[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DashboardBreadcrumb({ className }) {
  const pathname = usePathname();
  const router = useRouter();
  // segments: ["dashboard", ...]
  const segments = pathname.split("/").filter(Boolean);

  const isRoot = segments.length <= 1;
  const firstSeg = segments[1]; // could be groupId or a static route

  // ── Prefix: Logo → "/" and Dashboard icon → "/dashboard" ──
  const prefix = (
    <>
      <BreadcrumbItem>
        <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors flex items-center">
          <Logo variant="color" className="size-7" />
        </Link>
      </BreadcrumbItem>
      <BreadcrumbSeparator>
        <Slash className="text-muted" />
      </BreadcrumbSeparator>
      <BreadcrumbItem>
        {isRoot ? (
          <BreadcrumbPage className="flex items-center gap-1.5">
            <LayoutDashboard className="size-4" />
            Dashboard
          </BreadcrumbPage>
        ) : (
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
        )}
      </BreadcrumbItem>
    </>
  );

  // ── Dashboard root ──
  if (isRoot) {
    return (
      <Breadcrumb>
        <BreadcrumbList>{prefix}</BreadcrumbList>
      </Breadcrumb>
    );
  }

  // ── Static / non-group routes (e.g. /dashboard/billing, /dashboard/account/settings) ──
  if (staticRoutes.includes(firstSeg)) {
    const crumbs = segments.slice(1); // everything after "dashboard"
    return (
      <Breadcrumb>
        <BreadcrumbList>
          {prefix}
          <BreadcrumbSeparator>
            <Slash className="text-muted" />
          </BreadcrumbSeparator>
          {crumbs.map((slug, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <React.Fragment key={slug}>
                <BreadcrumbItem>
                  {!isLast ? (
                    <Link href={`/dashboard/${crumbs.slice(0, i + 1).join("/")}`} className="text-muted-foreground hover:text-foreground transition-colors">
                      {formatSlug(slug)}
                    </Link>
                  ) : (
                    <BreadcrumbPage>{formatSlug(slug)}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {!isLast && (
                  <BreadcrumbSeparator>
                    <Slash className="text-muted" />
                  </BreadcrumbSeparator>
                )}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // ── Group / service routes ──
  const groupId = firstSeg;
  const group = getGroup(groupId);
  if (!group) return null;

  const restSegments = segments.slice(2); // everything after groupId
  const serviceId = restSegments[0];
  const service = serviceId ? group.services?.find((s) => String(s.id) === String(serviceId)) : null;

  // Determine if we're on a group sub-page (e.g. group-settings, participants)
  const isGroupSubPage = restSegments.length > 0 && !service;
  // Determine if we're on a service sub-page (e.g. roles, service-settings)
  const serviceSubPage = service && restSegments.length > 1 ? restSegments[1] : null;
  // Whether the group name should be a link (any deeper page)
  const groupIsLink = restSegments.length > 0;
  // Whether the service name should be a link (service sub-page)
  const serviceIsLink = !!serviceSubPage;

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className="gap-y-3">
        {prefix}
        <BreadcrumbSeparator>
          <Slash className="text-muted" />
        </BreadcrumbSeparator>
        {/* Group: clickable name + select switcher */}
        <BreadcrumbItem className="flex items-center gap-1">
          {groupIsLink ? (
            <Link href={`/dashboard/${groupId}`} className="text-muted-foreground hover:text-foreground transition-colors">
              {group.name}
            </Link>
          ) : (
            <BreadcrumbPage>{group.name}</BreadcrumbPage>
          )}
          <Select value={String(groupId)} onValueChange={(id) => router.push(`/dashboard/${id}`)}>
            <SelectTrigger className="[&>svg:last-child]:hidden">
              <Button variant="ghost" size="icon" className="h-6 w-4 p-0 rounded-full">
                <ChevronsUpDown className="h-3.5 w-3.5" />
                <span className="sr-only">Switch group</span>
              </Button>
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {groups.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </BreadcrumbItem>

        {/* Group sub-page (e.g. Group Settings, Participants) */}
        {isGroupSubPage && (
          <>
            <BreadcrumbSeparator>
              <Slash className="text-muted" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>{formatSlug(restSegments[0])}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}

        {/* Service: clickable name + dropdown arrow */}
        {service && (
          <>
            <BreadcrumbSeparator>
              <Slash className="text-muted" />
            </BreadcrumbSeparator>
            <BreadcrumbItem className="flex items-center gap-1">
              {serviceIsLink ? (
                <Link href={`/dashboard/${groupId}/${serviceId}`} className="text-muted-foreground hover:text-foreground transition-colors">
                  {service.name}
                </Link>
              ) : (
                <BreadcrumbPage>{service.name}</BreadcrumbPage>
              )}
              <Select value={String(serviceId)} onValueChange={(id) => router.push(`/dashboard/${groupId}/${id}`)}>
                <SelectTrigger className="[&>svg:last-child]:hidden">
                  <Button variant="ghost" size="icon" className="h-6 w-4 p-0 rounded-full">
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                    <span className="sr-only">Switch service</span>
                  </Button>
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  {group.services.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </BreadcrumbItem>
          </>
        )}

        {/* Service sub-page (e.g. Roles, Service Settings) */}
        {serviceSubPage && (
          <>
            <BreadcrumbSeparator>
              <Slash className="text-muted" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>{formatSlug(serviceSubPage)}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
