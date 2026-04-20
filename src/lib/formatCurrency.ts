/**
 * Format a number as a compact currency string with tenge sign.
 * Examples: 1_500_000 → "1.5M ₸", 500_000 → "500K ₸", 1200 → "1.2K ₸"
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';

  if (value >= 1_000_000_000) {
    const b = value / 1_000_000_000;
    return `${Number.isInteger(b) ? b : b.toFixed(1)}B ₸`;
  }
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M ₸`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}K ₸`;
  }

  return `${value} ₸`;
}
