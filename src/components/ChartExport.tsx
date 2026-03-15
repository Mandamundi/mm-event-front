// src/components/ChartExport.tsx
// Usage in ChartPanel.tsx:
//   import ChartExport from './ChartExport';
//   <ChartExport data={data} assetLabel="S&P 500" eventTypeLabel="US Government Shutdowns" />

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
  window_data: { returns: ReturnPoint[] } | null;
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
  assetLabel: string;       // e.g. "S&P 500"
  eventTypeLabel: string;   // e.g. "US Government Shutdowns"
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SIZES = [
  { label: '960 × 540  (16:9)', w: 960, h: 540 },
  { label: '975 × 650  (3:2)',  w: 975, h: 650 },
  { label: '800 × 800  (1:1)',  w: 800, h: 800 },
] as const;

const FONT = '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

// MacroMicro chart palette (from the JSON spec)
const MM_PALETTE = [
  '#3BAFDA', '#E9573F', '#F6BB42', '#70CA63', '#7D5B4F',
  '#3B3F4F', '#926DDE', '#57C7D4', '#F44C87', '#BC94AC',
  '#184E74', '#026352', '#C1C286', '#AA2906', '#A5FFD6',
  '#84DCC6', '#FF99AC', '#17C3B2', '#D68C45', '#6F2DBD',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function lerp(v: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  if (inMax === inMin) return (outMin + outMax) / 2;
  return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
}

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
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

// Measure text width on an offscreen canvas
function measureText(ctx: CanvasRenderingContext2D, text: string, font: string): number {
  ctx.save();
  ctx.font = font;
  const w = ctx.measureText(text).width;
  ctx.restore();
  return w;
}

// Wrap legend items into rows so they never overflow plotWidth
function buildLegendRows(
  ctx: CanvasRenderingContext2D,
  items: { label: string; color: string; dash: boolean }[],
  maxRowWidth: number,
  swatchW: number,
  gap: number,
  itemPad: number,
  font: string,
): { label: string; color: string; dash: boolean }[][] {
  const rows: { label: string; color: string; dash: boolean }[][] = [];
  let currentRow: { label: string; color: string; dash: boolean }[] = [];
  let currentWidth = 0;

  for (const item of items) {
    const textW = measureText(ctx, item.label, font);
    const itemW = swatchW + gap + textW + itemPad;
    if (currentRow.length > 0 && currentWidth + itemW > maxRowWidth) {
      rows.push(currentRow);
      currentRow = [item];
      currentWidth = itemW;
    } else {
      currentRow.push(item);
      currentWidth += itemW;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);
  return rows;
}

// ── Main draw function ────────────────────────────────────────────────────────

function drawChart(
  canvas: HTMLCanvasElement,
  data: ChartData,
  assetLabel: string,
  eventTypeLabel: string,
  w: number,
  h: number,
) {
  const ctx = canvas.getContext('2d')!;
  const dpr = 2;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width  = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.scale(dpr, dpr);

  const title    = `${assetLabel} Performance Across ${eventTypeLabel}`;
  const subtitle = 'MacroMicro.me | MacroMicro';

  // ── Measure legend rows first so we can size margins correctly ──────────────
  const legendItems: { label: string; color: string; dash: boolean }[] = [];
  data.events.forEach((ev, i) => {
    if (!ev.window_data) return;
    legendItems.push({ label: ev.event_label, color: MM_PALETTE[i % MM_PALETTE.length], dash: false });
  });
  legendItems.push({ label: 'Median', color: '#111111', dash: false });
  legendItems.push({ label: 'Mean',   color: '#888888', dash: true  });

  const LEGEND_FONT      = `600 12px ${FONT}`;
  const LEGEND_SWATCH_W  = 22;
  const LEGEND_SWATCH_GAP = 5;
  const LEGEND_ITEM_PAD  = 18;
  const LEGEND_ROW_H     = 22;

  // We need plotWidth to wrap legend — use estimated margins for now
  const estMarginLeft   = 64;
  const estMarginRight  = 24;
  const estPlotWidth    = w - estMarginLeft - estMarginRight;

  const legendRows = buildLegendRows(
    ctx, legendItems, estPlotWidth,
    LEGEND_SWATCH_W, LEGEND_SWATCH_GAP, LEGEND_ITEM_PAD, LEGEND_FONT,
  );

  // ── Dynamic margins based on legend height ──────────────────────────────────
  const TITLE_H      = 52;  // title + subtitle block
  const XAXIS_H      = 38;  // x tick labels + axis title
  const legendH      = legendRows.length * LEGEND_ROW_H + 8;

  const marginTop    = TITLE_H + 16;
  const marginBottom = XAXIS_H + legendH + 10;
  const marginLeft   = 64;
  const marginRight  = 24;

  const plotLeft   = marginLeft;
  const plotTop    = marginTop;
  const plotWidth  = w - marginLeft - marginRight;
  const plotHeight = h - marginTop - marginBottom;
  const plotRight  = plotLeft + plotWidth;
  const plotBottom = plotTop + plotHeight;

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // ── Title (centered) ────────────────────────────────────────────────────────
  ctx.fillStyle = '#333333';
  ctx.font = `450 24px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(title, w / 2, 14);

  // ── Subtitle (centered, below title) ────────────────────────────────────────
  ctx.fillStyle = '#666666';
  ctx.font = `400 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(subtitle, w / 2, 44);

  // ── Y domain ────────────────────────────────────────────────────────────────
  const allReturns: number[] = [];
  const agg = data.aggregate;
  if (agg?.p25) allReturns.push(...agg.p25.filter((v: number) => v != null));
  if (agg?.p75) allReturns.push(...agg.p75.filter((v: number) => v != null));
  data.events.forEach(ev => ev.window_data?.returns.forEach(r => allReturns.push(r.pct_return)));
  const yPad = (Math.max(...allReturns) - Math.min(...allReturns)) * 0.08;
  const yMin = Math.min(...allReturns) - yPad;
  const yMax = Math.max(...allReturns) + yPad;

  const xMin = -(data.meta?.pre_days  ?? 30);
  const xMax =  (data.meta?.post_days ?? 60);

  const toX = (t: number) => lerp(t, xMin, xMax, plotLeft,   plotRight);
  const toY = (v: number) => lerp(v, yMin, yMax, plotBottom, plotTop);

  // ── Y grid + labels ─────────────────────────────────────────────────────────
  const yStep  = pickNiceStep(yMax - yMin, 5);
  const yStart = Math.ceil(yMin / yStep) * yStep;

  for (let y = yStart; y <= yMax + 0.001; y = +(y + yStep).toFixed(8)) {
    const py = toY(y);
    ctx.strokeStyle = '#e6e6e6';
    ctx.lineWidth   = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(plotLeft,  py);
    ctx.lineTo(plotRight, py);
    ctx.stroke();

    ctx.fillStyle    = '#666666';
    ctx.font         = `450 13px ${FONT}`;
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatPct(y), plotLeft - 7, py);
  }

  // ── Y axis title (rotated) ───────────────────────────────────────────────────
  ctx.save();
  ctx.translate(13, plotTop + plotHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle    = '#666666';
  ctx.font         = `400 13px ${FONT}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Percent (%)', 0, 0);
  ctx.restore();

  // ── X axis line ─────────────────────────────────────────────────────────────
  ctx.strokeStyle = '#d8d8d8';
  ctx.lineWidth   = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(plotLeft,  plotBottom);
  ctx.lineTo(plotRight, plotBottom);
  ctx.stroke();

  // ── X ticks + labels ────────────────────────────────────────────────────────
  const xStep = pickXStep(xMax - xMin);
  ctx.fillStyle    = '#666666';
  ctx.font         = `400 13px ${FONT}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';

  for (let t = Math.ceil(xMin / xStep) * xStep; t <= xMax + 0.001; t = +(t + xStep).toFixed(8)) {
    const px = toX(t);
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(px, plotBottom);
    ctx.lineTo(px, plotBottom + 5);
    ctx.stroke();
    ctx.fillText(t === 0 ? '0' : (t > 0 ? `+${t}` : `${t}`), px, plotBottom + 7);
  }

  // ── X axis title ────────────────────────────────────────────────────────────
  ctx.fillStyle    = '#666666';
  ctx.font         = `400 13px ${FONT}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Trading Days Relative to Event', plotLeft + plotWidth / 2, plotBottom + 22);

  // ── y=0 reference line ──────────────────────────────────────────────────────
  const zeroY = toY(0);
  ctx.strokeStyle = '#bbbbbb';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(plotLeft,  zeroY);
  ctx.lineTo(plotRight, zeroY);
  ctx.stroke();

  // ── T=0 vertical dashed line ─────────────────────────────────────────────────
  const zeroX = toX(0);
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth   = 1;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(zeroX, plotTop);
  ctx.lineTo(zeroX, plotBottom);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle    = '#aaaaaa';
  ctx.font         = `400 11px ${FONT}`;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Event', zeroX + 4, plotTop + 4);

  // ── P25–P75 band ─────────────────────────────────────────────────────────────
  if (agg?.t_axis && agg.p25 && agg.p75) {
    ctx.beginPath();
    agg.t_axis.forEach((t: number, i: number) => {
      const px = toX(t);
      const py = toY(agg.p75[i]);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    for (let i = agg.t_axis.length - 1; i >= 0; i--) {
      ctx.lineTo(toX(agg.t_axis[i]), toY(agg.p25[i]));
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(59,175,218,0.14)'; // MM accent blue, light
    ctx.fill();
  }

  // ── Individual event lines ───────────────────────────────────────────────────
  data.events.forEach((ev, idx) => {
    if (!ev.window_data?.returns?.length) return;
    const pts = ev.window_data.returns.filter(r => r.pct_return != null);
    if (!pts.length) return;
    ctx.strokeStyle  = MM_PALETTE[idx % MM_PALETTE.length];
    ctx.lineWidth    = 2;        // lineWidth: 3 from spec, slightly thinner for individual
    ctx.globalAlpha  = 0.55;
    ctx.setLineDash([]);
    ctx.beginPath();
    pts.forEach((r, i) => {
      i === 0 ? ctx.moveTo(toX(r.t), toY(r.pct_return)) : ctx.lineTo(toX(r.t), toY(r.pct_return));
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // ── Median line ──────────────────────────────────────────────────────────────
  if (agg?.t_axis && agg.median) {
    ctx.strokeStyle  = '#111111';
    ctx.lineWidth    = 3;
    ctx.globalAlpha  = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    agg.t_axis.forEach((t: number, i: number) => {
      if (agg.median[i] == null) return;
      i === 0 ? ctx.moveTo(toX(t), toY(agg.median[i])) : ctx.lineTo(toX(t), toY(agg.median[i]));
    });
    ctx.stroke();
  }

  // ── Mean line ────────────────────────────────────────────────────────────────
  if (agg?.t_axis && agg.mean) {
    ctx.strokeStyle  = '#888888';
    ctx.lineWidth    = 2.5;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    agg.t_axis.forEach((t: number, i: number) => {
      if (agg.mean[i] == null) return;
      i === 0 ? ctx.moveTo(toX(t), toY(agg.mean[i])) : ctx.lineTo(toX(t), toY(agg.mean[i]));
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Legend (multi-row, centered) ─────────────────────────────────────────────
  // Re-build rows with final plotWidth
  const finalRows = buildLegendRows(
    ctx, legendItems, plotWidth,
    LEGEND_SWATCH_W, LEGEND_SWATCH_GAP, LEGEND_ITEM_PAD, LEGEND_FONT,
  );

  const legendBlockH   = finalRows.length * LEGEND_ROW_H;
  const legendStartY   = plotBottom + XAXIS_H + (legendH - legendBlockH) / 2;

  ctx.font         = LEGEND_FONT;
  ctx.textBaseline = 'middle';

  finalRows.forEach((row, rowIdx) => {
    // Measure total row width for centering
    const rowW = row.reduce((acc, item) => {
      return acc + LEGEND_SWATCH_W + LEGEND_SWATCH_GAP + measureText(ctx, item.label, LEGEND_FONT) + LEGEND_ITEM_PAD;
    }, 0) - LEGEND_ITEM_PAD; // remove trailing pad

    let lx = (w - rowW) / 2;
    const ly = legendStartY + rowIdx * LEGEND_ROW_H + LEGEND_ROW_H / 2;

    row.forEach(item => {
      const textW = measureText(ctx, item.label, LEGEND_FONT);

      // Swatch line
      ctx.strokeStyle = item.color;
      ctx.lineWidth   = 3;
      ctx.globalAlpha = 1;
      ctx.setLineDash(item.dash ? [6, 4] : []);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + LEGEND_SWATCH_W, ly);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle    = '#000000';
      ctx.textAlign    = 'left';
      ctx.fillText(item.label, lx + LEGEND_SWATCH_W + LEGEND_SWATCH_GAP, ly);

      lx += LEGEND_SWATCH_W + LEGEND_SWATCH_GAP + textW + LEGEND_ITEM_PAD;
    });
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChartExport({ data, assetLabel, eventTypeLabel }: ChartExportProps) {
  const [open, setOpen]           = useState(false);
  const [sizeIdx, setSizeIdx]     = useState(0);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);

    const { w, h } = SIZES[sizeIdx];
    const canvas   = document.createElement('canvas');
    drawChart(canvas, data, assetLabel, eventTypeLabel, w, h);

    await new Promise(r => setTimeout(r, 50));

    const link      = document.createElement('a');
    const safeTitle = `${assetLabel}_${eventTypeLabel}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download   = `${safeTitle}_${w}x${h}.png`;
    link.href       = canvas.toDataURL('image/png');
    link.click();

    setExporting(false);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
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
          minWidth: '210px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px',
          }}>
            Export Size
          </div>

          {SIZES.map((size, i) => (
            <label key={i} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '5px 4px', cursor: 'pointer', borderRadius: '2px',
              fontSize: '11.5px',
              color: sizeIdx === i ? 'var(--white)' : 'var(--muted)',
              fontWeight: sizeIdx === i ? 700 : 400,
            }}>
              <input
                type="radio" name="export-size"
                checked={sizeIdx === i} onChange={() => setSizeIdx(i)}
                style={{ accentColor: 'var(--accent)', width: '12px', height: '12px' }}
              />
              {size.label}
            </label>
          ))}

          <div style={{
            fontSize: '9px', color: 'var(--muted)', fontStyle: 'italic',
            marginTop: '6px', marginBottom: '10px', paddingLeft: '2px',
          }}>
            White background, MacroMicro style
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              width: '100%', padding: '7px',
              background: exporting ? 'var(--navy-light)' : 'var(--accent)',
              color: exporting ? 'var(--muted)' : 'var(--navy)',
              border: 'none', borderRadius: '3px',
              fontFamily: 'Lato, sans-serif', fontSize: '11px', fontWeight: 700,
              cursor: exporting ? 'not-allowed' : 'pointer',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}
          >
            {exporting ? 'Generating…' : 'Download PNG'}
          </button>
        </div>
      )}
    </div>
  );
}
