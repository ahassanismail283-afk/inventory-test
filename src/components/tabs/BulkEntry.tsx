import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Plus, Search, X } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { formatDay, shortDay, weekEndingTuesday, weekRange } from '../../lib/periods';
import { findMatchingItems, normalizeItemName } from '../../lib/itemNames';
import { Card, CardTitle, Field, StockValue, buttonClass, cx, iconButtonClass, inputClass, td, th, theadClass } from '../ui';

type MovementType = 'إضافة' | 'استهلاك';

interface NewRow {
  key: number;
  name: string;
  qty: string;
}

// Normalizes Arabic letter variants for search (same rule as the item picker)
const normalize = (s: string) =>
  s.replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase().trim();

// Enter quantities for many items on one sheet, then save them all with one date and type.
const BulkEntry: React.FC = () => {
  const { items, addTransactionsBatch, loading } = useInventory();

  const [type, setType] = useState<MovementType>('استهلاك');
  const [date, setDate] = useState(() => formatDay(weekEndingTuesday(new Date())));
  const [query, setQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  // Items that do not exist in the unit yet (additions only)
  const [newRows, setNewRows] = useState<NewRow[]>([]);
  const nextKey = useRef(1);

  const week = date ? weekRange(date) : null;

  // Consumption is only possible from items that hold stock; additions can go to any item.
  const visible = useMemo(() => {
    const q = normalize(query);
    return items.filter(i =>
      (!q || normalize(i.name).includes(q)) &&
      (type === 'إضافة' || !inStockOnly || i.currentQuantity > 0 || quantities[i.id])
    );
  }, [items, query, type, inStockOnly, quantities]);

  const entries = useMemo(
    () => Object.entries(quantities)
      .map(([itemId, raw]) => ({ itemId, quantity: Number(raw) }))
      .filter(e => isValidQuantity(e.quantity)),
    [quantities]
  );
  // Each new row is checked against the unit's items and against the earlier new rows
  const newChecks = useMemo(() => newRows.map(row => {
    const name = row.name.trim();
    const qty = Number(row.qty);
    const match = findMatchingItems(name, items);
    const repeated = !!name && newRows.some(o => o.key < row.key && normalizeItemName(o.name) === normalizeItemName(name));
    const empty = !name && row.qty === '';
    return {
      row, name, qty, match, repeated, empty,
      valid: !empty && !!name && isValidQuantity(qty) && !match.exact && !repeated,
    };
  }), [newRows, items]);
  const newEntries = type === 'إضافة' ? newChecks.filter(c => c.valid) : [];
  const newBlocked = type === 'إضافة' && newChecks.some(c => !c.empty && !c.valid);
  const newSimilar = newEntries.filter(c => c.match.similar.length > 0);

  const invalid = Object.values(quantities).some(v => v !== '' && !isValidQuantity(Number(v)));
  const overdrawn = type === 'استهلاك'
    ? entries.filter(e => e.quantity > (items.find(i => i.id === e.itemId)?.currentQuantity ?? 0))
    : [];

  const setQty = (id: string, value: string) =>
    setQuantities(prev => {
      const next = { ...prev };
      if (value === '') delete next[id];
      else next[id] = value;
      return next;
    });

  const focusRow = (index: number) => inputs.current[index]?.focus();

  const addNewRow = () => setNewRows(rows => [...rows, { key: nextKey.current++, name: '', qty: '' }]);
  const updateNewRow = (key: number, patch: Partial<NewRow>) =>
    setNewRows(rows => rows.map(r => (r.key === key ? { ...r, ...patch } : r)));
  const removeNewRow = (key: number) => setNewRows(rows => rows.filter(r => r.key !== key));

  // Move a new row's quantity onto the existing item it duplicates
  const moveToExisting = (key: number, itemId: string, qty: string) => {
    const existing = Number(quantities[itemId] || 0);
    const added = isValidQuantity(Number(qty)) ? Number(qty) : 0;
    if (existing + added > 0) setQty(itemId, String(existing + added));
    removeNewRow(key);
  };

  const total = entries.length + newEntries.length;

  const handleSave = async () => {
    if (total === 0 || invalid || newBlocked) return;
    const label = type === 'إضافة' ? 'وارد' : 'منصرف';
    let warning = '';
    if (overdrawn.length > 0) warning += `\n\nتنبيه: ${overdrawn.length} صنف سيصبح رصيده بالسالب.`;
    if (newEntries.length > 0) warning += `\n\nسيُضاف ${newEntries.length} صنف جديد إلى الوحدة.`;
    if (newSimilar.length > 0) {
      warning += '\n\nأصناف جديدة تشبه أصنافا موجودة، تأكد أنها مختلفة فعلا:\n' +
        newSimilar.map(c => `- ${c.name} يشبه ${c.match.similar.map(m => m.name).join('، ')}`).join('\n');
    }
    if (!window.confirm(`تسجيل ${total} حركة ${label} بتاريخ ${date}؟${warning}`)) return;
    const ok = await addTransactionsBatch(entries, type, date, newEntries.map(c => ({ name: c.name, quantity: c.qty })));
    if (ok) { setQuantities({}); setNewRows([]); }
  };

  const typeButton = (value: MovementType, label: string) => (
    <button
      type="button"
      onClick={() => { setType(value); setQuantities({}); setNewRows([]); }}
      aria-pressed={type === value}
      className={cx(
        'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        type === value ? 'bg-white text-primary-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="pb-24">
      <Card className="mb-4">
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr] lg:items-end">
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-slate-700">نوع الحركة لكل الأصناف</legend>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {typeButton('استهلاك', 'منصرف')}
              {typeButton('إضافة', 'وارد')}
            </div>
          </fieldset>
          <Field
            label="تاريخ الحركات"
            htmlFor="bulk-date"
            hint={week ? `ضمن أسبوع ${shortDay(week.start)} إلى ${shortDay(week.end)}` : undefined}
          >
            <input id="bulk-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} required />
          </Field>
          <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
            <label htmlFor="bulk-search" className="text-sm font-medium text-slate-700">تصفية الأصناف</label>
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input id="bulk-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم الصنف" className={inputClass + ' pr-9'} />
            </div>
          </div>
        </div>
        {type === 'استهلاك' && (
          <label className="flex cursor-pointer items-center gap-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-700">
            <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
            الأصناف التي لها رصيد فقط
          </label>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className={theadClass}>
              <tr>
                <th className={th}>الصنف</th>
                <th className={th + ' w-32 whitespace-nowrap text-center'}>الرصيد الحالي</th>
                <th className={th + ' w-36 text-center'}>{type === 'إضافة' ? 'الكمية الواردة' : 'الكمية المنصرفة'}</th>
                <th className={th + ' w-32 whitespace-nowrap text-center'}>الرصيد بعدها</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.length === 0 ? (
                <tr><td colSpan={4} className={td + ' py-10 text-center text-slate-600'}>لا توجد أصناف تطابق التصفية.</td></tr>
              ) : visible.map((item, index) => {
                const rawValue = quantities[item.id] ?? '';
                const qty = Number(rawValue);
                const filled = rawValue !== '' && isValidQuantity(qty);
                const after = filled ? item.currentQuantity + (type === 'إضافة' ? qty : -qty) : null;
                return (
                  <tr key={item.id} className={filled ? 'bg-primary-50/50' : 'hover:bg-slate-50'}>
                    <td className={td + ' font-medium text-slate-900'}>
                      <label htmlFor={`bulk-${item.id}`}>{item.name}</label>
                    </td>
                    <td className={td + ' text-center'}><StockValue value={item.currentQuantity} /></td>
                    <td className={td}>
                      <input
                        id={`bulk-${item.id}`}
                        ref={el => { inputs.current[index] = el; }}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="1"
                        value={rawValue}
                        onChange={(e) => setQty(item.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); focusRow(index + 1); }
                          if (e.key === 'ArrowUp') { e.preventDefault(); focusRow(index - 1); }
                        }}
                        className={cx(inputClass, 'mx-auto w-28 py-1.5 text-center tabular-nums',
                          rawValue !== '' && !filled && 'border-red-400 focus:border-red-500 focus:ring-red-500/15')}
                      />
                    </td>
                    <td className={td + ' text-center'}>
                      {after === null ? <span className="text-slate-400">-</span> : <StockValue value={after} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {type === 'إضافة' && (
        <Card className="mt-4">
          <CardTitle aside={<span className="text-xs text-slate-500">تُضاف إلى الوحدة برصيدها الوارد</span>}>أصناف جديدة غير موجودة في الوحدة</CardTitle>
          <div className="space-y-3 p-5 pt-3">
            {newChecks.map(({ row, match, repeated, name }) => (
              <div key={row.key} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[12rem] flex-1">
                    <label htmlFor={`new-name-${row.key}`} className="mb-1.5 block text-sm font-medium text-slate-700">اسم الصنف الجديد</label>
                    <input id={`new-name-${row.key}`} type="text" value={row.name} onChange={(e) => updateNewRow(row.key, { name: e.target.value })} className={inputClass} />
                  </div>
                  <div className="w-32">
                    <label htmlFor={`new-qty-${row.key}`} className="mb-1.5 block text-sm font-medium text-slate-700">الكمية الواردة</label>
                    <input id={`new-qty-${row.key}`} type="number" inputMode="numeric" min="1" step="1" value={row.qty} onChange={(e) => updateNewRow(row.key, { qty: e.target.value })} className={inputClass + ' text-center tabular-nums'} />
                  </div>
                  <button type="button" onClick={() => removeNewRow(row.key)} className={iconButtonClass('danger')} aria-label="إزالة الصنف الجديد">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {match.exact && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                    <span>هذا الصنف موجود بالفعل باسم «{match.exact.name}»، ولا يُضاف مرتين.</span>
                    <button type="button" onClick={() => moveToExisting(row.key, match.exact!.id, row.qty)} className="font-semibold underline underline-offset-2">
                      سجّل الكمية على الصنف الموجود
                    </button>
                  </div>
                )}
                {!match.exact && repeated && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">هذا الاسم مكرر في قائمة الأصناف الجديدة.</p>
                )}
                {!match.exact && !repeated && match.similar.length > 0 && name && (
                  <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <p className="flex items-center gap-1.5 font-medium"><AlertTriangle className="h-4 w-4" /> يشبه أصنافا موجودة. هل هو أحدها؟</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {match.similar.slice(0, 4).map(m => (
                        <button key={m.id} type="button" onClick={() => moveToExisting(row.key, m.id, row.qty)} className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium hover:bg-amber-100">
                          نعم، هو «{m.name}»
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs">إن كان صنفا مختلفا فاتركه، وسيُطلب منك التأكيد عند الحفظ.</p>
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={addNewRow} className={buttonClass('secondary', 'w-full border-dashed')}>
              <Plus className="h-4 w-4" />
              إضافة صنف جديد
            </button>
          </div>
        </Card>
      )}

      {/* Save bar */}
      <div className="fixed inset-x-0 bottom-[4.5rem] z-20 px-4 lg:bottom-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-card backdrop-blur">
          <p className="text-sm text-slate-700">
            {invalid
              ? <span className="text-red-700">الكميات يجب أن تكون أعدادا صحيحة أكبر من صفر.</span>
              : newBlocked
                ? <span className="text-red-700">صحّح الأصناف الجديدة المعلّمة بالأحمر أولا.</span>
              : total === 0
                ? 'اكتب الكمية أمام كل صنف تريده. زر الإدخال ينقلك للصنف التالي.'
                : <>جاهز للحفظ: <b className="tabular-nums">{total}</b> صنف{newEntries.length > 0 && <>، منها {newEntries.length} جديد</>}{overdrawn.length > 0 && <span className="text-red-700">، منها {overdrawn.length} بالسالب</span>}</>}
          </p>
          <div className="flex items-center gap-2">
            {(entries.length > 0 || newRows.length > 0) && (
              <button onClick={() => { setQuantities({}); setNewRows([]); }} className={buttonClass('ghost')}>مسح</button>
            )}
            <button onClick={handleSave} disabled={loading || total === 0 || invalid || newBlocked} className={buttonClass('primary')}>
              {loading ? 'جارٍ الحفظ...' : 'حفظ الكل'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Quantities are stored as whole numbers in the database
function isValidQuantity(n: number) {
  return Number.isInteger(n) && n > 0;
}

export default BulkEntry;
