import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import RightPanel from './components/RightPanel';
import SummaryCards from './components/SummaryCards';
import ChartPanel from './components/ChartPanel';
import DataTable from './components/DataTable';
import { useEvents } from './hooks/useEvents';
import { useAssets } from './hooks/useAssets';
import { useAnalysis } from './hooks/useAnalysis';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const { eventTypes, isLoading: eventsLoading } = useEvents();
  const { assets: initialAssets, groupedAssets: initialGroupedAssets, isLoading: assetsLoading } = useAssets();
  
  const [customAssets, setCustomAssets] = useState<any[]>([]);
  
  const assets = [...initialAssets, ...customAssets];
  const groupedAssets = { ...initialGroupedAssets };
  if (customAssets.length > 0) {
    groupedAssets['Custom'] = customAssets;
  }
  
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [phase, setPhase] = useState('start');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  
  const [primaryTicker, setPrimaryTicker] = useState('^GSPC');
  const [secondaryTicker, setSecondaryTicker] = useState<string | null>(null);
  const [benchmarkTicker, setBenchmarkTicker] = useState('^GSPC');
  const [showExcess, setShowExcess] = useState(false);
  
  const [preDays, setPreDays] = useState(30);
  const [postDays, setPostDays] = useState(60);
  
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [pinnedEventId, setPinnedEventId] = useState<string | null>(null);

  // Initialize defaults when data loads
  useEffect(() => {
    if (eventTypes.length > 0 && !selectedTypeId) {
      setSelectedTypeId(eventTypes[0].id);
      setSelectedEventIds(eventTypes[0].events.map((e: any) => e.id));
    }
  }, [eventTypes, selectedTypeId]);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
  }, [theme]);

  const analysisParams = selectedEventIds.length > 0 ? {
  event_ids: selectedEventIds,
  ticker: primaryTicker,
  phase,
  pre_days: preDays,
  post_days: postDays,
  ...(showExcess && benchmarkTicker ? { benchmark_ticker: benchmarkTicker } : {}),
  ...(secondaryTicker ? { second_ticker: secondaryTicker } : {})
  } : null;

