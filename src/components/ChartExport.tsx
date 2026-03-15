// src/components/ChartExport.tsx
// Drop this file into your components folder.
// Usage in ChartPanel.tsx:
//   import ChartExport from './ChartExport';
//   <ChartExport data={data} title="S&P 500 — US Govt Shutdowns" />

import React, { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReturnPoint {
  t: number;
  pct_return: number;
  date: string;
}

interface EventResult {
  event_id: string;
  event_label: string;
  event_date: string;
  window_data: {
    returns: ReturnPoint[];
    stats: Record<string, number | null>;
  } | null;
}

interface AggregateData {
  t_axis: number[];
  median: number[];
  mean: number[];
  p25: number[];
  p75: number[];
}

interface ChartData {
  ticker: string;
  events: EventResult[];
  aggregate: AggregateData;
  meta: { pre_days: number; post_days: number };
}

interface ChartExportProps {
  data: ChartData;
  title?: string;          // e.g. "S&P 500 — US Govt Shutdowns"
  subtitle?: string;       // e.g. "Event Study | Market Analytics"
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SIZES = [
  { label: '960 × 540  (16:9)', w: 960,  h: 540  },
  { label: '975 × 650  (3:2)',  w: 975,  h: 650  },
  { label: '800 × 800  (1:1)',  w: 800,  h: 800  },
] as const;

// Export palette — clean, distinct colours (Highcharts-inspired)
const EXPORT_PALETTE = [
  '#c00000', '#ff6600', '#c96753', '#dea359', '#186481',
  '#70c5e4', '#84c9b6', '#309f95', '#dbe386',
];

// ── Drawing helpers ───────────────────────────────────────────────────────────

function lerp(v: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  if (inMax === inMin) return (outMin + outMax) / 2;
  return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function drawChart(
  canvas: HTMLCanvasElement,
  data: ChartData,
  title: string,
  subtitle: string,
  w: number,
  h: number,
) {
  const ctx = canvas.getContext('2d')!;
  const dpr = 2; // 2× for retina-quality export
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width  = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.scale(dpr, dpr);

  const FONT = '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // ── Layout margins ──────────────────────────────────────────────────────────
  const marginTop    = 70;
  const marginBottom = 70;
  const marginLeft   = 68;
  const marginRight  = 24;
  const plotLeft   = marginLeft;
  const plotTop    = marginTop;
  const plotWidth  = w - marginLeft - marginRight;
  const plotHeight = h - marginTop - marginBottom;
  const plotRight  = plotLeft + plotWidth;
  const plotBottom = plotTop + plotHeight;

  // ── Collect all returns to determine y domain ───────────────────────────────
  const allReturns: number[] = [];
  const agg = data.aggregate;

  if (agg?.median) allReturns.push(...agg.median.filter(v => v != null));
  if (agg?.p25)    allReturns.push(...agg.p25.filter(v => v != null));
  if (agg?.p75)    allReturns.push(...agg.p75.filter(v => v != null));
  data.events.forEach(ev => {
    ev.window_data?.returns.forEach(r => allReturns.push(r.pct_return));
  });

  const yMin = Math.min(...allReturns) - 1;
  const yMax = Math.max(...allReturns) + 1;
  const xMin = -(data.meta?.pre_days ?? 30);
  const xMax =  (data.meta?.post_days ?? 60);

  const toX = (t: number)   => lerp(t, xMin, xMax, plotLeft,   plotRight);
  const toY = (v: number)   => lerp(v, yMin, yMax, plotBottom, plotTop);

  // ── Grid lines ──────────────────────────────────────────────────────────────
  ctx.strokeStyle = '#e6e6e6';
  ctx.lineWidth = 1;

  const yStep = pickNiceStep(yMax - yMin, 5);
  const yStart = Math.ceil(yMin / yStep) * yStep;
  for (let y = yStart; y <= yMax; y += yStep) {
    const py = toY(y);
    ctx.beginPath();
    ctx.moveTo(plotLeft, py);
    ctx.lineTo(plotRight, py);
    ctx.stroke();

    // y-axis labels
    ctx.fillStyle = '#666666';
    ctx.font = `450 13px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatPct(y), plotLeft - 8, py);
  }

  // ── x-axis line ─────────────────────────────────────────────────────────────
  ctx.strokeStyle = '#d8d8d8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(plotLeft, plotBottom);
  ctx.lineTo(plotRight, plotBottom);
  ctx.stroke();

  // ── x-axis ticks & labels ───────────────────────────────────────────────────
  const xStep = pickXStep(xMax - xMin);
  ctx.fillStyle = '#666666';
  ctx.font = `400 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let t = Math.ceil(xMin / xStep) * xStep; t <= xMax; t += xStep) {
    const px = toX(t);
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, plotBottom);
    ctx.lineTo(px, plotBottom + 5);
    ctx.stroke();
    ctx.fillText(t === 0 ? '0' : (t > 0 ? `+${t}` : `${t}`), px, plotBottom + 7);
  }

  // ── x-axis title ────────────────────────────────────────────────────────────
  ctx.fillStyle = '#666666';
  ctx.font = `400 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Trading Days Relative to Event', plotLeft + plotWidth / 2, h - 8);

  // ── y=0 reference line ──────────────────────────────────────────────────────
  const zeroY = toY(0);
  ctx.strokeStyle = '#aaaaaa';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(plotLeft, zeroY);
  ctx.lineTo(plotRight, zeroY);
  ctx.stroke();

  // ── Event T=0 vertical line ─────────────────────────────────────────────────
  const zeroX = toX(0);
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(zeroX, plotTop);
  ctx.lineTo(zeroX, plotBottom);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#aaaaaa';
  ctx.font = `400 11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Event', zeroX + 4, plotTop + 4);

  // ── P25–P75 band ────────────────────────────────────────────────────────────
  if (agg?.t_axis && agg.p25 && agg.p75) {
    ctx.beginPath();
    agg.t_axis.forEach((t, i) => {
      const px = toX(t);
      const py = toY(agg.p75[i]);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    for (let i = agg.t_axis.length - 1; i >= 0; i--) {
      ctx.lineTo(toX(agg.t_axis[i]), toY(agg.p25[i]));
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(112, 197, 228, 0.18)';
    ctx.fill();
  }

  // ── Individual event lines (faint) ──────────────────────────────────────────
  data.events.forEach((ev, idx) => {
    if (!ev.window_data?.returns?.length) return;
    const pts = ev.window_data.returns.filter(r => r.pct_return != null);
    if (!pts.length) return;
    ctx.strokeStyle = EXPORT_PALETTE[idx % EXPORT_PALETTE.length];
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.45;
    ctx.setLineDash([]);
    ctx.beginPath();
    pts.forEach((r, i) => {
      const px = toX(r.t);
      const py = toY(r.pct_return);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // ── Median line ──────────────────────────────────────────────────────────────
  if (agg?.t_axis && agg.median) {
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    agg.t_axis.forEach((t, i) => {
      if (agg.median[i] == null) return;
      const px = toX(t);
      const py = toY(agg.median[i]);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  // ── Mean line ────────────────────────────────────────────────────────────────
  if (agg?.t_axis && agg.mean) {
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 4]);
    ctx.beginPath();
    agg.t_axis.forEach((t, i) => {
      if (agg.mean[i] == null) return;
      const px = toX(t);
      const py = toY(agg.mean[i]);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── y-axis title ─────────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(14, plotTop + plotHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#666666';
  ctx.font = `400 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Percent (%)', 0, 0);
  ctx.restore();

  // ── Title ────────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#333333';
  ctx.font = `450 22px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(title, plotLeft, 12);

  // ── Subtitle ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#888888';
  ctx.font = `400 13px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(subtitle, plotRight, 14);

  // ── Legend ───────────────────────────────────────────────────────────────────
  const legendItems: Array<{ label: string; color: string; dash: boolean; alpha: number }> = [];

  // Individual events
  data.events.forEach((ev, idx) => {
    if (!ev.window_data) return;
    legendItems.push({
      label: ev.event_label,
      color: EXPORT_PALETTE[idx % EXPORT_PALETTE.length],
      dash: false,
      alpha: 0.7,
    });
  });

  // Aggregate lines
  legendItems.push({ label: 'Median', color: '#111111', dash: false, alpha: 1 });
  legendItems.push({ label: 'Mean',   color: '#666666', dash: true,  alpha: 1 });

  const legendY    = plotBottom + 38;
  const itemW      = Math.min(160, (w - marginLeft - marginRight) / legendItems.length);
  const totalW     = legendItems.length * itemW;
  const legendStartX = (w - totalW) / 2;

  ctx.font = `600 12px ${FONT}`;
  ctx.textBaseline = 'middle';

  legendItems.forEach((item, i) => {
    const lx = legendStartX + i * itemW;
    const ly = legendY;

    // Line swatch
    ctx.strokeStyle = item.color;
    ctx.lineWidth = item.alpha < 1 ? 2 : 2.5;
    ctx.globalAlpha = item.alpha;
    ctx.setLineDash(item.dash ? [5, 3] : []);
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + 20, ly);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Label
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, lx + 24, ly);
  });
}

// ── Utility functions ─────────────────────────────────────────────────────────

function pickNiceStep(range: number, targetTicks: number): number {
  const rough = range / targetTicks;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const candidates = [1, 2, 2.5, 5, 10].map(c => c * pow);
  return candidates.find(c => range / c <= targetTicks + 1) ?? candidates[candidates.length - 1];
}

function pickXStep(range: number): number {
  if (range <= 30)  return 5;
  if (range <= 60)  return 10;
  if (range <= 120) return 20;
  if (range <= 252) return 30;
  return 60;
}

function formatPct(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChartExport({ data, title = '', subtitle = 'Event Study | Market Analytics' }: ChartExportProps) {
  const [open, setOpen]         = useState(false);
  const [sizeIdx, setSizeIdx]   = useState(0);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);

    const { w, h } = SIZES[sizeIdx];
    const canvas = document.createElement('canvas');

    drawChart(canvas, data, title, subtitle, w, h);

    // Small delay so the browser can paint the loading state
    await new Promise(r => setTimeout(r, 50));

    const link = document.createElement('a');
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${safeTitle}_${w}x${h}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    setExporting(false);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Export chart as PNG"
        style={{
          background: 'transparent',
          border: '1px solid var(--navy-border)',
          color: 'var(--muted)',
          borderRadius: '3px',
          padding: '4px 9px',
          fontSize: '11px',
          fontFamily: 'Lato, sans-serif',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          letterSpacing: '0.04em',
          transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--white)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--navy-border)';
        }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M6 1v7M3 5.5L6 8l3-2.5M1 9.5V11h10V9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Export
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          background: 'var(--surface2)',
          border: '1px solid var(--navy-border)',
          borderRadius: '3px',
          padding: '12px 14px',
          zIndex: 100,
          minWidth: '200px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            marginBottom: '8px',
          }}>
            Export Size
          </div>

          {SIZES.map((size, i) => (
            <label
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 4px',
                cursor: 'pointer',
                borderRadius: '2px',
                fontSize: '11.5px',
                color: sizeIdx === i ? 'var(--white)' : 'var(--muted)',
                fontWeight: sizeIdx === i ? 700 : 400,
              }}
            >
              <input
                type="radio"
                name="export-size"
                checked={sizeIdx === i}
                onChange={() => setSizeIdx(i)}
                style={{ accentColor: 'var(--accent)', width: '12px', height: '12px' }}
              />
              {size.label}
            </label>
          ))}

          <div style={{
            fontSize: '9px',
            color: 'var(--muted)',
            fontStyle: 'italic',
            marginTop: '6px',
            marginBottom: '10px',
            paddingLeft: '2px',
          }}>
            Exports as PNG, white background
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              width: '100%',
              padding: '7px',
              background: exporting ? 'var(--navy-light)' : 'var(--accent)',
              color: exporting ? 'var(--muted)' : 'var(--navy)',
              border: 'none',
              borderRadius: '3px',
              fontFamily: 'Lato, sans-serif',
              fontSize: '11px',
              fontWeight: 700,
              cursor: exporting ? 'not-allowed' : 'pointer',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {exporting ? 'Generating…' : 'Download PNG'}
          </button>
        </div>
      )}
    </div>
  );
}
