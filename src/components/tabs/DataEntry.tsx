import React, { useState } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { formatDay, shortDay, weekEndingTuesday, weekRange } from '../../lib/periods';
import { Card, Field, PageHeader, buttonClass, cx, inputClass } from '../ui';
import ItemCombobox from '../ItemCombobox';
import BulkEntry from './BulkEntry';

const DataEntry: React.FC = () => {
  const { items, addTransaction, loading } = useInventory();
  
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [itemId, setItemId] = useState('');
  const [type, setType] = useState<'إضافة' | 'استهلاك'>('إضافة');
  const [quantity, setQuantity] = useState('');
  // Default to the Tuesday that closes the current Wednesday → Tuesday week
  const [date, setDate] = useState(() => formatDay(weekEndingTuesday(new Date())));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) return;
    
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) return;

    const success = await addTransaction(itemId, item.name, type, qty, date);
    if (success) {
      setQuantity('');
      // Keep date and type
    }
  };

  const selectedItem = items.find(i => i.id === itemId);
  const week = date ? weekRange(date) : null;
  const numQuantity = Number(quantity);
  const exceedsStock = type === 'استهلاك' && !!selectedItem && numQuantity > selectedItem.currentQuantity;

  const modeButton = (value: 'single' | 'bulk', label: string) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      aria-pressed={mode === value}
      className={cx(
        'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
        mode === value ? 'bg-white text-primary-800 shadow-sm' : 'text-primary-100 hover:text-white'
      )}
    >
      {label}
    </button>
  );

  return (
    <div>
      <PageHeader
        title="إضافة حركة"
        description={mode === 'single'
          ? 'سجّل واردا جديدا إلى العهدة أو كمية منصرفة منها.'
          : 'اكتب الكميات لعدة أصناف في جدول واحد، ثم احفظها كلها بتاريخ ونوع واحد.'}
        actions={
          <div className="flex gap-1 rounded-xl bg-white/10 p-1">
            {modeButton('single', 'صنف واحد')}
            {modeButton('bulk', 'عدة أصناف')}
          </div>
        }
      />

      {mode === 'bulk' ? <BulkEntry /> : (
      <div className="max-w-2xl">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-slate-800">نوع الحركة</legend>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              {(['إضافة', 'استهلاك'] as const).map(value => (
                <label
                  key={value}
                  className={cx(
                    'flex cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
                    'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-700',
                    type === value ? 'bg-white text-primary-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <input
                    type="radio"
                    name="type"
                    value={value}
                    checked={type === value}
                    onChange={() => setType(value)}
                    className="sr-only"
                  />
                  {value === 'إضافة' ? 'وارد (إضافة)' : 'منصرف (استهلاك)'}
                </label>
              ))}
            </div>
          </fieldset>

          <Field
            label="الصنف"
            htmlFor="entry-item"
            hint={selectedItem ? `الرصيد الحالي: ${selectedItem.currentQuantity}` : undefined}
          >
            <ItemCombobox
              id="entry-item"
              items={items}
              value={itemId}
              onChange={setItemId}
              meta={(id) => `الرصيد ${items.find(i => i.id === id)?.currentQuantity ?? ''}`}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="الكمية" htmlFor="entry-quantity">
              <input
                id="entry-quantity"
                type="number"
                inputMode="decimal"
                min="1"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={inputClass + ' tabular-nums'}
                required
              />
            </Field>

            <Field
              label="تاريخ الحركة"
              htmlFor="entry-date"
              hint={week ? `ضمن أسبوع ${shortDay(week.start)} إلى ${shortDay(week.end)}` : undefined}
            >
              <input
                id="entry-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
          </div>

          {exceedsStock && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
              الكمية أكبر من الرصيد الحالي ({selectedItem!.currentQuantity})، وسيصبح الرصيد بالسالب.
            </p>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={loading || !itemId || !quantity}
              className={buttonClass('primary', 'w-full sm:w-auto sm:min-w-40')}
            >
              {loading ? 'جارٍ الحفظ...' : 'حفظ الحركة'}
            </button>
          </div>
        </form>
      </Card>
      </div>
      )}
    </div>
  );
};

export default DataEntry;
