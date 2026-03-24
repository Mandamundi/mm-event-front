import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Asset {
  ticker: string;
  label: string;
  category: string;
}

interface Props {
  assets: Asset[];
  value: string;
  onChange: (ticker: string) => void;
  badge?: string; // e.g. "A1", "A2"
  placeholder?: string;
}

export default function AssetSearch({ assets, value, onChange, badge, placeholder = 'Search assets…' }: Props) {
  const selectedAsset = assets.find(a => a.ticker === value);

  const [query, setQuery]       = useState('');
  const [open, setOpen]         = useState(false);
  const [focused, setFocused]   = useState(-1); // keyboard nav index into filtered list

  const inputRef    = useRef<HTMLInputElement>(null);
  const listRef     = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter assets: match label or ticker, case-insensitive
  const filtered = query.trim() === ''
    ? assets
    : assets.filter(a =>
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        a.ticker.toLowerCase().includes(query.toLowerCase())
      );

  // Group filtered results by category
  const grouped = filtered.reduce<Record<string, Asset[]>>((acc, a) => {
    (acc[a.category] ??= []).push(a);
    return acc;
  }, {});

  // Flat list for keyboard nav
  const flat = filtered;

  const selectAsset = useCallback((ticker: string) => {
    onChange(ticker);
    setQuery('');
    setOpen(false);
    setFocused(-1);
  }, [onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setOpen(true);
    setFocused(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocused(f => Math.min(f + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocused(f => Math.max(f - 1, 0));
    } else if (e.key === 'Enter' && focused >= 0) {
      e.preventDefault();
      selectAsset(flat[focused].ticker);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focused >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-idx="${focused}"]`) as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [focused]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayValue = open ? query : (selectedAsset ? `${selectedAsset.label} (${selectedAsset.ticker})` : '');

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div className="relative">
        {badge && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-bold tracking-[0.08em] text-[var(--muted)] uppercase pointer-events-none z-10">
            {badge}
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          placeholder={placeholder}
          onChange={handleInputChange}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onKeyDown={handleKeyDown}
          className="w-full bg-[var(--navy-light)] border border-[var(--navy-border)] text-[var(--white)] font-sans text-xs py-[7px] pr-7 rounded-[3px] cursor-pointer outline-none focus:border-[var(--accent)] transition-colors"
          style={{ paddingLeft: badge ? '2.25rem' : '0.625rem' }}
          autoComplete="off"
          spellCheck={false}
        />
        {/* Chevron */}
        <svg
          className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted)]"
          width="10" height="6" viewBox="0 0 10 6" fill="currentColor"
          style={{ transform: `translateY(-50%) ${open ? 'rotate(180deg)' : ''}`, transition: 'transform 0.15s' }}
        >
          <path d="M0 0l5 6 5-6z"/>
        </svg>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-[2px] bg-[var(--navy-mid)] border border-[var(--navy-border)] rounded-[3px] shadow-lg max-h-[260px] overflow-y-auto">
          {flat.length === 0 ? (
            <div className="px-3 py-2.5 text-[11px] text-[var(--muted)] italic">No assets match "{query}"</div>
          ) : (
            Object.entries(grouped).map(([category, items]) => {
              return (
                <div key={category}>
                  <div className="px-3 pt-2 pb-1 text-[9px] font-bold tracking-[0.14em] uppercase text-[var(--muted)] sticky top-0 bg-[var(--navy-mid)]">
                    {category}
                  </div>
                  {items.map(asset => {
                    const idx = flat.indexOf(asset);
                    const isSelected = asset.ticker === value;
                    const isFocused  = idx === focused;
                    return (
                      <div
                        key={asset.ticker}
                        data-idx={idx}
                        onMouseDown={() => selectAsset(asset.ticker)}
                        onMouseEnter={() => setFocused(idx)}
                        className="flex items-center justify-between px-3 py-[6px] cursor-pointer text-[11.5px] transition-colors"
                        style={{
                          background: isFocused ? 'var(--accent-dim)' : isSelected ? 'rgba(112,197,228,0.06)' : 'transparent',
                          color: isSelected ? 'var(--accent)' : 'var(--white-dim)',
                        }}
                      >
                        <span>{asset.label}</span>
                        <span className="text-[10px] text-[var(--muted)] ml-2 shrink-0">{asset.ticker}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
