import React, { useState, useMemo } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { displayDay, formatDay, shortDay, weekRange, summarizePeriod } from '../../lib/periods';
import { Card, EmptyState, Field, PageHeader, buttonClass, inputClass } from '../ui';
import { CalendarDays, Printer } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const WeeklyReport: React.FC = () => {
  const { items, transactions } = useInventory();
  const { locations, activeLocationId } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(formatDay(new Date()));

  // The Wednesday → Tuesday week containing selectedDate
  const { start, end } = weekRange(selectedDate);

  const activeLocation = locations.find(l => l.id === activeLocationId);

  // Only items consumed during the week
  const reportData = useMemo(
    () => summarizePeriod(items, transactions, start, end).filter(row => row.consumption > 0),
    [items, transactions, start, end]
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print:max-w-none">
      <PageHeader
        title="تقرير أسبوعي"
        description="المنصرف خلال أسبوع العهدة، من الأربعاء إلى الثلاثاء، مع الرصيد المتبقي في آخر يوم."
      />

      {/* Controls - Hidden in print */}
      <Card className="mb-4 no-print">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="sm:w-64">
            <Field
              label="أي يوم داخل الأسبوع المطلوب"
              htmlFor="week-day"
              hint={`الأسبوع: ${shortDay(start)} إلى ${shortDay(end)}`}
            >
              <input
                id="week-day"
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <button onClick={handlePrint} className={buttonClass('primary')} disabled={reportData.length === 0}>
            <Printer className="h-4 w-4" strokeWidth={1.75} />
            طباعة التقرير
          </button>
        </div>
      </Card>

      {/* Printable Report Area */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8 print:rounded-none print:border-none print:p-0">

        {/* Official Header */}
        <div className="mb-6 border-b-2 border-slate-900 pb-5 text-center text-slate-900">
          <p className="text-lg font-bold">{activeLocation?.name || '---'}</p>
          <h2 className="mt-1 text-xl font-bold">التقرير الأسبوعي للاستهلاك</h2>
          <div className="mt-4 flex items-center justify-between text-sm font-medium">
            <div>الجهة: {activeLocation?.name || '---'}</div>
            <div dir="ltr" className="tabular-nums">
              {displayDay(start)} - {displayDay(end)}
            </div>
          </div>
        </div>

        <div className="relative overflow-x-auto print:overflow-visible">
          {reportData.length === 0 ? (
            <div className="no-print">
              <EmptyState icon={CalendarDays} title="لا يوجد منصرف في هذا الأسبوع" hint="اختر يوما من أسبوع آخر، أو سجّل المنصرف من شاشة إضافة حركة." />
            </div>
          ) : (
            <table className="w-full border-collapse border border-slate-300 text-right">
              <thead>
                <tr className="bg-slate-100 text-sm text-slate-900">
                  <th className="w-12 border border-slate-300 px-4 py-3 text-center font-bold">م</th>
                  <th className="border border-slate-300 px-4 py-3 font-bold">اسم الصنف</th>
                  <th className="w-32 border border-slate-300 px-4 py-3 text-center font-bold">المنصرف</th>
                  <th className="w-32 border border-slate-300 px-4 py-3 text-center font-bold">الرصيد المتبقي</th>
                  <th className="w-32 border border-slate-300 px-4 py-3 font-bold">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-900">
                {reportData.map((row, index) => (
                  <tr key={row.id}>
                    <td className="border border-slate-300 px-4 py-2 text-center tabular-nums">{index + 1}</td>
                    <td className="border border-slate-300 px-4 py-2 font-medium">{row.name}</td>
                    <td className="border border-slate-300 px-4 py-2 text-center font-semibold tabular-nums">{row.consumption}</td>
                    <td className="border border-slate-300 px-4 py-2 text-center tabular-nums">{row.closingBalance}</td>
                    <td className="border border-slate-300 px-4 py-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Signatures */}
        <div className="page-break-inside-avoid mt-16 grid grid-cols-3 gap-4 border-t border-slate-200 pt-8 text-center text-sm font-bold text-slate-900">
          <div>أمين العهدة<br/><br/>...................</div>
          <div>الطبيب المسئول<br/><br/>...................</div>
          <div>مدير الوحدة<br/><br/>...................</div>
        </div>
      </div>

    </div>
  );
};

export default WeeklyReport;
