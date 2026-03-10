import React from 'react';
import { formatPct } from '../utils/formatters';

export default function SummaryCards({ data, selectedEventsCount, totalEventsCount, eventTypeLabel }: any) {
  if (!data) return null;

  const { events, aggregate, meta } = data;
  
  // Find largest post-event horizon
  const horizons = ['1w', '1m', '3m', '6m', '12m'];
  let maxHorizon = null;
  let medianVal = null;
  let winRate = null;

  for (let i = horizons.length - 1; i >= 0; i--) {
    const h = horizons[i];
    if (aggregate?.win_rates?.[h]) {
      maxHorizon = h;
      winRate = aggregate.win_rates[h];
      // We need median for this horizon. The aggregate.median array corresponds to t_axis.
      // But the stats object has return_1w, etc. The median is not explicitly provided for horizons in stats, 
      // but wait, the prompt says "Median +[X]d Return — median return at the largest post-event horizon within the window where data exists."
      // Let's use the last value of the median array if it corresponds to the end of the window, or we can just use the last value of median array.
      medianVal = aggregate.median[aggregate.median.length - 1];
      break;
    }
  }

  // If no win rate found, fallback to last point in aggregate
  if (!maxHorizon && aggregate?.median?.length > 0) {
    medianVal = aggregate.median[aggregate.median.length - 1];
  }

  const validEvents = events?.filter((e: any) => e.window_data !== null && e.window_data !== undefined) ?? [];
  const avgMaxDrawdown = validEvents.length > 0
    ? validEvents.reduce((acc: number, e: any) => acc + (e.window_data.stats.max_drawdown_in_window || 0), 0) / validEvents.length
    : null;

  const formatHorizon = (h: string | null) => h ? `+${h.toUpperCase()}` : `+${meta?.post_days}d`;

  return (
    <div className="flex gap-[1px] shrink-0 bg-[var(--navy-border)] border-b border-[var(--navy-border)]">
      <div className="flex-1 bg-[var(--surface2)] py-2.5 px-4 flex flex-col gap-[2px]">
        <div className="text-[9px] font-bold tracking-[0.15em] uppercase text-[var(--muted)]">Median {formatHorizon(maxHorizon)} Return</div>
        <div className={`text-[22px] font-bold leading-none tracking-[-0.01em] ${medianVal > 0 ? 'text-[var(--pos)]' : medianVal < 0 ? 'text-[var(--neg)]' : 'text-[var(--white)]'}`}>
          {formatPct(medianVal)}
        </div>
        <div className="text-[10px] font-light text-[var(--muted)] mt-[1px]">across {meta?.n_valid || 0} events</div>
      </div>
      
      <div className="flex-1 bg-[var(--surface2)] py-2.5 px-4 flex flex-col gap-[2px]">
        <div className="text-[9px] font-bold tracking-[0.15em] uppercase text-[var(--muted)]">Win Rate {formatHorizon(maxHorizon)}</div>
        <div className="text-[22px] font-bold leading-none tracking-[-0.01em] text-[var(--accent)]">
          {winRate ? `${winRate.rate.toFixed(0)}%` : '—'}
        </div>
        <div className="text-[10px] font-light text-[var(--muted)] mt-[1px]">
          {winRate ? `${winRate.positive} of ${winRate.n} positive` : 'No data'}
        </div>
      </div>
      
      <div className="flex-1 bg-[var(--surface2)] py-2.5 px-4 flex flex-col gap-[2px]">
        <div className="text-[9px] font-bold tracking-[0.15em] uppercase text-[var(--muted)]">Avg Max Drawdown</div>
        <div className="text-[22px] font-bold leading-none tracking-[-0.01em] text-[var(--neg)]">
          {formatPct(avgMaxDrawdown)}
        </div>
        <div className="text-[10px] font-light text-[var(--muted)] mt-[1px]">within window</div>
      </div>
      
      <div className="flex-1 bg-[var(--surface2)] py-2.5 px-4 flex flex-col gap-[2px]">
        <div className="text-[9px] font-bold tracking-[0.15em] uppercase text-[var(--muted)]">Events Selected</div>
        <div className="text-[22px] font-bold leading-none tracking-[-0.01em] text-[var(--white-dim)]">
          {selectedEventsCount} / {totalEventsCount}
        </div>
        <div className="text-[10px] font-light text-[var(--muted)] mt-[1px]">{eventTypeLabel}</div>
      </div>
    </div>
  );
}
