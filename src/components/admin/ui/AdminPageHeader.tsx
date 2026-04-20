interface AdminPageHeaderProps {
  title: string;
  badge?: { count: number; label: string };
  actions?: React.ReactNode;
}

export function AdminPageHeader({ title, badge, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {badge && (
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
            {badge.count} {badge.label}
          </span>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
