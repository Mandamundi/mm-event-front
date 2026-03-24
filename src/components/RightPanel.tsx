import React, { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import CSVUploadModal from './CSVUploadModal';
import AssetSearch from './AssetSearch';

export default function RightPanel({
  assets,
  groupedAssets,
  primaryTicker,
  setPrimaryTicker,
  secondaryTicker,
  setSecondaryTicker,
  benchmarkTicker,
  setBenchmarkTicker,
  showExcess,
  setShowExcess,
  preDays,
  setPreDays,
  postDays,
  setPostDays,
  theme,
  setTheme,
  selectedEventIds,
  eventTypes,
  selectedTypeId,
  onUploadSuccess,
  hoveredEventId,
  setHoveredEventId,
  pinnedEventId,
  setPinnedEventId,
}: any) {
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [localPreDays, setLocalPreDays] = useState(preDays);
  const [localPostDays, setLocalPostDays] = useState(postDays);

  useEffect(() => {
    setLocalPreDays(preDays);
    setLocalPostDays(postDays);
  }, [preDays, postDays]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'pre' | 'post') => {
    const val = parseInt(e.target.value, 10);
    if (type === 'pre') setLocalPreDays(val);
    else setLocalPostDays(val);
  };

  const handleSliderRelease = () => {
    setPreDays(localPreDays);
    setPostDays(localPostDays);
  };

  const selectedType = eventTypes.find((t: any) => t.id === selectedTypeId);
  const selectedEvents = selectedType?.events.filter((e: any) => selectedEventIds.includes(e.id)) || [];

  return (
    <aside className="w-[240px] min-w-[240px] bg-[var(--surface2)] border-l border-[var(--navy-border)] flex flex-col overflow-y-auto">

      {/* ── Primary Asset ─────────────────────────────────── */}
      <div className="p-3.5 px-4 border-b border-[var(--navy-border)]">
        <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-[var(--muted)] mb-2">Primary Asset</div>

        <AssetSearch
          assets={assets}
          value={primaryTicker}
          onChange={setPrimaryTicker}
          badge="A1"
        />

        {!secondaryTicker ? (
          <button
            className="flex items-center gap-1.5 mt-2 text-[11px] text-[var(--accent)] cursor-pointer bg-transparent border-none font-sans p-0 tracking-[0.04em]"
            onClick={() => setSecondaryTicker(assets[0]?.ticker || '')}
          >
            ＋ Add comparison asset
          </button>
        ) : (
          <div className="mt-3">
            <div className="relative">
              <AssetSearch
                assets={assets}
                value={secondaryTicker}
                onChange={setSecondaryTicker}
                badge="A2"
              />
              {/* × sits outside AssetSearch so it doesn't interfere with the dropdown */}
              <button
                className="absolute right-2 top-[9px] text-[var(--muted)] hover:text-[var(--white)] bg-transparent border-none cursor-pointer z-20 leading-none"
                onMouseDown={() => setSecondaryTicker(null)}
              >
                ×
              </button>
            </div>
            <div className="text-[9px] text-[var(--muted)] italic mt-[3px] pl-0.5">
              A second asset adds a second chart panel. Use × to remove it.
            </div>
          </div>
        )}

        <div
          className="text-[10px] text-[var(--muted)] cursor-pointer flex items-center gap-1 mt-2.5 tracking-[0.04em] transition-colors duration-150 hover:text-[var(--accent)]"
          onClick={() => setIsCSVModalOpen(true)}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <path d="M6 1v7M3 4l3-3 3 3M1 9v1.5a.5.5 0 00.5.5h9a.5.5 0 00.5-.5V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Upload custom price data (CSV)
        </div>
      </div>

      {/* ── Benchmark ─────────────────────────────────────── */}
      <div className="p-3.5 px-4 border-b border-[var(--navy-border)]">
        <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-[var(--muted)] mb-2">Benchmark</div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11.5px] font-normal text-[var(--white-dim)] flex items-center gap-1">
            Excess return (alpha)
            <span
              title="Excess return shows performance relative to a benchmark. A value of +3% means the asset outperformed the benchmark by 3 percentage points over that period."
              className="cursor-help text-[var(--muted)] hover:text-[var(--accent)] transition-colors text-[10px]"
            >ⓘ</span>
          </span>
          <div
            className={`w-8 h-[17px] rounded-[10px] relative cursor-pointer shrink-0 transition-colors duration-150 ${showExcess ? 'bg-[var(--accent)]' : 'bg-[var(--navy-border)]'}`}
            onClick={() => setShowExcess(!showExcess)}
          >
            <div className={`absolute w-[13px] h-[13px] bg-white rounded-full top-[2px] transition-all duration-150 ${showExcess ? 'left-[17px]' : 'left-[2px]'}`}></div>
          </div>
        </div>
        <div className="text-[10px] text-[var(--muted)] italic">Toggle to compare vs a benchmark</div>

        {showExcess && (
          <div className="mt-2">
            <AssetSearch
              assets={assets}
              value={benchmarkTicker || ''}
              onChange={setBenchmarkTicker}
            />
          </div>
        )}
      </div>

      {/* ── Analysis Window ───────────────────────────────── */}
      <div className="p-3.5 px-4 border-b border-[var(--navy-border)]">
        <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-[var(--muted)] mb-2">Analysis Window</div>
        <div className="flex justify-between mb-1.5">
          <span className="text-[11px] font-bold text-[var(--accent)]">−{localPreDays}d</span>
          <span className="text-[10px] font-light text-[var(--muted)]">← Event →</span>
          <span className="text-[11px] font-bold text-[var(--accent)]">+{localPostDays}d</span>
        </div>
        <div className="relative h-5 flex items-center">
          <div className="absolute w-full h-[3px] bg-[var(--navy-border)] rounded-[2px]"></div>
          <div
            className="absolute h-[3px] bg-[var(--accent)] rounded-[2px]"
            style={{ left: `${50 - (localPreDays / 120) * 50}%`, right: `${50 - (localPostDays / 120) * 50}%` }}
          ></div>
          <input
            type="range"
            min="1" max="120"
            value={localPreDays}
            onChange={(e) => handleSliderChange(e, 'pre')}
            onMouseUp={handleSliderRelease}
            onTouchEnd={handleSliderRelease}
            className="absolute w-1/2 left-0 opacity-0 cursor-pointer"
            style={{ direction: 'rtl' }}
          />
          <input
            type="range"
            min="1" max="120"
            value={localPostDays}
            onChange={(e) => handleSliderChange(e, 'post')}
            onMouseUp={handleSliderRelease}
            onTouchEnd={handleSliderRelease}
            className="absolute w-1/2 right-0 opacity-0 cursor-pointer"
          />
          <div
            className="absolute w-[13px] h-[13px] bg-[var(--accent)] rounded-full cursor-pointer border-2 border-[var(--navy)] pointer-events-none"
            style={{ left: `calc(${50 - (localPreDays / 120) * 50}% - 6px)` }}
          ></div>
          <div
            className="absolute w-[13px] h-[13px] bg-[var(--accent)] rounded-full cursor-pointer border-2 border-[var(--navy)] pointer-events-none"
            style={{ right: `calc(${50 - (localPostDays / 120) * 50}% - 6px)` }}
          ></div>
        </div>
        <div className="text-[9px] font-light text-[var(--muted)] italic mt-1.5 tracking-[0.04em]">All values in trading days</div>
      </div>

      {/* ── Event Colors ──────────────────────────────────── */}
      <div className="p-3.5 px-4 flex-1">
        <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-[var(--muted)] mb-2">Event Colors</div>
        <div className="flex flex-col gap-1 mt-1">
          {selectedEvents.map((e: any, i: number) => {
            const isHovered = hoveredEventId === e.id;
            return (
              <div
                key={e.id}
                className="flex items-center gap-2 cursor-pointer rounded-[2px] px-1 py-[2px] transition-colors duration-100"
                style={{ background: isHovered ? 'var(--accent-dim)' : 'transparent' }}
                onMouseEnter={() => !pinnedEventId && setHoveredEventId(e.id)}
                onMouseLeave={() => !pinnedEventId && setHoveredEventId(null)}
                onClick={() => {
                  if (pinnedEventId === e.id) {
                    setPinnedEventId(null);
                    setHoveredEventId(null);
                  } else {
                    setPinnedEventId(e.id);
                    setHoveredEventId(e.id);
                  }
                }}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0 transition-transform duration-100"
                  style={{
                    background: `var(--c${(i % 9) + 1})`,
                    transform: isHovered ? 'scale(1.3)' : 'scale(1)'
                  }}
                />
                <span
                  className="text-[11px] truncate transition-colors duration-100"
                  style={{ color: isHovered ? 'var(--white)' : 'var(--white-dim)' }}
                >
                  {e.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <ThemeToggle theme={theme} setTheme={setTheme} />

      {isCSVModalOpen && (
        <CSVUploadModal
          onClose={() => setIsCSVModalOpen(false)}
          onUploadSuccess={(filename: string, data: any) => {
            if (onUploadSuccess) onUploadSuccess(filename, data);
            setIsCSVModalOpen(false);
          }}
        />
      )}
    </aside>
  );
}