const { data: analysisData, isLoading: analysisLoading, error: analysisError } = useAnalysis(analysisParams);

  const selectedType = eventTypes.find((t: any) => t.id === selectedTypeId);
  const primaryAsset = assets.find((a: any) => a.ticker === primaryTicker);
  const secondaryAsset = secondaryTicker ? assets.find((a: any) => a.ticker === secondaryTicker) : null;

  const primaryData = showExcess ? analysisData?.primary_excess : analysisData?.primary;
  const secondaryData = showExcess ? analysisData?.secondary_excess : analysisData?.secondary;

  const handleUploadSuccess = (filename: string, data: any) => {
    const newAsset = {
      ticker: data.ticker || `custom_${Date.now()}`,
      label: `Custom: ${filename}`,
      category: 'Custom'
    };
    setCustomAssets([...customAssets, newAsset]);
    setPrimaryTicker(newAsset.ticker);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--navy)] text-[var(--white)] font-sans text-[13px]">
      <Sidebar 
        eventTypes={eventTypes}
        selectedTypeId={selectedTypeId}
        setSelectedTypeId={(id: string) => {
          setSelectedTypeId(id);
          const type = eventTypes.find((t: any) => t.id === id);
          if (type) {
            setSelectedEventIds(type.events.map((e: any) => e.id));
            setPhase('start');
          }
        }}
        phase={phase}
        setPhase={setPhase}
        selectedEventIds={selectedEventIds}
        setSelectedEventIds={setSelectedEventIds}
      />

      <main className="flex-1 flex flex-col overflow-hidden bg-[var(--navy)]">
        <div className="flex items-center justify-between px-5 h-12 border-b border-[var(--navy-border)] bg-[var(--surface2)] shrink-0">
          <span className="text-xs font-bold tracking-[0.08em] uppercase text-[var(--white-dim)]">
            {primaryAsset?.label || primaryTicker} — {selectedType?.label || 'Loading...'}
          </span>
          <span className="text-[11px] font-light text-[var(--muted)] tracking-[0.04em]">
            {selectedEventIds.length} events selected · −{preDays} to +{postDays} trading days · {showExcess ? 'Excess Return' : 'Raw Return'}
          </span>
        </div>

        <SummaryCards 
          data={primaryData} 
          selectedEventsCount={selectedEventIds.length}
          totalEventsCount={selectedType?.events.length || 0}
          eventTypeLabel={selectedType?.label}
        />

        <div className="flex-1 overflow-y-auto p-4 px-5 flex flex-col gap-4">
          {analysisError && (
            <div className="bg-[rgba(192,0,0,0.1)] border border-[var(--neg)] text-[var(--neg)] p-3 rounded-[3px] text-[11px]">
              {analysisError}
            </div>
          )}
          
          {analysisData?.skipped_events?.length > 0 && (
            <div className="bg-[rgba(222,163,89,0.1)] border border-[var(--gold)] text-[var(--gold)] p-2 rounded-[3px] text-[11px] flex justify-between items-center">
              <span>{analysisData.skipped_events.length} event(s) excluded — end date not available</span>
            </div>
          )}

          {analysisLoading && !analysisData && (
            <div className="h-[260px] bg-[var(--surface2)] border border-[var(--navy-border)] rounded-[3px] animate-pulse flex items-center justify-center text-[var(--muted)]">
              Loading analysis...
            </div>
          )}

          {!analysisLoading && selectedEventIds.length === 0 && (
            <div className="h-[260px] bg-[var(--surface2)] border border-[var(--navy-border)] rounded-[3px] flex items-center justify-center text-[var(--muted)]">
              No events selected
            </div>
          )}

          {primaryData && selectedEventIds.length > 0 && (
            <>
              <ChartPanel 
                data={primaryData} 
                title={`${primaryAsset?.label || primaryTicker} / Price Return`}
                showExcess={showExcess}
                setShowExcess={setShowExcess}
                hoveredEventId={hoveredEventId}
                setHoveredEventId={setHoveredEventId}
                pinnedEventId={pinnedEventId}
                setPinnedEventId={setPinnedEventId}
                theme={theme}
              />
              <DataTable 
                data={primaryData}
                hoveredEventId={hoveredEventId}
                setHoveredEventId={setHoveredEventId}
                pinnedEventId={pinnedEventId}
                setPinnedEventId={setPinnedEventId}
              />
            </>
          )}

          {secondaryData && secondaryTicker && selectedEventIds.length > 0 && (
            <>
              <ChartPanel 
                data={secondaryData} 
                title={`${secondaryAsset?.label || secondaryTicker} / Price Return`}
                hoveredEventId={hoveredEventId}
                setHoveredEventId={setHoveredEventId}
                pinnedEventId={pinnedEventId}
                setPinnedEventId={setPinnedEventId}
                theme={theme}
              />
              <DataTable 
                data={secondaryData}
                hoveredEventId={hoveredEventId}
                setHoveredEventId={setHoveredEventId}
                pinnedEventId={pinnedEventId}
                setPinnedEventId={setPinnedEventId}
              />
            </>
          )}
        </div>
      </main>

      <RightPanel 
        assets={assets}
        groupedAssets={groupedAssets}
        primaryTicker={primaryTicker}
        setPrimaryTicker={setPrimaryTicker}
        secondaryTicker={secondaryTicker}
        setSecondaryTicker={setSecondaryTicker}
        benchmarkTicker={benchmarkTicker}
        setBenchmarkTicker={setBenchmarkTicker}
        showExcess={showExcess}
        setShowExcess={setShowExcess}
        preDays={preDays}
        setPreDays={setPreDays}
        postDays={postDays}
        setPostDays={setPostDays}
        theme={theme}
        setTheme={setTheme}
        selectedEventIds={selectedEventIds}
        eventTypes={eventTypes}
        selectedTypeId={selectedTypeId}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
