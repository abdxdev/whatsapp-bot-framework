"use client";

import { Badge } from "@/components/ui/badge";
import { DataTable, StatusBadge } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { groups } from "@/lib/data";

const totalParticipants = groups.reduce((sum, g) => sum + g.participants, 0);
const activeGroups = groups.filter((g) => g.status === "active").length;
const totalMessages = groups.reduce((sum, g) => sum + g.messagesThisWeek, 0);

const columns = [
  { key: "name", header: "Group", type: "primary", description: "description" },
  { key: "status", header: "Status", type: "status" },
  { key: "participants", header: "Participants", type: "number" },
  { key: "messagesThisWeek", header: "Messages / wk", type: "number" },
  { key: "addedAt", header: "Added", type: "date" },
];

export default function GroupsPage() {
  return (
    <>
      <PageHeader
        title="Groups"
        description="Manage your WhatsApp groups and bot connections"
        stats={
          <>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">{groups.length}</span>
              <Badge variant="secondary" className="text-xs">
                {activeGroups} active
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Participants:</span>
              <span className="font-semibold">{totalParticipants}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Messages/week:</span>
              <span className="font-semibold">{totalMessages.toLocaleString()}</span>
            </div>
          </>
        }
      />

      <DataTable data={groups} columns={columns} getRowHref={(row) => `/dashboard/${row.id}`} searchPlaceholder="Search groups..." addLabel="Add Group" />
    </>
  );
}
