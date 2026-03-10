import React from 'react';
import { formatPct, formatDate, formatDuration } from '../utils/formatters';

export default function DataTable({ data, hoveredEventId, setHoveredEventId, pinnedEventId, setPinnedEventId }: any) {
  if (!data || !data.events) return null;

  const { events, aggregate, meta } = data;

  const handleRowHover = (id: string | null) => {
    if (!pinnedEventId) setHoveredEventId(id);
  };

  const handleRowClick = (id: string) => {
    if (pinnedEventId === id) {
      setPinnedEventId(null);
      setHoveredEventId(null);
    } else {
      setPinnedEventId(id);
      setHoveredEventId(id);
    }
  };

  const getReturnAtT = (returns: any[], t: number) => {
    const r = returns.find((r: any) => r.t === t);
    return r ? r.pct_return : null;
  };

  const getMedianAtT = (t_axis: number[], median: number[], t: number) => {
    const idx = t_axis.indexOf(t);
    return idx !== -1 ? median[idx] : null;
  };

  const renderCell = (val: number | null, isOutside: boolean) => {
    if (isOutside || val === null || val === undefined) {
      return <span className="text-[var(--muted)]" title="Outside selected window">—</span>;
    }
    return <span className={val > 0 ? 'text-[var(--pos)]' : val < 0 ? 'text-[var(--neg)]' : 'text-[var(--white-dim)]'}>{formatPct(val)}</span>;
  };

  const renderWinRate = (horizon: string) => {
    const wr = aggregate.win_rates[horizon];
    if (!wr) return <span className="text-[var(--muted)]" title="Outside selected window">—</span>;
    return <span className="inline-block text-[10px] font-bold py-[1px] px-[5px] rounded-[2px] bg-[rgba(48,159,149,0.15)] text-[var(--pos)]">{wr.rate.toFixed(0)}%</span>;
  };

  // Find min/max for bolding
  const getMinMax = (arr: any[], getter: (e: any) => number | null) => {
    const vals = arr.map(getter).filter((v: any) => v !== null && v !== undefined) as number[];
    if (vals.length === 0) return { min: null, max: null };
    return { min: Math.min(...vals), max: Math.max(...vals) };
  };

  const validEvents = events.filter((e: any) => e.window_data !== null && e.window_data !== undefined);
  const mm10 = getMinMax(validEvents, e => getReturnAtT(e.window_data.returns, -10));
  const mm5  = getMinMax(validEvents, e => getReturnAtT(e.window_data.returns, -5));
  const mp5  = getMinMax(validEvents, e => getReturnAtT(e.window_data.returns, 5));
  const mp10 = getMinMax(validEvents, e => getReturnAtT(e.window_data.returns, 10));
  const mp1m = getMinMax(validEvents, e => e.window_data.stats.return_1m);
  const mp3m = getMinMax(validEvents, e => e.window_data.stats.return_3m);
  const mp6m = getMinMax(validEvents, e => e.window_data.stats.return_6m);
  const mdd  = getMinMax(validEvents, e => e.window_data.stats.max_drawdown_in_window);

  const renderDataCell = (val: number | null, isOutside: boolean, mm: { min: number | null, max: number | null }) => {
    if (isOutside || val === null || val === undefined) {
      return <span className="text-[var(--muted)]" title="Outside selected window">—</span>;
    }
    const isBold = val === mm.min || val === mm.max;
    return (
      <span className={`${val > 0 ? 'text-[var(--pos)]' : val < 0 ? 'text-[var(--neg)]' : 'text-[var(--white-dim)]'} ${isBold ? 'font-bold' : 'font-light'}`}>
        {formatPct(val)}
      </span>
    );
  };

  return (
    <div className="bg-[var(--surface2)] border border-[var(--navy-border)] rounded-[3px] overflow-hidden">
      <div className="flex items-center justify-between p-2.5 px-3.5 border-b border-[var(--navy-border)]">
        <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-[var(--muted)]">Performance by Event</span>
        <span className="text-[10px] text-[var(--muted)]">All values in trading days</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11.5px]">
          <thead>
            <tr>
              <th className="min-w-[160px] text-left pl-3.5 py-[7px] px-2.5 text-[9px] font-bold tracking-[0.1em] uppercase text-[var(--muted)] bg-[var(--surface2)] border-b border-[var(--navy-border)] whitespace-nowrap">Event</th>
              <th className="text-right py-[7px] px-2.5 text-[9px] font-bold tracking-[0.1em] uppercase text-[var(--muted)] bg-[var(--surface2)] border-b border-[var(--navy-border)] whitespace-nowrap">Dur.</th>
              <th className="text-right py-[7px] px-2.5 text-[9px] font-bold tracking-[0.1em] uppercase text-[var(--muted)] bg-[var(--surface2)] border-b border-[var(--navy-border)] whitespace-nowrap">−10D</th>
              <th className="text-right py-[7px] px-2.5 text-[9px] font-bold tracking-[0.1em] uppercase text-[var(--muted)] bg-[var(--surface2)] border-b border-[var(--navy-border)] whitespace-nowrap">−5D</th>
              <th className="text-right py-[7px] px-2.5 text-[9px] font-bold tracking-[0.1em] uppercase text-[var(--muted)] bg-[var(--surface2)] border-b border-[var(--navy-border)] whitespace-nowrap">+5D</th>
              <th className="text-right py-[7px] px-2.5 text-[9px] font-bold tracking-[0.1em] uppercase text-[var(--muted)] bg-[var(--surface2)] border-b border-[var(--navy-border)] whitespace-nowrap">+10D</th>
              <th className="text-right py-[7px] px-2.5 text-[9px] font-bold tracking-[0.1em] uppercase text-[var(--muted)] bg-[var(--surface2)] border-b border-[var(--navy-border)] whitespace-nowrap">+1M</th>
              <th className="text-right py-[7px] px-2.5 text-[9px] font-bold tracking-[0.1em] uppercase text-[var(--muted)] bg-[var(--surface2)] border-b border-[var(--navy-border)] whitespace-nowrap">+3M</th>
              <th className="text-right py-[7px] px-2.5 text-[9px] font-bold tracking-[0.1em] uppercase text-[var(--muted)] bg-[var(--surface2)] border-b border-[var(--navy-border)] whitespace-nowrap">+6M</th>
              <th className="text-right py-[7px] px-2.5 text-[9px] font-bold tracking-[0.1em] uppercase text-[var(--muted)] bg-[var(--surface2)] border-b border-[var(--navy-border)] whitespace-nowrap">Max DD</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[rgba(222,163,89,0.07)] font-bold border-b border-[rgba(31,51,71,0.6)]">
              <td className="text-left pl-3.5 py-[7px] px-2.5 whitespace-nowrap">
                <div className="text-[11.5px] text-[var(--gold)]">⭐ Median</div>
                <div className="text-[10px] font-light text-[var(--muted)] mt-[1px]">{meta.n_valid} events selected</div>
              </td>
              <td className="text-right py-[7px] px-2.5 text-[var(--muted)] whitespace-nowrap">—</td>
              <td className="text-right py-[7px] px-2.5 whitespace-nowrap">{renderCell(getMedianAtT(aggregate.t_axis, aggregate.median, -10), meta.pre_days < 10)}</td>
              <td className="text-right py-[7px] px-2.5 whitespace-nowrap">{renderCell(getMedianAtT(aggregate.t_axis, aggregate.median, -5), meta.pre_days < 5)}</td>
              <td className="text-right py-[7px] px-2.5 whitespace-nowrap">{renderCell(getMedianAtT(aggregate.t_axis, aggregate.median, 5), meta.post_days < 5)}</td>
              <td className="text-right py-[7px] px-2.5 whitespace-nowrap">{renderCell(getMedianAtT(aggregate.t_axis, aggregate.median, 10), meta.post_days < 10)}</td>
              <td className="text-right py-[7px] px-2.5 whitespace-nowrap">—</td>
              <td className="text-right py-[7px] px-2.5 whitespace-nowrap">—</td>
              <td className="text-right py-[7px] px-2.5 whitespace-nowrap">—</td>
              <td className="text-right py-[7px] px-2.5 whitespace-nowrap">—</td>
            </tr>
            <tr className="bg-[rgba(222,163,89,0.07)] font-bold border-b border-[rgba(31,51,71,0.6)]">
              <td className="text-left pl-3.5 py-[7px] px-2.5 whitespace-nowrap">
                <div className="text-[11.5px] text-[var(--accent)]">🎯 Win Rate</div>
                <div className="text-[10px] font-light text-[var(--muted)] mt-[1px]">% positive</div>
              </td>
              <td className="text-right py-[7px] px-2.5 text-[var(--muted)] whitespace-nowrap">—</td>
              <td className="text-right py-[7px] px-2.5 whitespace-nowrap"><span className="text-[var(--muted)]">—</span></td>
              <td className="text-right py-[7px] px-2.5 whitespace-nowrap"><span className="text-[var(--muted)]">—</span></td>
              <td className="text-right py-[7px] px-2.5 whitespace-nowrap"><span className="text-[var(--muted)]">—</span></td>
              <td className="text-right py-[7px] px-2.5 whitespace-nowrap"><span className="text-[var(--muted)]">—</span></td>
              <td className="text-right py-[7px] px-2.5 whitespace-nowrap">{renderWinRate('1m')}</td>
              <td className="text-right py-[7px] px-2.5 whitespace-nowrap">{renderWinRate('3m')}</td>
              <td className="text-right py-[7px] px-2.5 whitespace-nowrap">{renderWinRate('6m')}</td>
              <td className="text-right py-[7px] px-2.5 text-[var(--muted)] whitespace-nowrap">—</td>
            </tr>
            {events.map((e: any) => {
              if (!e.window_data) {
                return (
                  <tr key={e.event_id} className="border-b border-[rgba(31,51,71,0.6)] opacity-40">
                    <td className="text-left pl-3.5 py-[7px] px-2.5">
                      <div className="text-[11.5px] text-[var(--white)]">{e.event_label}</div>
                      <div className="text-[10px] font-light text-[var(--muted)]">No data available</div>
                    </td>
                    {[...Array(9)].map((_, i) => <td key={i} className="text-right py-[7px] px-2.5 text-[var(--muted)]">—</td>)}
                  </tr>
                );
              }
              const r10 = getReturnAtT(e.window_data.returns, -10);
              const r5 = getReturnAtT(e.window_data.returns, -5);
              const r5p = getReturnAtT(e.window_data.returns, 5);
              const r10p = getReturnAtT(e.window_data.returns, 10);
              const isHovered = hoveredEventId === e.event_id;
              
              return (
                <tr 
                  key={e.event_id}
                  className={`border-b border-[rgba(31,51,71,0.6)] transition-colors duration-100 cursor-pointer ${isHovered ? 'bg-[rgba(192,0,0,0.05)]' : 'hover:bg-[var(--accent-dim)]'}`}
                  onMouseEnter={() => handleRowHover(e.event_id)}
                  onMouseLeave={() => handleRowHover(null)}
                  onClick={() => handleRowClick(e.event_id)}
                >
                  <td className="text-left pl-3.5 py-[7px] px-2.5 font-normal whitespace-nowrap">
                    <div className="text-[11.5px] text-[var(--white)]">{e.event_label}</div>
                    <div className="text-[10px] font-light text-[var(--muted)] mt-[1px]">{formatDate(e.event_date)} &nbsp;·&nbsp; {formatDuration(e.event_meta.duration_days)}</div>
                  </td>
                  <td className="text-right py-[7px] px-2.5 font-light text-[var(--muted)] whitespace-nowrap">{formatDuration(e.event_meta.duration_days)}</td>
                  <td className="text-right py-[7px] px-2.5 whitespace-nowrap">{renderDataCell(r10, meta.pre_days < 10, mm10)}</td>
                  <td className="text-right py-[7px] px-2.5 whitespace-nowrap">{renderDataCell(r5, meta.pre_days < 5, mm5)}</td>
                  <td className="text-right py-[7px] px-2.5 whitespace-nowrap">{renderDataCell(r5p, meta.post_days < 5, mp5)}</td>
                  <td className="text-right py-[7px] px-2.5 whitespace-nowrap">{renderDataCell(r10p, meta.post_days < 10, mp10)}</td>
                  <td className="text-right py-[7px] px-2.5 whitespace-nowrap">{renderDataCell(e.window_data.stats.return_1m, meta.post_days < 21, mp1m)}</td>
                  <td className="text-right py-[7px] px-2.5 whitespace-nowrap">{renderDataCell(e.window_data.stats.return_3m, meta.post_days < 63, mp3m)}</td>
                  <td className="text-right py-[7px] px-2.5 whitespace-nowrap">{renderDataCell(e.window_data.stats.return_6m, meta.post_days < 126, mp6m)}</td>
                  <td className="text-right py-[7px] px-2.5 whitespace-nowrap">{renderDataCell(e.window_data.stats.max_drawdown_in_window, false, mdd)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
