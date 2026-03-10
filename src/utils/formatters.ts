export function formatPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  const sign = v > 0 ? '+' : v < 0 ? '−' : '';
  return `${sign}${Math.abs(v).toFixed(1)}%`;
}

export function formatDate(d: string): string {
  if (!d) return '';
  const date = new Date(d);
  const day = date.getUTCDate();
  const month = date.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

export function formatDuration(days: number | null | undefined): string {
  if (days === null || days === undefined) return '';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}m`;
  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  if (remainingMonths === 0) return `${years}y`;
  return `${years}y ${remainingMonths}m`;
}

const PALETTE = [
  'var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)',
  'var(--c6)', 'var(--c7)', 'var(--c8)', 'var(--c9)'
];

export function assignColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}
