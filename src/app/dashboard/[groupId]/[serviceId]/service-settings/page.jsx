"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { StatusBadge } from "@/components/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getGroup, getService, getServiceDefinition } from "@/lib/data";
import { ArrowLeft, Info } from "lucide-react";

export default function ServiceSettingsPage() {
  const { groupId, serviceId } = useParams();
  const group = getGroup(groupId);
  const service = getService(groupId, serviceId);
  const serviceDef = getServiceDefinition(serviceId);

  if (!group || !service) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-lg text-muted-foreground">Service not found</p>
        <Button variant="outline" asChild>
          <Link href={group ? `/dashboard/${groupId}/services` : "/dashboard/groups"}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {group ? "Back to Services" : "Back to Groups"}
          </Link>
        </Button>
      </div>
    );
  }

  // Build settings schema from service definition
  const settingsSchema = serviceDef?.serviceSettings || {};
  // Current values (excluding status which is always present)
  const currentValues = { ...service.serviceSettings };

  // Add the standard status field if not in service definition
  const fullSchema = {
    status: {
      type: "string",
      description: "Active or paused status of this service in the group",
      default: "active",
    },
    ...settingsSchema,
  };

  return (
    <>
      <PageHeader
        title="Service Settings"
        description={`Configure ${service.name} in ${group.name}`}
        stats={
          <>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              <StatusBadge status={service.status} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Members:</span>
              <span className="font-semibold">{service.memberCount}</span>
            </div>
          </>
        }
      />

      {/* Service info */}
      {serviceDef && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              About {serviceDef.name}
            </CardTitle>
            <CardDescription>{serviceDef.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 text-sm">
              {serviceDef.roles && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Roles:</span>
                  {serviceDef.roles.map((r) => (
                    <Badge key={r} variant="outline" className="text-xs">
                      {r}
                    </Badge>
                  ))}
                </div>
              )}
              {serviceDef.oneCmdPerMsg && (
                <Badge variant="secondary" className="text-xs">
                  One command per message
                </Badge>
              )}
              {serviceDef.allowInPrivateChat && (
                <Badge variant="secondary" className="text-xs">
                  Private chat allowed
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dynamic service settings */}
      {Object.keys(fullSchema).length > 0 && <SettingsForm schema={fullSchema} values={currentValues} title="Settings" description="Configurable settings for this service instance" />}
    </>
  );
}
