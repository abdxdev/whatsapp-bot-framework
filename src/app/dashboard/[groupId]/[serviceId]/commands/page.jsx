"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { getGroup, getService, getServiceDefinition } from "@/lib/data";
import { ArrowLeft, LayoutList, BookOpen } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const columns = [
  { key: "name", header: "Command", type: "primary", description: "description" },
  {
    key: "roles",
    header: "Roles",
    type: "custom",
    render: (value) =>
      value.length > 0
        ? value.map((r) => (
            <Badge key={r} variant="outline" className="text-xs mr-1">
              {r}
            </Badge>
          ))
        : "—",
  },
  { key: "paramCount", header: "Parameters", type: "number" },
  { key: "syntaxCount", header: "Syntaxes", type: "number" },
  {
    key: "flags",
    header: "Flags",
    type: "custom",
    render: (_, row) => (
      <div className="flex gap-1">
        {row.aiEnabled && (
          <Badge variant="secondary" className="text-xs">
            AI
          </Badge>
        )}
        {!row.interactive && (
          <Badge variant="outline" className="text-xs">
            Non-interactive
          </Badge>
        )}
      </div>
    ),
  },
];

// ── Reference preview card for a single command ─────────────────
function CommandCard({ name, cmd }) {
  const syntaxes = cmd.syntaxes || (cmd.syntax ? [cmd.syntax] : []);
  const aiEnabled = !!cmd.AIConfig?.readWithAI;
  const nonInteractive = cmd.interactive === false;

  return (
    <Card id={name}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-base">{name}</CardTitle>
          <div className="flex gap-1">
            {aiEnabled && (
              <Badge variant="secondary" className="text-xs">
                AI
              </Badge>
            )}
            {nonInteractive && (
              <Badge variant="outline" className="text-xs">
                Non-interactive
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{cmd.description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {syntaxes.map((syn, i) => {
          const roles = syn.allowedRoles || ["*"];
          const params = Object.entries(syn.parameters || {});
          return (
            <div key={i} className="space-y-2">
              {syntaxes.length > 1 && <p className="text-xs font-medium text-muted-foreground">Syntax {i + 1}</p>}
              <div className="flex flex-wrap gap-1">
                {roles.map((r) => (
                  <Badge key={r} variant="outline" className="text-xs">
                    {r}
                  </Badge>
                ))}
              </div>
              {params.length > 0 && (
                <div className="rounded-md border text-sm">
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 p-2">
                    {params.map(([pName, pDef]) => (
                      <div key={pName} className="contents">
                        <span className="font-mono text-xs">{pName}</span>
                        <span className="text-xs text-muted-foreground">
                          <Badge variant="secondary" className="mr-1 text-[10px] px-1 py-0">
                            {pDef.type}
                          </Badge>
                          {pDef.description}
                          {pDef.optional && <span className="italic ml-1">(optional)</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {i < syntaxes.length - 1 && <Separator />}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function CommandsPage() {
  const { groupId, serviceId } = useParams();
  const [view, setView] = useState("table");
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

  const commandEntries = Object.entries(serviceDef?.commands || {});

  const commandsData = commandEntries.map(([key, cmd]) => {
    const allRoles = cmd.syntaxes ? [...new Set(cmd.syntaxes.flatMap((s) => s.allowedRoles))] : cmd.syntax?.parameters ? ["*"] : [];
    const paramCount = cmd.syntaxes ? Math.max(...cmd.syntaxes.map((s) => Object.keys(s.parameters).length)) : Object.keys(cmd.syntax?.parameters || {}).length;

    return {
      id: key,
      name: key,
      description: cmd.description,
      roles: allRoles,
      paramCount,
      syntaxCount: cmd.syntaxes?.length || (cmd.syntax ? 1 : 0),
      aiEnabled: !!cmd.AIConfig?.readWithAI,
      interactive: cmd.interactive !== false,
    };
  });

  const aiCount = commandsData.filter((c) => c.aiEnabled).length;

  return (
    <>
      <PageHeader
        title="Commands"
        description={`Available commands for ${service.name}`}
        stats={
          <>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">{commandsData.length}</span>
            </div>
            {aiCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">AI-enabled:</span>
                <span className="font-semibold">{aiCount}</span>
              </div>
            )}
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v)} size="sm">
              <ToggleGroupItem value="table" aria-label="Table view">
                <LayoutList className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="reference" aria-label="Reference view">
                <BookOpen className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </>
        }
      />

      {view === "table" ? (
        <DataTable data={commandsData} columns={columns} searchPlaceholder="Search commands..." menuItems={[]} />
      ) : (
        <div className="grid gap-4">
          {commandEntries.map(([name, cmd]) => (
            <CommandCard key={name} name={name} cmd={cmd} />
          ))}
        </div>
      )}
    </>
  );
}
