"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DateDisplay } from "@/components/date-display";
import { MoreHorizontalIcon, Plus, CheckCircle2, PauseCircle, Search, Copy, Check, LayoutGrid, TableIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Shared cell renderers ────────────────────────────────────────────────────

function CopyableId({ id }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(String(id));
      setCopied(true);
      toast.success("ID copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <button onClick={handleCopy} className="group/copy inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
      <span className="font-mono">ID: {id}</span>
      {copied ? <Check className="h-3 w-3 text-green-600 dark:text-green-400" /> : <Copy className="h-3 w-3 opacity-0 group-hover/copy:opacity-100 transition-opacity" />}
    </button>
  );
}

function StatusBadge({ status }) {
  if (status === "active") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Active
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0">
      <PauseCircle className="mr-1 h-3 w-3" />
      Paused
    </Badge>
  );
}

// ── Built-in column types ────────────────────────────────────────────────────
//
// Each column definition:
// {
//   key:         string           – data field name
//   header:      string           – column header label
//   type:        string           – "primary" | "status" | "number" | "date" | "text" | "custom"
//   className?:  string           – extra classes on <TableHead> and <TableCell>
//   render?:     (value, row) => ReactNode   – custom renderer (for type="custom")
//   description?: string          – secondary field shown below primary name (key for the sub-field)
// }
//
// type shortcuts:
//   "primary"  → name link + description + copyable ID
//   "status"   → StatusBadge
//   "number"   → right-aligned, mono, toLocaleString
//   "date"     → DateDisplay with stopPropagation
//   "text"     → plain text

function PrimaryCell({ row, href, descriptionKey }) {
  return (
    <div>
      {href ? (
        <Link href={href} className="font-medium leading-none hover:underline" onClick={(e) => e.stopPropagation()}>
          {row.name}
        </Link>
      ) : (
        <span className="font-medium leading-none">{row.name}</span>
      )}
      {descriptionKey && row[descriptionKey] && <p className="text-xs text-muted-foreground mt-1">{row[descriptionKey]}</p>}
      <div className="mt-1">
        <CopyableId id={row.id} />
      </div>
    </div>
  );
}

function renderCell(col, row, href) {
  const value = row[col.key];

  switch (col.type) {
    case "primary":
      return <PrimaryCell row={row} href={href} descriptionKey={col.description} />;
    case "status":
      return <StatusBadge status={value} />;
    case "number":
      return <span className="font-mono text-sm">{Number(value).toLocaleString()}</span>;
    case "date":
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <DateDisplay date={value} />
        </div>
      );
    case "custom":
      return col.render ? col.render(value, row) : String(value ?? "");
    default: // "text"
      return String(value ?? "");
  }
}

function cellAlign(col) {
  if (col.type === "number") return "text-center";
  return col.className || "";
}

// ── Card renderer ────────────────────────────────────────────────────────────

function RowCard({ row, columns, href, menuItems, router }) {
  const primaryCol = columns.find((c) => c.type === "primary");
  const statusCol = columns.find((c) => c.type === "status");
  const otherCols = columns.filter((c) => c.type !== "primary" && c.type !== "status");

  return (
    <Card className={cn("transition-colors py-4 gap-3", href && "cursor-pointer hover:bg-muted/40")} onClick={href ? () => router.push(href) : undefined}>
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">
              {href ? (
                <Link href={href} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                  {row.name}
                </Link>
              ) : (
                <span>{row.name}</span>
              )}
            </CardTitle>
            {primaryCol?.description && row[primaryCol.description] && <CardDescription className="mt-1 text-xs">{row[primaryCol.description]}</CardDescription>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {statusCol && <StatusBadge status={row[statusCol.key]} />}
            {menuItems.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-7" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontalIcon className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menuItems.map((item, i) =>
                    item.separator ? (
                      <DropdownMenuSeparator key={i} />
                    ) : (
                      <DropdownMenuItem key={i} variant={item.variant} onClick={() => item.onClick?.(row)}>
                        {item.label}
                      </DropdownMenuItem>
                    ),
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <div className="mt-1">
          <CopyableId id={row.id} />
        </div>
      </CardHeader>
      {otherCols.length > 0 && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {otherCols.map((col) => (
              <div key={col.key} className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-xs">{col.header}:</span>
                <span className="text-xs">{renderCell(col, row, href)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {Array}  props.data           – array of row objects
 * @param {Array}  props.columns        – column definitions (see above)
 * @param {Function} props.getRowHref   – (row) => string – URL for row click / primary link
 * @param {string}  [props.searchPlaceholder] – placeholder for the search input
 * @param {string}  [props.searchKey]    – field to filter on (default: "name")
 * @param {string}  [props.addLabel]     – label for the add button (omit to hide)
 * @param {Function} [props.onAdd]       – callback when add button is clicked
 * @param {Array}   [props.menuItems]    – [{label, variant?, onClick(row)}] for the row action menu
 * @param {string}  [props.defaultView]  – "table" | "cards" (default: "table")
 */
export function DataTable({ data, columns, getRowHref, searchPlaceholder = "Search...", searchKey = "name", addLabel, onAdd, defaultView = "cards", menuItems = [{ label: "Edit" }, { label: "Duplicate" }, { separator: true }, { label: "Delete", variant: "destructive" }] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [view, setView] = useState(defaultView);

  const filtered = search
    ? data.filter((row) =>
        String(row[searchKey] ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : data;

  return (
    <>
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={searchPlaceholder} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => {
              if (v) setView(v);
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="cards" aria-label="Card view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table view">
              <TableIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          {addLabel && (
            <Button size="sm" className="w-fit" onClick={onAdd}>
              <Plus className="mr-1 h-4 w-4" />
              {addLabel}
            </Button>
          )}
        </div>
      </div>

      {/* ── View ────────────────────────────────────────────────────── */}
      {view === "cards" ? (
        filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No results found</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((row) => (
              <RowCard key={row.id} row={row} columns={columns} href={getRowHref ? getRowHref(row) : null} menuItems={menuItems} router={router} />
            ))}
          </div>
        )
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key} className={cn(cellAlign(col), "uppercase text-muted-foreground text-xs")}>
                    {col.header}
                  </TableHead>
                ))}
                {menuItems.length > 0 && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (menuItems.length > 0 ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                    No results found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => {
                  const href = getRowHref ? getRowHref(row) : null;
                  return (
                    <TableRow key={row.id} className={href ? "cursor-pointer" : ""} onClick={href ? () => router.push(href) : undefined}>
                      {columns.map((col) => (
                        <TableCell key={col.key} className={cellAlign(col)}>
                          {renderCell(col, row, href)}
                        </TableCell>
                      ))}
                      {menuItems.length > 0 && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontalIcon />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {menuItems.map((item, i) =>
                                item.separator ? (
                                  <DropdownMenuSeparator key={i} />
                                ) : (
                                  <DropdownMenuItem key={i} variant={item.variant} onClick={() => item.onClick?.(row)}>
                                    {item.label}
                                  </DropdownMenuItem>
                                ),
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}

export { StatusBadge, CopyableId };
