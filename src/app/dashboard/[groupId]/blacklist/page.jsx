"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getGroup, formatUserId } from "@/lib/data";
import { ArrowLeft, Plus, ShieldBan, Trash2 } from "lucide-react";

export default function GroupBlacklistPage() {
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

  const blackList = group.groupSettings?.blackList || [];

  return (
    <>
      <PageHeader
        title="Blacklist"
        description={`Blacklisted users in ${group.name}`}
        actions={
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Entry
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldBan className="h-5 w-5" />
            Group Blacklist
          </CardTitle>
          <CardDescription>Users blacklisted from this group&apos;s services and commands</CardDescription>
        </CardHeader>
        <CardContent>
          {blackList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShieldBan className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No blacklisted users in this group</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Commands</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {blackList.map((entry, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">{formatUserId(entry.userId)}</TableCell>
                    <TableCell>
                      {(entry.services || []).map((s, i) => (
                        <Badge key={i} variant="secondary" className="mr-1 mb-1 text-xs">
                          {s === "*" ? "All Services" : s}
                        </Badge>
                      ))}
                    </TableCell>
                    <TableCell>
                      {(entry.commands || []).map((c, i) => (
                        <Badge key={i} variant="secondary" className="mr-1 mb-1 text-xs">
                          {c === "*" ? "All Commands" : c}
                        </Badge>
                      ))}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
