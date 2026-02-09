"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, StatusBadge } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { getGroup } from "@/lib/data";
import { ArrowLeft } from "lucide-react";

const columns = [
  { key: "name", header: "Service", type: "primary", description: "description" },
  { key: "status", header: "Status", type: "status" },
  { key: "triggers", header: "Triggers", type: "number" },
  { key: "addedAt", header: "Added", type: "date" },
];

export default function ServicesPage() {
  const { groupId } = useParams();
  const group = getGroup(groupId);

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-lg text-muted-foreground">Group not found</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/groups">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Groups
          </Link>
        </Button>
      </div>
    );
  }

  const { services } = group;
  const activeServices = services.filter((s) => s.status === "active").length;
  const totalTriggers = services.reduce((sum, s) => sum + s.triggers, 0);

  return (
    <>
      <PageHeader
        title="Services"
        description={`Manage services for ${group.name}`}
        stats={
          <>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Services:</span>
              <span className="font-semibold">{services.length}</span>
              <Badge variant="secondary" className="text-xs">
                {activeServices} active
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total triggers:</span>
              <span className="font-semibold">{totalTriggers.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              <StatusBadge status={group.status} />
            </div>
          </>
        }
      />

      <DataTable data={services} columns={columns} getRowHref={(row) => `/dashboard/${groupId}/${row.id}`} searchPlaceholder="Search services..." addLabel="Add Service" />
    </>
  );
}
