"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { StatusBadge } from "@/components/data-table";
import { getGroup, groupSettingsDef } from "@/lib/data";
import { ArrowLeft } from "lucide-react";

export default function GroupSettingsPage() {
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

  const { groupSettings } = group;

  return (
    <>
      <PageHeader
        title="Group Settings"
        description={`Settings for ${group.name}`}
        stats={
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            <StatusBadge status={group.status} />
          </div>
        }
      />

      <SettingsForm schema={groupSettingsDef.settings} values={groupSettings} title="Settings" description="Configure group-level behavior for the bot" exclude={["blackList"]} />
    </>
  );
}
