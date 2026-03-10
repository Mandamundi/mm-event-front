import React from 'react';

export default function ThemeToggle({ theme, setTheme }: any) {
  return (
    <div className="p-3 px-4 border-t border-[var(--navy-border)] flex items-center justify-between mt-auto">
      <span className="text-[10px] font-normal text-[var(--muted)] tracking-[0.06em]">Theme</span>
      <div className="flex items-center gap-0 border border-[var(--navy-border)] rounded-[3px] overflow-hidden">
        <button 
          className={`py-1 px-2.5 text-[10px] font-sans border-none cursor-pointer flex items-center gap-1 ${theme === 'light' ? 'bg-[var(--accent)] text-[var(--navy)] font-bold' : 'bg-[var(--navy-light)] text-[var(--white)]'}`}
          onClick={() => setTheme('light')}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 1v1M6 10v1M1 6h1M10 6h1M2.5 2.5l.7.7M8.8 8.8l.7.7M2.5 9.5l.7-.7M8.8 3.2l.7-.7M6 4a2 2 0 100 4 2 2 0 000-4z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
          Light
        </button>
        <button 
          className={`py-1 px-2.5 text-[10px] font-sans border-none cursor-pointer flex items-center gap-1 ${theme === 'dark' ? 'bg-[var(--accent)] text-[var(--navy)] font-bold' : 'bg-[var(--navy-light)] text-[var(--white)]'}`}
          onClick={() => setTheme('dark')}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M10 7.5A4.5 4.5 0 014.5 2a4.5 4.5 0 100 8 4.5 4.5 0 005.5-2.5z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
          Dark
        </button>
      </div>
    </div>
  );
}
