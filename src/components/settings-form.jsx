"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, RotateCcw, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ── Type-aware field renderer ───────────────────────────────────────────────

function SettingField({ settingKey, definition, value, onChange, depth = 0 }) {
  const type = definition.type;
  const desc = definition.description;
  const defaultVal = definition.default;

  // Status field — special case: always active/paused
  if (settingKey === "status") {
    return (
      <FieldWrapper label="Status" description={desc} depth={depth}>
        <Select value={value ?? defaultVal ?? "active"} onValueChange={(v) => onChange(v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </FieldWrapper>
    );
  }

  // Skip blackList — handled by dedicated page/section
  if (settingKey === "blackList") return null;

  // Object with properties → nested fieldset
  if (type === "object" && definition.properties && !definition.isList) {
    const objValue = typeof value === "object" && value !== null ? value : {};
    return (
      <fieldset className="space-y-3">
        <FieldWrapper label={formatLabel(settingKey)} description={desc} depth={depth} isGroup />
        <div className="pl-4 border-l-2 border-muted space-y-4">
          {Object.entries(definition.properties).map(([propKey, propDef]) => (
            <SettingField key={propKey} settingKey={propKey} definition={propDef} value={objValue[propKey]} onChange={(v) => onChange({ ...objValue, [propKey]: v })} depth={depth + 1} />
          ))}
        </div>
      </fieldset>
    );
  }

  // Nullable object reference (e.g. disableServicePrefix: Service | null)
  if (type === "Service" || type === "Command" || type === "Role") {
    return (
      <FieldWrapper label={formatLabel(settingKey)} description={desc} depth={depth}>
        <Input value={value ?? defaultVal ?? ""} onChange={(e) => onChange(e.target.value || null)} placeholder={`${type} identifier or empty for none`} className="max-w-sm" />
      </FieldWrapper>
    );
  }

  // Bool
  if (type === "bool" || type === "boolean") {
    return (
      <FieldWrapper label={formatLabel(settingKey)} description={desc} depth={depth}>
        <Select value={String(value ?? defaultVal ?? false)} onValueChange={(v) => onChange(v === "true")}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      </FieldWrapper>
    );
  }

  // Number types
  if (type === "int" || type === "float") {
    return (
      <FieldWrapper label={formatLabel(settingKey)} description={desc} depth={depth}>
        <Input type="number" step={type === "float" ? "0.1" : "1"} value={value ?? defaultVal ?? ""} onChange={(e) => onChange(type === "int" ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)} className="max-w-48" />
      </FieldWrapper>
    );
  }

  // Large text / multiline (explicit "text" type)
  if (type === "text") {
    return (
      <FieldWrapper label={formatLabel(settingKey)} description={desc} depth={depth}>
        <Textarea value={value ?? defaultVal ?? ""} onChange={(e) => onChange(e.target.value)} rows={4} className="max-w-lg" />
      </FieldWrapper>
    );
  }

  // Default string
  return (
    <FieldWrapper label={formatLabel(settingKey)} description={desc} depth={depth}>
      <Input value={value ?? defaultVal ?? ""} onChange={(e) => onChange(e.target.value)} className="max-w-sm" placeholder={defaultVal !== undefined ? `Default: ${defaultVal}` : ""} />
    </FieldWrapper>
  );
}

// ── Field wrapper ───────────────────────────────────────────────────────────

function FieldWrapper({ label, description, children, depth = 0, isGroup = false }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className={isGroup ? "text-sm font-semibold" : "text-sm font-medium"}>{label}</Label>
        {description && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs">{description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {!isGroup && children}
    </div>
  );
}

// ── Utilities ───────────────────────────────────────────────────────────────

function formatLabel(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

// ── Main settings form ──────────────────────────────────────────────────────

/**
 * Dynamic settings form driven by a schema definition.
 *
 * @param {Object}   props.schema   – settings schema from definition file (e.g. commonSettingsDef.settings)
 * @param {Object}   props.values   – current values (from db.state)
 * @param {string}   props.title    – card title
 * @param {string}   [props.description] – card description
 * @param {string[]} [props.exclude] – setting keys to exclude from rendering
 */
export function SettingsForm({ schema, values, title, description, exclude = [] }) {
  const [formValues, setFormValues] = useState(() => ({ ...values }));

  const filteredSettings = Object.entries(schema).filter(([key]) => !exclude.includes(key));

  const handleChange = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // In production, this would call an API
    toast.success("Settings saved successfully");
    console.log("Saving settings:", formValues);
  };

  const handleReset = () => {
    setFormValues({ ...values });
    toast.info("Settings reset to last saved values");
  };

  if (filteredSettings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No configurable settings available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-6">
        {filteredSettings.map(([key, def]) => (
          <SettingField key={key} settingKey={key} definition={def} value={formValues[key]} onChange={(v) => handleChange(key, v)} />
        ))}

        <Separator />

        <div className="flex items-center gap-2">
          <Button onClick={handleSave} size="sm">
            <Save className="mr-1.5 h-4 w-4" />
            Save Changes
          </Button>
          <Button variant="outline" onClick={handleReset} size="sm">
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export { SettingField, formatLabel };
