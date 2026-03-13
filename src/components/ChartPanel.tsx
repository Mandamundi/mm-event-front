import React, { useMemo } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts';
import { assignColor } from '../utils/formatters';

export default function ChartPanel({ 
  data, 
  title, 
  showExcess, 
  setShowExcess, 
  hoveredEventId, 
  setHoveredEventId,
  pinnedEventId,
  setPinnedEventId,
  theme
}: any) {
  if (!data || !data.events) return null;

  const { events, aggregate, meta } = data;

  const chartData = useMemo(() => {
    const combined: any[] = [];
    aggregate.t_axis.forEach((t: number, i: number) => {
      const point: any = { t };
      point.median = aggregate.median[i];
      point.mean = aggregate.mean[i];
      point.p25 = aggregate.p25[i];
      point.p75 = aggregate.p75[i];
      point.band = [aggregate.p25[i], aggregate.p75[i]];

      events.forEach((e: any) => {
        if (!e.window_data) return;
        const r = e.window_data.returns.find((ret: any) => ret.t === t);
        if (r) {
          point[e.event_id] = r.pct_return;
          point[`${e.event_id}_date`] = r.date;
        }
      });
      combined.push(point);
    });
    return combined;
  }, [data]);

  const handleLineHover = (id: string | null) => {
    if (!pinnedEventId) setHoveredEventId(id);
  };

  const handleLineClick = (id: string) => {
    if (pinnedEventId === id) {
      setPinnedEventId(null);
      setHoveredEventId(null);
    } else {
      setPinnedEventId(id);
      setHoveredEventId(id);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Find the hovered event payload if any
      const hoveredPayload = payload.find((p: any) => p.dataKey === hoveredEventId);
      
      if (hoveredPayload) {
        const event = events.find((e: any) => e.event_id === hoveredEventId);
        const date = hoveredPayload.payload[`${hoveredEventId}_date`];
        return (
          <div className="bg-[var(--surface2)] border border-[var(--navy-border)] p-2 rounded-[3px] shadow-md text-[11px]">
            <div className="font-bold text-[var(--white)] mb-1">{event?.event_label}</div>
            <div className="text-[var(--muted)]">{date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</div>
            <div className="font-bold mt-1" style={{ color: hoveredPayload.color }}>
              {hoveredPayload.value > 0 ? '+' : ''}{hoveredPayload.value.toFixed(2)}%
            </div>
          </div>
        );
      }
      
      // Default tooltip for median/mean
      return (
        <div className="bg-[var(--surface2)] border border-[var(--navy-border)] p-2 rounded-[3px] shadow-md text-[11px]">
          <div className="font-bold text-[var(--white)] mb-1">Day {label > 0 ? `+${label}` : label}</div>
          {payload.map((p: any, i: number) => {
            if (p.dataKey === 'median' || p.dataKey === 'mean') {
              return (
                <div key={i} style={{ color: p.color }} className="flex justify-between gap-3">
                  <span>{p.name}:</span>
                  <span className="font-bold">{p.value > 0 ? '+' : ''}{p.value.toFixed(2)}%</span>
                </div>
              );
            }
            return null;
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[var(--surface2)] border border-[var(--navy-border)] rounded-[3px] pt-3.5 px-4 pb-2.5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--white-dim)]">{title}</span>
        {setShowExcess && (
          <div className="flex gap-0 border border-[var(--navy-border)] rounded-[3px] overflow-hidden">
            <button 
              className={`py-1 px-2.5 text-[10px] font-sans border-none cursor-pointer tracking-[0.04em] ${!showExcess ? 'bg-[var(--navy-light)] text-[var(--white)]' : 'bg-transparent text-[var(--muted)]'}`}
              onClick={() => setShowExcess(false)}
            >
              Raw Return
            </button>
            <button 
              className={`py-1 px-2.5 text-[10px] font-sans border-none cursor-pointer tracking-[0.04em] ${showExcess ? 'bg-[var(--navy-light)] text-[var(--white)]' : 'bg-transparent text-[var(--muted)]'}`}
              onClick={() => setShowExcess(true)}
            >
              Excess Return
            </button>
          </div>
        )}
      </div>

      <div className="relative w-full" style={{ height: 'calc(100% - 80px)', minHeight: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <CartesianGrid stroke="var(--navy-border)" vertical={false} />
            <XAxis 
              dataKey="t" 
              type="number" 
              domain={[-meta.pre_days, meta.post_days]} 
              ticks={aggregate.t_axis.filter((t: number) => t % (meta.pre_days + meta.post_days > 60 ? 10 : 5) === 0)}
              tick={{ fill: '#4a6578', fontSize: 9, fontFamily: 'Lato' }}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis 
              tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}%`} 
              tick={{ fill: '#4a6578', fontSize: 9, fontFamily: 'Lato' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--navy-border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            
            <ReferenceLine x={0} stroke="#2a4055" strokeDasharray="4 3" label={{ position: 'top', value: 'Event', fill: '#4a6578', fontSize: 9, fontFamily: 'Lato', dy: -10 }} />
            <ReferenceLine y={0} stroke="#2a4055" strokeWidth={1.5} />

            <Area type="monotone" dataKey="band" fill="var(--accent)" fillOpacity={0.12} stroke="none" isAnimationActive={false} />

            {events.map((e: any, i: number) => {
              if (!e.window_data) return null;
              const isHovered = hoveredEventId === e.event_id;
              const isDimmed = hoveredEventId && !isHovered;
              
              return (
                <Line
                  key={e.event_id}
                  type="monotone"
                  dataKey={e.event_id}
                  name={e.event_label}
                  stroke={isHovered ? assignColor(i) : '#cccccc'}
                  strokeWidth={isHovered ? 2.5 : 1}
                  strokeOpacity={isHovered ? 1 : (isDimmed ? 0.1 : 0.35)}
                  dot={false}
                  activeDot={isHovered ? { r: 4, fill: assignColor(i), stroke: 'var(--navy)', strokeWidth: 2 } : false}
                  isAnimationActive={false}
                  onMouseEnter={() => handleLineHover(e.event_id)}
                  onMouseLeave={() => handleLineHover(null)}
                  onClick={() => handleLineClick(e.event_id)}
                  style={{ cursor: 'pointer' }}
                />
              );
            })}

            <Line type="monotone" dataKey="median" name="Median" stroke={theme === 'light' ? '#000000' : '#ffffff'} strokeWidth={2.5} dot={false} activeDot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="mean" name="Mean" stroke="#666666" strokeWidth={2} strokeDasharray="5 3" dot={false} activeDot={false} isAnimationActive={false} />
            
            {/* Custom X Axis Label */}
            <text x="50%" y="255" textAnchor="middle" fill="#4a6578" fontSize="9" fontFamily="Lato">Trading Days Relative to Event</text>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 pt-2 border-t border-[var(--navy-border)]">
        <div className="flex items-center gap-1.5 text-[10px] font-normal text-[var(--muted)]">
          <div className="w-4 h-[2.5px] rounded-[1px]" style={{ background: theme === 'light' ? '#000000' : '#ffffff' }}></div> Median
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-normal text-[var(--muted)]">
          <div className="w-4 h-[2px] rounded-[1px] bg-[#555] border-t border-dashed border-[#666]"></div> Mean
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-normal text-[var(--muted)]">
          <div className="w-3.5 h-2 rounded-[1px] bg-[rgba(112,197,228,0.25)]"></div> P25–P75
        </div>
        
        {events.map((e: any, i: number) => {
          const isHovered = hoveredEventId === e.event_id;
          return (
            <div 
              key={e.event_id} 
              className="flex items-center gap-1.5 text-[10px] font-normal cursor-pointer transition-colors duration-150"
              style={{ color: isHovered ? assignColor(i) : 'var(--muted)' }}
              onMouseEnter={() => handleLineHover(e.event_id)}
              onMouseLeave={() => handleLineHover(null)}
              onClick={() => handleLineClick(e.event_id)}
            >
              <div 
                className="w-4 h-[2px] rounded-[1px] transition-colors duration-150" 
                style={{ background: isHovered ? assignColor(i) : '#ccc', opacity: isHovered ? 1 : 0.5 }}
              ></div> 
              {e.event_label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
