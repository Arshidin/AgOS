const variants = {
  success: 'bg-[var(--green-m)] text-[var(--green)]',
  warning: 'bg-[var(--amber-m)] text-[var(--amber)]',
  info: 'bg-[var(--blue-m)] text-[var(--blue)]',
  danger: 'bg-[var(--red-m)] text-[var(--red)]',
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
} as const;

type Variant = keyof typeof variants;

interface AdminStatusBadgeProps {
  variant: Variant;
  children: React.ReactNode;
  className?: string;
}

export function AdminStatusBadge({ variant, children, className = '' }: AdminStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
