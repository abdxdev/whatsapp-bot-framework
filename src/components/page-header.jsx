"use client";

export function PageHeader({ title, description, actions, stats }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {stats && (
        <div className="flex items-center gap-6 text-sm divide-x divide-border">
          {stats}
        </div>
      )}
    </div>
  );
}
