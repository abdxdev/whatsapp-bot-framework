"use client";

import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { commonSettings, commonSettingsDef, builtinSettingsDef } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Terminal } from "lucide-react";

export default function CommonSettingsPage() {
  const commands = builtinSettingsDef?.commands ? Object.entries(builtinSettingsDef.commands) : [];

  return (
    <>
      <PageHeader title="Common Settings" description={commonSettingsDef.description} />

      <SettingsForm schema={commonSettingsDef.settings} values={commonSettings} title="General Settings" description="Global settings applied across all groups and services" exclude={["blackList"]} />

      {commands.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Built-in Commands
            </CardTitle>
            <CardDescription>Commands available in every group without installing a service</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {commands.map(([name, cmd]) => (
                <div key={name} className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {name}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{cmd.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
