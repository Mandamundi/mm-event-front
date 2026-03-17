// src/components/ChartExport.tsx
//
// Props:
//   data            — ChartData from API (already filtered by pre/post days)
//   assetLabel      — e.g. "S&P 500"
//   eventTypeLabel  — e.g. "Global Wars"
//   watermarkUrl    — URL or import path to your watermark PNG
//                     e.g. watermarkUrl="/watermark.png"  (put the PNG in /public)
//
// Usage in ChartPanel.tsx:
//   <ChartExport
//     data={data}
//     assetLabel={assetLabel}
//     eventTypeLabel={eventTypeLabel}
//     watermarkUrl="/watermark.png"
//   />

import React, { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReturnPoint  { t: number; pct_return: number; date: string; }
interface EventResult  {
  event_id: string; event_label: string; event_date: string;
  window_data: { returns: ReturnPoint[]; stats: Record<string, number | null>; } | null;
}
interface AggregateData {
  t_axis: number[]; median: number[]; mean: number[]; p25: number[]; p75: number[];
}
interface ChartData {
  ticker: string;
  events: EventResult[];
  aggregate: AggregateData;
  meta: { pre_days: number; post_days: number };
}
interface ChartExportProps {
  data: ChartData;
  assetLabel?: string;
  eventTypeLabel?: string;
  watermarkUrl?: string;   // path to watermark PNG, e.g. "/watermark.png"
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SIZES = [
  { label: '960 × 540  (16:9)', w: 960,  h: 540  },
  { label: '975 × 650  (3:2)',  w: 975,  h: 650  },
  { label: '800 × 800  (1:1)',  w: 800,  h: 800  },
] as const;

const FONT = 'Lato, -apple-system, system-ui, sans-serif';

const EXPORT_PALETTE = [
  // ── Original 20 (saturated, kept as-is) ──────────────────────────────────
  '#3BAFDA', '#E9573F', '#F6BB42', '#70CA63', '#926DDE',
  '#57C7D4', '#F44C87', '#BC94AC', '#184E74', '#D68C45',
  '#AA2906', '#17C3B2', '#6F2DBD', '#C1C286', '#026352',
  '#3B3F4F', '#F7AEF8', '#8093F1', '#94D2BD', '#EE9B00',
  // ── Extension — 20 more, distinct hues, away from black/grey ─────────────
  '#E040FB', // vivid purple-magenta
  '#00BCD4', // cyan
  '#FF7043', // deep orange
  '#66BB6A', // medium green
  '#EC407A', // pink-red
  '#AB47BC', // medium purple
  '#26A69A', // teal
  '#FFA726', // amber
  '#42A5F5', // blue
  '#D4E157', // lime
  '#EF5350', // red
  '#29B6F6', // light blue
  '#FF8F00', // dark amber
  '#9CCC65', // light green
  '#7E57C2', // medium violet
  '#26C6DA', // cyan-teal
  '#F06292', // light pink
  '#AED581', // yellow-green
  '#FF7FAB', // rose
  '#4DD0E1', // aqua
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function lerp(v: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  if (inMax === inMin) return (outMin + outMax) / 2;
  return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function formatPct(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

function pickNiceStep(range: number, targetTicks: number): number {
  const rough = range / targetTicks;
  const mag   = Math.pow(10, Math.floor(Math.log10(rough)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * mag >= rough) return m * mag;
  }
  return 10 * mag;
}

function pickXStep(range: number): number {
  if (range <= 30)  return 5;
  if (range <= 60)  return 10;
  if (range <= 120) return 20;
  if (range <= 252) return 30;
  return 60;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ── Grid-aligned legend layout ────────────────────────────────────────────────
// Mimics the MacroMicro style: fixed N-column grid, every cell equal width,
// rows centered as a group.

const SWATCH_W   = 24;
const SWATCH_GAP = 7;
const COL_PAD_R  = 24; // gap to the right of each cell
 
function buildLegendGrid(
  items: Array<{ label: string }>,
  availableWidth: number,
  ctx: CanvasRenderingContext2D,
  font: string,
) {
  ctx.font = font;
  const maxLabelW = Math.max(...items.map(it => ctx.measureText(it.label).width));
  const cellW     = SWATCH_W + SWATCH_GAP + maxLabelW + COL_PAD_R;
 
  // Max columns that fit; cap at 6; don't exceed item count
  let cols = Math.min(6, items.length, Math.max(1, Math.floor(availableWidth / cellW)));
 
  // Avoid a lonely single item on the last row — reduce cols by 1 if so
  if (cols > 1 && items.length % cols === 1) cols -= 1;
 
  const rows: Array<Array<{ label: string; index: number }>> = [];
  for (let i = 0; i < items.length; i += cols) {
    rows.push(items.slice(i, i + cols).map((it, j) => ({ label: it.label, index: i + j })));
  }
 
  // totalRowW is the pixel width of a full row (used to center each row)
  const totalRowW = (row: typeof rows[0]) => row.length * cellW - COL_PAD_R;
 
  return { rows, cellW, totalRowW, swatchW: SWATCH_W, swatchGap: SWATCH_GAP };
}

// ── Main draw ─────────────────────────────────────────────────────────────────

async function drawChart(
  canvas: HTMLCanvasElement,
  data: ChartData,
  assetLabel: string,
  eventTypeLabel: string,
  w: number,
  h: number,
  watermarkImg: HTMLImageElement | null,
) {
  const ctx = canvas.getContext('2d')!;
  const dpr = 2;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width  = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.scale(dpr, dpr);

  // ── Legend items ────────────────────────────────────────────────────────────
  const legendFontSize = Math.max(11, Math.round(w / 70));
  const legendFont     = `600 ${legendFontSize}px ${FONT}`;
  const legendRowH     = legendFontSize + 16;
 
  const legendItems: Array<{ label: string; color: string; dash: boolean; alpha: number }> = [];
  data.events.forEach((ev, i) => {
    if (!ev.window_data) return;
    legendItems.push({ label: ev.event_label, color: EXPORT_PALETTE[i % EXPORT_PALETTE.length], dash: false, alpha: 1 });
  });
  legendItems.push({ label: 'Median', color: '#111111', dash: false, alpha: 1 });
  legendItems.push({ label: 'Mean',   color: '#888888', dash: true,  alpha: 1 });
 
  const availW  = w - 48;
  const grid    = buildLegendGrid(legendItems, availW, ctx, legendFont);
  const legendH = grid.rows.length * legendRowH + 20;

  // ── Title block ─────────────────────────────────────────────────────────────
  const titleFontSize    = Math.round(w / 40);
  const subtitleFontSize = Math.round(w / 62);
  const titleBlockH      = titleFontSize + subtitleFontSize + 24;

  // ── Plot margins ─────────────────────────────────────────────────────────────
  // Extra left margin so y-axis label has room without crowding numbers
  const marginTop    = titleBlockH + 14;
  const marginBottom = legendH + 50;   // 50px for x-label + tick labels + gap
  const marginLeft   = 88;             // wider: room for rotated y-label + numbers
  const marginRight  = 24;

  const plotLeft   = marginLeft;
  const plotTop    = marginTop;
  const plotW      = w - marginLeft - marginRight;
  const plotH      = h - marginTop - marginBottom;
  const plotRight  = plotLeft + plotW;
  const plotBottom = plotTop + plotH;

  // ── White background ─────────────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // ── Centered title ───────────────────────────────────────────────────────────
  const title = `${assetLabel} Performance Across ${eventTypeLabel}`;
  ctx.fillStyle = '#333333';
  ctx.font = `450 ${titleFontSize}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(title, w / 2, 10);

  ctx.fillStyle = '#888888';
  ctx.font = `400 ${subtitleFontSize}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('MacroMicro.me | MacroMicro', w / 2, 10 + titleFontSize + 6);

  // ── Y domain — use TRUE min/max of all data ──────────────────────────────────
  const allVals: number[] = [];
  const agg = data.aggregate;
  (['median', 'mean', 'p25', 'p75'] as const).forEach(k => {
    agg?.[k]?.forEach((v: number) => { if (v != null) allVals.push(v); });
  });
  data.events.forEach(ev => {
    ev.window_data?.returns.forEach(r => { if (r.pct_return != null) allVals.push(r.pct_return); });
  });

  if (allVals.length === 0) return;

  const rawYMin = Math.min(...allVals);
  const rawYMax = Math.max(...allVals);
  const yPad    = Math.max(Math.abs(rawYMax - rawYMin) * 0.06, 0.5);

  // Snap to a nice step boundary so the axis doesn't start at an odd number
  const yStep  = pickNiceStep((rawYMax - rawYMin + yPad * 2), 6);
  const yMin   = Math.floor((rawYMin - yPad) / yStep) * yStep;
  const yMax   = Math.ceil ((rawYMax + yPad) / yStep) * yStep;
  const xMin   = -(data.meta?.pre_days  ?? 30);
  const xMax   =  (data.meta?.post_days ?? 60);

  const toX = (t: number) => lerp(t, xMin, xMax, plotLeft, plotRight);
  const toY = (v: number) => lerp(v, yMin, yMax, plotBottom, plotTop);

  // ── Horizontal grid lines + y labels ────────────────────────────────────────
  ctx.font = `400 13px ${FONT}`;

  for (let y = yMin; y <= yMax + 0.001; y += yStep) {
    const py = toY(y);

    ctx.strokeStyle = '#e6e6e6';
    ctx.lineWidth   = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(plotLeft, py);
    ctx.lineTo(plotRight, py);
    ctx.stroke();

    // Label — right-aligned, with generous gap from axis line
    ctx.fillStyle    = '#666666';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatPct(y), plotLeft - 12, py);
  }

  // ── x-axis baseline ──────────────────────────────────────────────────────────
  ctx.strokeStyle = '#d8d8d8';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(plotLeft, plotBottom);
  ctx.lineTo(plotRight, plotBottom);
  ctx.stroke();

  // ── x-axis ticks + labels ────────────────────────────────────────────────────
  const xStep = pickXStep(xMax - xMin);
  ctx.fillStyle    = '#666666';
  ctx.font         = `400 13px ${FONT}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';

  for (let t = Math.ceil(xMin / xStep) * xStep; t <= xMax; t += xStep) {
    const px = toX(t);
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(px, plotBottom);
    ctx.lineTo(px, plotBottom + 5);
    ctx.stroke();
    const label = t === 0 ? '0' : (t > 0 ? `+${t}` : `${t}`);
    ctx.fillStyle = '#666666';
    ctx.fillText(label, px, plotBottom + 8);  // 8px gap from tick to number
  }

  // x-axis title — extra gap below the tick labels
  ctx.fillStyle    = '#666666';
  ctx.font         = `400 13px ${FONT}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Trading Days Relative to Event', w / 2, plotBottom + 26);

  // ── y-axis title (rotated) ───────────────────────────────────────────────────
  // Positioned 16px from the left edge — well clear of the numbers
  ctx.save();
  ctx.translate(16, plotTop + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle    = '#666666';
  ctx.font         = `400 13px ${FONT}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Percent (%)', 0, 0);
  ctx.restore();

  // ── y=0 reference line ───────────────────────────────────────────────────────
  const zeroY = toY(0);
  ctx.strokeStyle = '#aaaaaa';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(plotLeft, zeroY);
  ctx.lineTo(plotRight, zeroY);
  ctx.stroke();

  // ── T=0 event vertical dashed line ──────────────────────────────────────────
  const zeroX = toX(0);
  ctx.strokeStyle = '#bbbbbb';
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

  // ── Watermark (centered on plot area, semi-transparent) ─────────────────────
  if (watermarkImg) {
    const maxWmW = plotW * 0.38;
    const maxWmH = plotH * 0.30;
    const scale  = Math.min(maxWmW / watermarkImg.naturalWidth, maxWmH / watermarkImg.naturalHeight);
    const wmW    = watermarkImg.naturalWidth  * scale;
    const wmH    = watermarkImg.naturalHeight * scale;
    const wmX = plotLeft + ((plotW / 2) - wmW) / 2;
    const wmY = plotTop  + ((plotH / 2) - wmH) / 2;
    ctx.globalAlpha = 0.20;  // 10% — very subtle, same as MacroMicro
    ctx.drawImage(watermarkImg, wmX, wmY, wmW, wmH);
    ctx.globalAlpha = 1;
  }

  // ── P25–P75 band ─────────────────────────────────────────────────────────────
  if (agg?.t_axis && agg.p25 && agg.p75) {
    ctx.beginPath();
    agg.t_axis.forEach((t, i) => {
      const px = toX(t); const py = toY(agg.p75[i]);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    for (let i = agg.t_axis.length - 1; i >= 0; i--) {
      ctx.lineTo(toX(agg.t_axis[i]), toY(agg.p25[i]));
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(112, 197, 228, 0.18)';
    ctx.fill();
  }

  // ── Individual event lines ───────────────────────────────────────────────────
  data.events.forEach((ev, idx) => {
    if (!ev.window_data?.returns?.length) return;
    const pts = ev.window_data.returns.filter(r => r.pct_return != null);
    if (!pts.length) return;
    ctx.strokeStyle  = EXPORT_PALETTE[idx % EXPORT_PALETTE.length];
    ctx.lineWidth    = 1.8;
    ctx.globalAlpha  = 0.55;
    ctx.setLineDash([]);
    ctx.beginPath();
    pts.forEach((r, i) => {
      const px = toX(r.t); const py = toY(r.pct_return);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // ── Median ───────────────────────────────────────────────────────────────────
  if (agg?.t_axis && agg.median) {
    ctx.strokeStyle = '#111111';
    ctx.lineWidth   = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    let started = false;
    agg.t_axis.forEach((t, i) => {
      if (agg.median[i] == null) return;
      const px = toX(t); const py = toY(agg.median[i]);
      if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  // ── Mean ─────────────────────────────────────────────────────────────────────
  if (agg?.t_axis && agg.mean) {
    ctx.strokeStyle = '#888888';
    ctx.lineWidth   = 2;
    ctx.setLineDash([7, 4]);
    ctx.beginPath();
    let started = false;
    agg.t_axis.forEach((t, i) => {
      if (agg.mean[i] == null) return;
      const px = toX(t); const py = toY(agg.mean[i]);
      if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Legend — fixed-width grid, rows centered ─────────────────────────────────
  // Top of legend block sits just below x-axis title
  const legendTopY = plotBottom + 50;

  grid.rows.forEach((row, rowIdx) => {
    // Centre this row as a whole unit
    const rowTotalW = row.length * grid.cellW - 28; // subtract trailing cellPadR
    const startX    = (w - rowTotalW) / 2;
    const rowY      = legendTopY + rowIdx * legendRowH + legendRowH / 2;

    row.forEach((cell, colIdx) => {
      const item = legendItems[cell.index];
      const lx   = startX + colIdx * grid.cellW;

      // Swatch line
      ctx.strokeStyle = item.color;
      ctx.lineWidth   = item.label === 'Median' ? 3 : 2;
      ctx.globalAlpha = item.alpha;
      ctx.setLineDash(item.dash ? [5, 3] : []);
      ctx.beginPath();
      ctx.moveTo(lx, rowY);
      ctx.lineTo(lx + grid.swatchW, rowY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Label
      ctx.fillStyle    = '#000000';
      ctx.font         = legendFont;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, lx + grid.swatchW + grid.swatchGap, rowY);
    });
  });
}

// ── React component ───────────────────────────────────────────────────────────

export default function ChartExport({
  data,
  assetLabel,
  eventTypeLabel,
  watermarkUrl,
}: ChartExportProps) {
  const [open, setOpen]           = useState(false);
  const [sizeIdx, setSizeIdx]     = useState(0);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);

    try {
      const { w, h } = SIZES[sizeIdx];
      const asset    = assetLabel    ?? data.ticker ?? 'Asset';
      const evType   = eventTypeLabel ?? 'Events';

      // Load watermark if provided
      let watermarkImg: HTMLImageElement | null = null;
      if (watermarkUrl) {
        try { watermarkImg = await loadImage(watermarkUrl); }
        catch { /* silently skip watermark if it fails to load */ }
      }

      const canvas = document.createElement('canvas');
      await drawChart(canvas, data, asset, evType, w, h, watermarkImg);

      // Small delay for browser to finish compositing
      await new Promise(r => setTimeout(r, 60));

      const safeTitle = `${asset}_${evType}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const link      = document.createElement('a');
      link.download   = `${safeTitle}_${w}x${h}.png`;
      link.href       = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setExporting(false);
      setOpen(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>

      {/* Trigger */}
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
          (e.currentTarget as HTMLButtonElement).style.color         = 'var(--white)';
          (e.currentTarget as HTMLButtonElement).style.borderColor   = 'var(--accent)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.color         = 'var(--muted)';
          (e.currentTarget as HTMLButtonElement).style.borderColor   = 'var(--navy-border)';
        }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M6 1v7M3 5.5L6 8l3-2.5M1 9.5V11h10V9.5"
                stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Export
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position:  'absolute',
          top:       'calc(100% + 6px)',
          right:     0,
          background:'var(--surface2)',
          border:    '1px solid var(--navy-border)',
          borderRadius: '3px',
          padding:   '12px 14px',
          zIndex:    100,
          minWidth:  '210px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            fontSize:'9px', fontWeight:700, letterSpacing:'0.16em',
            textTransform:'uppercase', color:'var(--muted)', marginBottom:'8px',
          }}>
            Export Size
          </div>

          {SIZES.map((size, i) => (
            <label key={i} style={{
              display:'flex', alignItems:'center', gap:'8px',
              padding:'5px 4px', cursor:'pointer', borderRadius:'2px',
              fontSize:'11.5px',
              color:      sizeIdx === i ? 'var(--white)' : 'var(--muted)',
              fontWeight: sizeIdx === i ? 700 : 400,
            }}>
              <input
                type="radio" name="export-size"
                checked={sizeIdx === i}
                onChange={() => setSizeIdx(i)}
                style={{ accentColor:'var(--accent)', width:'12px', height:'12px' }}
              />
              {size.label}
            </label>
          ))}

          <div style={{
            fontSize:'9px', color:'var(--muted)', fontStyle:'italic',
            marginTop:'6px', marginBottom:'10px', paddingLeft:'2px',
          }}>
            White background · MacroMicro style
          </div>

          {!watermarkUrl && (
            <div style={{
              fontSize:'9px', color:'var(--neg)', fontStyle:'italic',
              marginBottom:'8px', paddingLeft:'2px',
            }}>
              No watermark — set watermarkUrl prop to enable
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              width:'100%', padding:'7px',
              background: exporting ? 'var(--navy-light)' : 'var(--accent)',
              color:      exporting ? 'var(--muted)'      : 'var(--navy)',
              border:'none', borderRadius:'3px',
              fontFamily:'Lato, sans-serif', fontSize:'11px',
              fontWeight:700, cursor: exporting ? 'not-allowed' : 'pointer',
              letterSpacing:'0.06em', textTransform:'uppercase',
            }}
          >
            {exporting ? 'Generating…' : 'Download PNG'}
          </button>
        </div>
      )}
    </div>
  );
}