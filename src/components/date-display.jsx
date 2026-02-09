"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function getRelativeTime(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffYear) > 0) return rtf.format(-diffYear, "year");
  if (Math.abs(diffMonth) > 0) return rtf.format(-diffMonth, "month");
  if (Math.abs(diffWeek) > 0) return rtf.format(-diffWeek, "week");
  if (Math.abs(diffDay) > 0) return rtf.format(-diffDay, "day");
  if (Math.abs(diffHour) > 0) return rtf.format(-diffHour, "hour");
  if (Math.abs(diffMin) > 0) return rtf.format(-diffMin, "minute");
  return rtf.format(-diffSec, "second");
}

function formatUTC(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  const month = d.toLocaleString("en", { month: "short", timeZone: "UTC" });
  return `${pad(d.getUTCDate())} ${month} ${String(d.getUTCFullYear()).slice(2)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function formatKarachi(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  const month = d.toLocaleString("en", { month: "short", timeZone: "Asia/Karachi" });
  const dateStr = d.toLocaleString("en-US", { timeZone: "Asia/Karachi" });
  const parts = new Date(dateStr);
  return `${pad(parts.getDate())} ${month} ${String(parts.getFullYear()).slice(2)} ${pad(parts.getHours())}:${pad(parts.getMinutes())}:${pad(parts.getSeconds())}`;
}

function DateItem({ label, value, copied, onCopy }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onCopy(value);
      }}
      className="group flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-muted-foreground mb-0.5">{label}</div>
        <div className="text-sm font-mono break-all">{value}</div>
      </div>
      <div className="shrink-0 mt-0.5">{copied ? <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}</div>
    </button>
  );
}

export function DateDisplay({ date, className }) {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const dateObj = new Date(date);

  const formats = [
    { label: "UTC", value: formatUTC(date) },
    { label: "Asia/Karachi", value: formatKarachi(date) },
    { label: "Relative", value: getRelativeTime(date) },
    { label: "Timestamp", value: dateObj.toISOString() },
  ];

  const handleCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success("Copied!");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn("text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer", className)}>
          {dateObj.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="space-y-1">
          {formats.map((format, index) => (
            <DateItem key={format.label} label={format.label} value={format.value} copied={copiedIndex === index} onCopy={(value) => handleCopy(value, index)} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
