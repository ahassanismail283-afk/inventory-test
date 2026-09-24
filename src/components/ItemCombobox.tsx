import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cx, inputClass } from './ui';

interface Option {
  id: string;
  name: string;
}

interface ItemComboboxProps {
  id: string;
  items: Option[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  // Extra first option that is not an item, e.g. { id: 'all', name: 'كل الأصناف' }
  leadingOption?: Option;
  // Secondary text shown next to each item, e.g. its balance
  meta?: (id: string) => React.ReactNode;
  className?: string;
}

// Folds the Arabic letter variants people type interchangeably, and strips diacritics,
// so "اوكسي" finds "أوكسي" and "ملحي" finds "مِلحي".
const normalize = (s: string) =>
  s
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .trim();

// A select replacement with a search box, for picking an item from a long list.
const ItemCombobox: React.FC<ItemComboboxProps> = ({
  id,
  items,
  value,
  onChange,
  placeholder = 'اختر الصنف',
  leadingOption,
  meta,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const allOptions = useMemo(() => (leadingOption ? [leadingOption, ...items] : items), [items, leadingOption]);
  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return allOptions;
    return allOptions.filter(o => o !== leadingOption && normalize(o.name).includes(q));
  }, [allOptions, query, leadingOption]);

  const selected = allOptions.find(o => o.id === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      const idx = allOptions.findIndex(o => o.id === value);
      setHighlight(idx >= 0 ? idx : 0);
      searchRef.current?.focus();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    listRef.current?.children[highlight]?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const choose = (option: Option) => {
    onChange(option.id);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) choose(filtered[highlight]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cx('relative', className)}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(o => !o)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cx(inputClass, 'flex items-center justify-between gap-2 text-right')}
      >
        <span className={cx('truncate', !selected && 'text-slate-500')}>{selected ? selected.name : placeholder}</span>
        <ChevronDown className={cx('h-4 w-4 shrink-0 text-slate-500 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-40 mt-1 min-w-[16rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10">
          <div className="relative border-b border-slate-100 p-2">
            <Search className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
              onKeyDown={onKeyDown}
              placeholder="ابحث عن صنف"
              aria-label="ابحث عن صنف"
              aria-controls={listId}
              aria-activedescendant={filtered[highlight] ? `${listId}-${filtered[highlight].id}` : undefined}
              className={cx(inputClass, 'py-2 pr-9')}
            />
          </div>
          <ul id={listId} ref={listRef} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-600">لا يوجد صنف بهذا الاسم.</li>
            ) : (
              filtered.map((option, i) => {
                const isSelected = option.id === value;
                return (
                  <li
                    key={option.id}
                    id={`${listId}-${option.id}`}
                    role="option"
                    aria-selected={isSelected}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => choose(option)}
                    onPointerMove={() => setHighlight(i)}
                    className={cx(
                      'flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm',
                      i === highlight ? 'bg-slate-100' : '',
                      isSelected ? 'font-semibold text-primary-800' : 'text-slate-800'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Check className={cx('h-4 w-4 shrink-0', isSelected ? 'text-primary-700' : 'invisible')} />
                      {option.name}
                    </span>
                    {meta && option !== leadingOption && (
                      <span className="shrink-0 text-xs tabular-nums text-slate-600">{meta(option.id)}</span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ItemCombobox;
