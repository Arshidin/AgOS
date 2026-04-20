const variants = {
  success: 'bg-green-500/10 text-green-500',
  warning: 'bg-orange-500/10 text-orange-500',
  info: 'bg-blue-500/10 text-blue-500',
  danger: 'bg-red-500/10 text-red-500',
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
