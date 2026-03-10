import React from 'react';
import { formatDuration } from '../utils/formatters';

export default function Sidebar({
  eventTypes,
  selectedTypeId,
  setSelectedTypeId,
  phase,
  setPhase,
  selectedEventIds,
  setSelectedEventIds
}: any) {
  const selectedType = eventTypes.find((t: any) => t.id === selectedTypeId);

  const handleSelectAll = () => {
    if (!selectedType) return;
    const validEvents = phase === 'end' 
      ? selectedType.events.filter((e: any) => e.end_date)
      : selectedType.events;
    setSelectedEventIds(validEvents.map((e: any) => e.id));
  };

  const handleDeselectAll = () => {
    setSelectedEventIds([]);
  };

  const toggleEvent = (id: string, disabled: boolean) => {
    if (disabled) return;
    if (selectedEventIds.includes(id)) {
      setSelectedEventIds(selectedEventIds.filter((eId: string) => eId !== id));
    } else {
      setSelectedEventIds([...selectedEventIds, id]);
    }
  };

  return (
    <aside className="w-[260px] min-w-[260px] bg-[var(--surface2)] border-r border-[var(--navy-border)] flex flex-col overflow-hidden">
      <div className="p-5 pb-4 border-b border-[var(--navy-border)] flex items-center gap-2.5">
        <svg className="w-7 h-7 shrink-0" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="2" y1="20" x2="26" y2="20" stroke="#1f3347" strokeWidth="1.5"/>
          <line x1="8"  y1="20" x2="8"  y2="8"  stroke="#70c5e4" strokeWidth="1.5"/>
          <line x1="14" y1="20" x2="14" y2="12" stroke="#70c5e4" strokeWidth="1.5"/>
          <line x1="20" y1="20" x2="20" y2="6"  stroke="#70c5e4" strokeWidth="1.5"/>
          <circle cx="8"  cy="8"  r="2.5" fill="#70c5e4"/>
          <circle cx="14" cy="12" r="2"   fill="#70c5e4" opacity="0.7"/>
          <circle cx="20" cy="6"  r="2.5" fill="#c00000"/>
        </svg>
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-[0.14em] text-[var(--white)] uppercase">Event Study</span>
          <span className="text-[9px] font-light tracking-[0.2em] text-[var(--muted)] uppercase mt-[3px]">Market Analytics</span>
        </div>
      </div>

      <div className="p-3.5 px-4 pb-2.5 border-b border-[var(--navy-border)]">
        <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-[var(--muted)] mb-2">Event Type</div>
        <select 
          className="w-full bg-[var(--navy-light)] border border-[var(--navy-border)] text-[var(--white)] font-sans text-xs font-normal py-[7px] px-2.5 rounded-[3px] cursor-pointer appearance-none bg-no-repeat bg-right-2.5"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\'%3E%3Cpath d=\'M0 0l5 6 5-6z\' fill=\'%237a94a8\'/%3E%3C/svg%3E")', backgroundPosition: 'right 10px center' }}
          value={selectedTypeId || ''}
          onChange={(e) => setSelectedTypeId(e.target.value)}
        >
          {eventTypes.map((t: any) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        
        {selectedType?.has_phases && (
          <div className="flex gap-0 mt-2 border border-[var(--navy-border)] rounded-[3px] overflow-hidden">
            <button 
              className={`flex-1 py-1.5 px-2 font-sans text-[11px] bg-transparent border-none cursor-pointer tracking-[0.04em] transition-all duration-150 ${phase === 'start' ? 'bg-[var(--accent)] text-[var(--navy)] font-bold' : 'text-[var(--muted)] font-normal'}`}
              onClick={() => setPhase('start')}
            >
              ▶ {selectedType.phase_labels?.start || 'Start'}
            </button>
            <button 
              className={`flex-1 py-1.5 px-2 font-sans text-[11px] bg-transparent border-none cursor-pointer tracking-[0.04em] transition-all duration-150 ${phase === 'end' ? 'bg-[var(--accent)] text-[var(--navy)] font-bold' : 'text-[var(--muted)] font-normal'}`}
              onClick={() => setPhase('end')}
            >
              ◀ {selectedType.phase_labels?.end || 'End'}
            </button>
          </div>
        )}
      </div>

      <div className="p-3.5 px-4 pb-2.5 flex-1 overflow-y-auto">
        <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-[var(--muted)] mb-2">Select Events</div>
        <div className="flex justify-between mb-1.5 px-0.5">
          <span className="text-[10px] text-[var(--accent)] cursor-pointer tracking-[0.04em]" onClick={handleSelectAll}>Select all</span>
          <span className="text-[10px] text-[var(--accent)] cursor-pointer tracking-[0.04em]" onClick={handleDeselectAll}>Deselect all</span>
        </div>
        <div className="flex flex-col gap-[1px] mt-1.5">
          {selectedType?.events.map((e: any) => {
            const disabled = phase === 'end' && !e.end_date;
            const checked = selectedEventIds.includes(e.id);
            const dateStr = phase === 'start' ? e.start_date : (e.end_date || e.start_date);
            const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
            
            let durationStr = '';
            if (e.start_date && e.end_date) {
              const diffTime = Math.abs(new Date(e.end_date).getTime() - new Date(e.start_date).getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              durationStr = formatDuration(diffDays);
            }

            return (
              <div 
                key={e.id} 
                className={`flex items-center gap-2 py-[5px] px-1.5 rounded-[3px] cursor-pointer transition-colors duration-100 ${checked ? 'bg-[var(--accent-dim)]' : 'hover:bg-[var(--navy-light)]'} ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                onClick={() => toggleEvent(e.id, disabled)}
                title={disabled ? 'No end date available' : e.notes}
              >
                <input 
                  type="checkbox" 
                  checked={checked} 
                  onChange={() => {}} 
                  className="w-3 h-3 shrink-0 accent-[var(--accent)]"
                  disabled={disabled}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[11.5px] font-normal text-[var(--white)] whitespace-nowrap overflow-hidden text-ellipsis">{e.label}</div>
                  <div className="text-[10px] font-light text-[var(--muted)] mt-[1px]">{formattedDate}</div>
                </div>
                {durationStr && (
                  <span className="text-[9px] font-bold text-[var(--gold)] bg-[rgba(222,163,89,0.12)] py-[2px] px-[5px] rounded-[2px] whitespace-nowrap shrink-0">
                    {durationStr}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
