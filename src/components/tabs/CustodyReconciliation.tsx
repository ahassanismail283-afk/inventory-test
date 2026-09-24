import React, { useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { CalendarRange, ClipboardCheck, Printer, Trash2 } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { useReconciliations } from '../../hooks/useReconciliations';
import { useAuth } from '../../contexts/AuthContext';
import { displayDay, formatDay, itemLedgers } from '../../lib/periods';
import {
  Card, CardTitle, EmptyState, Field, PageHeader, TxTypeBadge,
  buttonClass, cx, iconButtonClass, inputClass,
} from '../ui';

type RangeMode = 'reconciliation' | 'custom';

const CustodyReconciliation: React.FC = () => {
  const { items, transactions } = useInventory();
  const { reconciliations, loading, addReconciliation, deleteReconciliation } = useReconciliations();
  const { locations, activeLocationId, profile } = useAuth();
  const activeLocation = locations.find(l => l.id === activeLocationId);
  const today = formatDay(new Date());

  // Record a reconciliation
  const [newDate, setNewDate] = useState(today);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;
    setSaving(true);
    if (await addReconciliation(newDate, newNote)) setNewNote('');
    setSaving(false);
  };

  const handleDelete = async (id: string, date: string) => {
    if (window.confirm(`حذف مطابقة ${displayDay(date)}؟ لن تتأثر الأرصدة أو الحركات.`)) {
      await deleteReconciliation(id);
    }
  };

  // Report range
  const [mode, setMode] = useState<RangeMode>('reconciliation');
  const [chosenId, setChosenId] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Reconciliations are newest first; default to the latest one
  const chosen = reconciliations.find(r => r.id === chosenId) ?? reconciliations[0];

  const range = useMemo(() => {
    if (mode === 'custom') {
      if (!customStart || !customEnd || customStart > customEnd) return null;
      return { start: customStart, end: customEnd, openingLabel: `الرصيد في بداية ${displayDay(customStart)}`, until: null as string | null };
    }
    if (!chosen) return null;
    // The matched balance is the balance at the end of the reconciliation day, so the report
    // starts the next day and runs to the following reconciliation (inclusive) or today.
    const next = [...reconciliations].reverse().find(r => r.date > chosen.date);
    return {
      start: formatDay(addDays(parseISO(chosen.date), 1)),
      end: next ? next.date : today,
      openingLabel: `الرصيد عند مطابقة ${displayDay(chosen.date)}`,
      until: next ? `مطابقة ${displayDay(next.date)}` : 'اليوم',
    };
  }, [mode, chosen, reconciliations, customStart, customEnd, today]);

  // Every item that held stock at the reconciliation (period start), plus any item that moved
  // during the period or holds stock at its end
  const ledgers = useMemo(() => {
    if (!range) return [];
    return itemLedgers(items, transactions, range.start, range.end)
      .filter(l => l.openingBalance !== 0 || l.rows.length > 0 || l.closingBalance !== 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [items, transactions, range]);

  const segment = (value: RangeMode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      aria-pressed={mode === value}
      className={cx(
        'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        mode === value ? 'bg-white text-primary-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
      )}
    >
      {label}
    </button>
  );

  return (
    <div>
      <PageHeader
        title="مطابقة العهدة"
        description="سجّل تاريخ كل مطابقة للعهدة، واطبع حركة الأصناف منذ آخر مطابقة أو لأي فترة تحددها."
      />

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr] lg:items-start no-print">
        {/* Record + history */}
        <div className="space-y-4">
          <Card>
            <CardTitle>تسجيل مطابقة</CardTitle>
            <form onSubmit={handleAdd} className="space-y-4 p-5 pt-3">
              <Field label="تاريخ المطابقة" htmlFor="rec-date">
                <input id="rec-date" type="date" value={newDate} max={today} onChange={(e) => setNewDate(e.target.value)} className={inputClass} required />
              </Field>
              <Field label="ملاحظة (اختيارية)" htmlFor="rec-note">
                <input id="rec-note" type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} className={inputClass} />
              </Field>
              <button type="submit" disabled={saving || !newDate} className={buttonClass('primary', 'w-full')}>
                <ClipboardCheck className="h-4 w-4" />
                {saving ? 'جارٍ الحفظ...' : 'تسجيل المطابقة'}
              </button>
            </form>
          </Card>

          <Card>
            <CardTitle aside={<span className="text-xs text-slate-500">{reconciliations.length} مطابقة</span>}>المطابقات السابقة</CardTitle>
            {loading && reconciliations.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-slate-600">جارٍ التحميل...</p>
            ) : reconciliations.length === 0 ? (
              <EmptyState icon={ClipboardCheck} title="لا توجد مطابقات بعد" hint="سجّل أول مطابقة من النموذج أعلاه." />
            ) : (
              <ul className="px-2 pb-2">
                {reconciliations.map(r => (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold tabular-nums text-slate-900">{displayDay(r.date)}</p>
                      {r.note && <p className="truncate text-xs text-slate-600">{r.note}</p>}
                    </div>
                    {profile?.role === 'ADMIN' && (
                      <button onClick={() => handleDelete(r.id, r.date)} className={iconButtonClass('danger')} aria-label={`حذف مطابقة ${displayDay(r.date)}`}>
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Report range */}
        <Card>
          <CardTitle>طباعة التقرير</CardTitle>
          <div className="space-y-4 p-5 pt-3">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {segment('reconciliation', 'من تاريخ مطابقة')}
              {segment('custom', 'فترة أحددها')}
            </div>

            {mode === 'reconciliation' ? (
              reconciliations.length === 0 ? (
                <p className="text-sm text-slate-600">سجّل مطابقة أولا لتطبع التقرير منها.</p>
              ) : (
                <Field
                  label="ابدأ التقرير من مطابقة"
                  htmlFor="rec-choose"
                  hint={range ? `يشمل الحركات من ${displayDay(range.start)} حتى ${range.until}.` : undefined}
                >
                  <select id="rec-choose" value={chosen?.id ?? ''} onChange={(e) => setChosenId(e.target.value)} className={inputClass}>
                    {reconciliations.map((r, i) => (
                      <option key={r.id} value={r.id}>
                        {displayDay(r.date)}{i === 0 ? ' (آخر مطابقة)' : ''}{r.note ? `، ${r.note}` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              )
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="من" htmlFor="rec-start">
                  <input id="rec-start" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className={inputClass} />
                </Field>
                <Field label="إلى" htmlFor="rec-end">
                  <input id="rec-end" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className={inputClass} />
                </Field>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                {range ? `${ledgers.length} صنف في التقرير، كل صنف في صفحة.` : 'حدد الفترة ليظهر التقرير.'}
              </p>
              <button onClick={() => window.print()} disabled={!range || ledgers.length === 0} className={buttonClass('primary')}>
                <Printer className="h-4 w-4" strokeWidth={1.75} />
                طباعة التقرير
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Report: previewed on screen, one item per printed page */}
      {range && (
        <div className="mt-6 space-y-4 print:mt-0 print:space-y-0">
          {ledgers.length === 0 ? (
            <Card className="no-print">
              <EmptyState icon={CalendarRange} title="لا توجد حركات ولا أرصدة في هذه الفترة" />
            </Card>
          ) : (
            ledgers.map((l, idx) => (
              <section
                key={l.id}
                className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card sm:p-7 print:rounded-none print:border-none print:p-0 print:shadow-none"
                style={{ breakAfter: idx === ledgers.length - 1 ? 'auto' : 'page' }}
              >
                <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
                  <div>
                    <p className="text-sm text-slate-600">{activeLocation?.name} · تقرير مطابقة العهدة</p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-900">{l.name}</h2>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-slate-600">الرصيد المتبقي في <bdi dir="ltr">{displayDay(range.end)}</bdi></p>
                    <p className="text-4xl font-bold tabular-nums text-primary-700">{l.closingBalance}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-600">
                  الفترة: <bdi dir="ltr">{displayDay(range.start)} - {displayDay(range.end)}</bdi>
                </p>

                <table className="mt-3 w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="border border-slate-300 px-3 py-2 text-right font-semibold">التاريخ</th>
                      <th className="border border-slate-300 px-3 py-2 text-right font-semibold">نوع العملية</th>
                      <th className="border border-slate-300 px-3 py-2 text-center font-semibold">الكمية</th>
                      <th className="border border-slate-300 px-3 py-2 text-center font-semibold">المتبقي بعدها</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-primary-50/50">
                      <td className="border border-slate-300 px-3 py-2 text-slate-700" colSpan={3}>{range.openingLabel}</td>
                      <td className="border border-slate-300 px-3 py-2 text-center font-bold tabular-nums">{l.openingBalance}</td>
                    </tr>
                    {l.rows.length === 0 ? (
                      <tr>
                        <td className="border border-slate-300 px-3 py-2 text-slate-600" colSpan={4}>لا توجد حركات في هذه الفترة.</td>
                      </tr>
                    ) : (
                      l.rows.map(row => (
                        <tr key={row.id} style={{ breakInside: 'avoid' }}>
                          <td className="border border-slate-300 px-3 py-2 tabular-nums"><bdi dir="ltr">{displayDay(row.date)}</bdi></td>
                          <td className="border border-slate-300 px-3 py-2"><TxTypeBadge type={row.type} /></td>
                          <td className="border border-slate-300 px-3 py-2 text-center tabular-nums">{row.quantity}</td>
                          <td className="border border-slate-300 px-3 py-2 text-center font-semibold tabular-nums">{row.remaining}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {idx === ledgers.length - 1 && (
                  <div className="mt-14 grid grid-cols-3 gap-4 border-t border-slate-200 pt-8 text-center text-sm font-bold text-slate-900" style={{ breakInside: 'avoid' }}>
                    <div>أمين العهدة<br /><br />...................</div>
                    <div>لجنة المطابقة<br /><br />...................</div>
                    <div>يعتمد، مدير الوحدة<br /><br />...................</div>
                  </div>
                )}
                <p className="mt-4 hidden text-[10px] text-slate-500 print:block">طُبع في {format(new Date(), 'dd/MM/yyyy')}</p>
              </section>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CustodyReconciliation;
