export const NEWS_CATEGORIES = [
  { value: 'general', label: 'Общее' },
  { value: 'industry', label: 'Индустрия' },
  { value: 'standards', label: 'Стандарты' },
  { value: 'events', label: 'Мероприятия' },
  { value: 'partnership', label: 'Партнёрство' },
] as const;

export const adminInputStyle = {
  background: 'hsl(var(--secondary))',
  borderColor: 'hsl(var(--border))',
  color: 'hsl(var(--foreground))',
  colorScheme: 'dark',
} as const;

export const adminSelectContentStyle = {
  background: 'hsl(var(--muted))',
  borderColor: 'hsl(var(--border))',
  color: 'hsl(var(--foreground))',
} as const;

export const adminSelectItemClass =
  'text-foreground/80 focus:bg-foreground/10 focus:text-foreground' as const;

export const adminDropdownContentStyle = {
  background: 'hsl(var(--muted))',
  borderColor: 'hsl(var(--border))',
  color: 'hsl(var(--foreground))',
} as const;

export const adminDropdownItemClass =
  'text-foreground/70 focus:bg-foreground/10 focus:text-foreground' as const;
