"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getGroup, getService, getServiceDefinition, formatPhoneNumber } from "@/lib/data";
import { ArrowLeft, Plus, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";

export default function RolesPage() {
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

  const roles = service.roles || {};
  const roleEntries = Object.entries(roles);
  const definedRoles = serviceDef?.roles || [];
  const totalMembers = roleEntries.reduce((sum, [, members]) => sum + members.length, 0);

  // Find participant name from groups.json Participants
  const findParticipantName = (phoneNumber) => {
    const participant = group.participants.find((p) => p.PhoneNumber === phoneNumber);
    return participant?.name || null;
  };

  return (
    <>
      <PageHeader
        title="Roles"
        description={`Manage roles for ${service.name} in ${group.name}`}
        stats={
          <>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Roles:</span>
              <span className="font-semibold">{roleEntries.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total Assignments:</span>
              <span className="font-semibold">{totalMembers}</span>
            </div>
            {definedRoles.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Defined:</span>
                {definedRoles.map((r) => (
                  <Badge key={r} variant="outline" className="text-xs">
                    {r}
                  </Badge>
                ))}
              </div>
            )}
          </>
        }
        actions={
          <Button size="sm">
            <UserPlus className="mr-1.5 h-4 w-4" />
            Add Role Assignment
          </Button>
        }
      />

      {roleEntries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldCheck className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">No roles assigned</p>
            <p className="text-sm text-muted-foreground mt-1">Add role assignments to control who can use which commands.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {roleEntries.map(([roleName, members]) => (
            <Card key={roleName}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    {roleName}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {members.length} {members.length === 1 ? "member" : "members"}
                  </Badge>
                </div>
                {definedRoles.includes(roleName) && <CardDescription className="text-xs">Defined role in service schema</CardDescription>}
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members</p>
                ) : (
                  <div className="space-y-2">
                    {members.map((memberId) => {
                      const name = findParticipantName(memberId);
                      return (
                        <div key={memberId} className="flex items-center justify-between group">
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <div>
                              <span className="text-sm font-mono">{formatPhoneNumber(memberId)}</span>
                              {name && <span className="text-xs text-muted-foreground ml-2">{name}</span>}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
