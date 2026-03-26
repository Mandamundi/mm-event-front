import React, { useState, useEffect, useRef } from 'react';

interface EventRow {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
}

interface CustomEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventType: { id: string; label: string; events: EventRow[] }) => void;
}

function generateId(label: string): string {
  return 'custom_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + Date.now();
}

function emptyRow(): EventRow {
  return { id: crypto.randomUUID(), label: '', start_date: '', end_date: '' };
}

function validateDate(val: string): boolean {
  if (!val) return true; // empty is fine (end_date optional)
  return /^\d{4}-\d{2}-\d{2}$/.test(val) && !isNaN(Date.parse(val));
}

export default function CustomEventModal({ isOpen, onClose, onSave }: CustomEventModalProps) {
  const [categoryName, setCategoryName] = useState('');
  const [rows, setRows] = useState<EventRow[]>([emptyRow()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const lastRowRef = useRef<HTMLInputElement>(null);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setCategoryName('');
      setRows([emptyRow()]);
      setErrors({});
      setSubmitted(false);
      setTimeout(() => categoryInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const updateRow = (id: string, field: keyof EventRow, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    if (submitted) setErrors(prev => ({ ...prev, [`${id}_${field}`]: '' }));
  };

  const addRow = () => {
    setRows(prev => [...prev, emptyRow()]);
    setTimeout(() => lastRowRef.current?.focus(), 50);
  };

  const removeRow = (id: string) => {
    if (rows.length === 1) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!categoryName.trim()) newErrors['category'] = 'Category name is required';

    rows.forEach(row => {
      if (!row.label.trim()) newErrors[`${row.id}_label`] = 'Required';
      if (!row.start_date) {
        newErrors[`${row.id}_start_date`] = 'Required';
      } else if (!validateDate(row.start_date)) {
        newErrors[`${row.id}_start_date`] = 'Invalid date';
      }
      if (row.end_date && !validateDate(row.end_date)) {
        newErrors[`${row.id}_end_date`] = 'Invalid date';
      }
      if (row.start_date && row.end_date && row.start_date > row.end_date) {
        newErrors[`${row.id}_end_date`] = 'Must be after start';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    setSubmitted(true);
    if (!validate()) return;

    const filledRows = rows.filter(r => r.label.trim() && r.start_date);
    onSave({
      id: generateId(categoryName),
      label: categoryName.trim(),
      events: filledRows.map(r => ({
        id: generateId(r.label),
        label: r.label.trim(),
        start_date: r.start_date,
        end_date: r.end_date || null,
        notes: '',
      })),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(5, 12, 20, 0.75)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed z-50 flex flex-col"
        style={{
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '560px',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 64px)',
          background: 'var(--surface2)',
          border: '1px solid var(--navy-border)',
          borderRadius: '4px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px 13px',
          borderBottom: '1px solid var(--navy-border)',
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'var(--white)',
            }}>
              Add Custom Event Category
            </div>
            <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px', fontWeight: 300 }}>
              Your events will appear in the Event Type dropdown
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: '18px', lineHeight: 1,
            padding: '2px 4px', borderRadius: '2px',
            transition: 'color 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--white)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1 }}>

          {/* Category name */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block', fontSize: '9px', fontWeight: 700,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'var(--muted)', marginBottom: '6px',
            }}>
              Category Name
            </label>
            <input
              ref={categoryInputRef}
              type="text"
              value={categoryName}
              onChange={e => {
                setCategoryName(e.target.value);
                if (submitted) setErrors(prev => ({ ...prev, category: '' }));
              }}
              placeholder="e.g. Presidential Elections"
              style={{
                width: '100%',
                background: 'var(--navy-light)',
                border: `1px solid ${errors['category'] ? 'var(--neg)' : 'var(--navy-border)'}`,
                color: 'var(--white)',
                fontFamily: 'Lato, sans-serif',
                fontSize: '12px',
                padding: '8px 10px',
                borderRadius: '3px',
                outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = errors['category'] ? 'var(--neg)' : 'var(--navy-border)')}
            />
            {errors['category'] && (
              <div style={{ fontSize: '10px', color: 'var(--neg)', marginTop: '3px' }}>{errors['category']}</div>
            )}
          </div>

          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 130px 130px 24px',
            gap: '6px',
            marginBottom: '4px',
            paddingRight: '2px',
          }}>
            {['Event Name', 'Start Date', 'End Date (optional)', ''].map((h, i) => (
              <div key={i} style={{
                fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--muted)',
              }}>{h}</div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--navy-border)', marginBottom: '8px' }} />

          {/* Event rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {rows.map((row, idx) => (
              <EventRowInput
                key={row.id}
                row={row}
                errors={errors}
                isLast={idx === rows.length - 1}
                canRemove={rows.length > 1}
                lastRowRef={idx === rows.length - 1 ? lastRowRef : undefined}
                onChange={(field, value) => updateRow(row.id, field, value)}
                onRemove={() => removeRow(row.id)}
              />
            ))}
          </div>

          {/* Add row button */}
          <button
            onClick={addRow}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              marginTop: '10px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--accent)', fontFamily: 'Lato, sans-serif',
              fontSize: '11px', fontWeight: 400, letterSpacing: '0.04em',
              padding: '4px 0', borderRadius: '2px',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <span style={{
              width: '16px', height: '16px', borderRadius: '2px',
              background: 'rgba(112,197,228,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', lineHeight: 1,
            }}>＋</span>
            Add another event
          </button>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px',
          borderTop: '1px solid var(--navy-border)',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: '10px', color: 'var(--muted)', fontStyle: 'italic' }}>
            {rows.length} event{rows.length !== 1 ? 's' : ''} · End date is optional
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '7px 16px', borderRadius: '3px', cursor: 'pointer',
                border: '1px solid var(--navy-border)',
                background: 'transparent', color: 'var(--muted)',
                fontFamily: 'Lato, sans-serif', fontSize: '11px', fontWeight: 400,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--white)';
                e.currentTarget.style.borderColor = 'var(--white-dim)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--muted)';
                e.currentTarget.style.borderColor = 'var(--navy-border)';
              }}
            >Cancel</button>
            <button
              onClick={handleSave}
              style={{
                padding: '7px 20px', borderRadius: '3px', cursor: 'pointer',
                border: 'none',
                background: 'var(--accent)', color: 'var(--navy)',
                fontFamily: 'Lato, sans-serif', fontSize: '11px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >Done</button>
          </div>
        </div>

      </div>
    </>
  );
}


// ── Sub-component: one event row ─────────────────────────────────────────────

interface EventRowInputProps {
  row: EventRow;
  errors: Record<string, string>;
  isLast: boolean;
  canRemove: boolean;
  lastRowRef?: React.Ref<HTMLInputElement>;
  onChange: (field: keyof EventRow, value: string) => void;
  onRemove: () => void;
}

function EventRowInput({ row, errors, canRemove, lastRowRef, onChange, onRemove }: EventRowInputProps) {
  const inputStyle = (errorKey: string): React.CSSProperties => ({
    width: '100%',
    background: 'var(--navy-light)',
    border: `1px solid ${errors[errorKey] ? 'var(--neg)' : 'var(--navy-border)'}`,
    color: 'var(--white)',
    fontFamily: 'Lato, sans-serif',
    fontSize: '11.5px',
    padding: '6px 8px',
    borderRadius: '3px',
    outline: 'none',
  });

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 130px 130px 24px',
      gap: '6px',
      alignItems: 'start',
    }}>
      {/* Event name */}
      <div>
        <input
          type="text"
          value={row.label}
          onChange={e => onChange('label', e.target.value)}
          placeholder="e.g. Gulf War"
          style={inputStyle(`${row.id}_label`)}
          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.target.style.borderColor = errors[`${row.id}_label`] ? 'var(--neg)' : 'var(--navy-border)')}
        />
        {errors[`${row.id}_label`] && (
          <div style={{ fontSize: '9px', color: 'var(--neg)', marginTop: '2px' }}>{errors[`${row.id}_label`]}</div>
        )}
      </div>

      {/* Start date */}
      <div>
        <input
          type="date"
          value={row.start_date}
          onChange={e => onChange('start_date', e.target.value)}
          style={{
            ...inputStyle(`${row.id}_start_date`),
            colorScheme: 'dark',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.target.style.borderColor = errors[`${row.id}_start_date`] ? 'var(--neg)' : 'var(--navy-border)')}
        />
        {errors[`${row.id}_start_date`] && (
          <div style={{ fontSize: '9px', color: 'var(--neg)', marginTop: '2px' }}>{errors[`${row.id}_start_date`]}</div>
        )}
      </div>

      {/* End date */}
      <div>
        <input
          ref={lastRowRef as React.Ref<HTMLInputElement>}
          type="date"
          value={row.end_date}
          onChange={e => onChange('end_date', e.target.value)}
          style={{
            ...inputStyle(`${row.id}_end_date`),
            colorScheme: 'dark',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.target.style.borderColor = errors[`${row.id}_end_date`] ? 'var(--neg)' : 'var(--navy-border)')}
        />
        {errors[`${row.id}_end_date`] && (
          <div style={{ fontSize: '9px', color: 'var(--neg)', marginTop: '2px' }}>{errors[`${row.id}_end_date`]}</div>
        )}
      </div>

      {/* Remove button */}
      <div style={{ display: 'flex', alignItems: 'center', height: '30px' }}>
        {canRemove && (
          <button
            onClick={onRemove}
            title="Remove this event"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--muted)', fontSize: '15px', lineHeight: 1,
              padding: '2px', borderRadius: '2px',
              transition: 'color 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '20px', height: '20px',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--neg)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
          >×</button>
        )}
      </div>
    </div>
  );
}