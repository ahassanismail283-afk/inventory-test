import React, { useState, useMemo } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { Printer, CalendarRange, FileText } from 'lucide-react';
import { displayDay, summarizePeriod } from '../../lib/periods';
import { Card, EmptyState, Field, PageHeader, buttonClass, inputClass } from '../ui';
import { useAuth } from '../../contexts/AuthContext';

const MonthlyReport: React.FC = () => {
  const { items, transactions } = useInventory();
  const { locations, activeLocationId } = useAuth();
  
  // The custody month (first Wednesday → last Tuesday) varies, so both dates are always
  // entered manually and used exactly as given.
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');

  const hasValidRange = !!startDateInput && !!endDateInput && startDateInput <= endDateInput;

  const activeLocation = locations.find(l => l.id === activeLocationId);

  // Items that were in stock at period end or consumed during it
  const reportData = useMemo(() => {
    if (!hasValidRange) return [];
    return summarizePeriod(items, transactions, startDateInput, endDateInput)
      .filter(row => row.closingBalance > 0 || row.consumption > 0);
  }, [items, transactions, startDateInput, endDateInput, hasValidRange]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print:max-w-none">
      <PageHeader
        title="تقرير شهري"
        description="المنصرف والرصيد المتبقي من أول أربعاء إلى آخر ثلاثاء في شهر العهدة."
      />

      {/* Controls - Hidden in print */}
      <Card className="mb-4 no-print">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="من (أول أربعاء)" htmlFor="month-start">
              <input
                id="month-start"
                type="date"
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="إلى (آخر ثلاثاء)" htmlFor="month-end">
              <input
                id="month-end"
                type="date"
                value={endDateInput}
                onChange={(e) => setEndDateInput(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <button onClick={handlePrint} className={buttonClass('primary')} disabled={reportData.length === 0}>
            <Printer className="h-4 w-4" strokeWidth={1.75} />
            طباعة الكشف
          </button>
        </div>
      </Card>

      {/* Printable Report Area */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8 print:rounded-none print:border-none print:p-0">

        {/* Official Header */}
        <div className="mb-6 border-b-2 border-slate-900 pb-5 text-center text-slate-900">
          <p className="text-lg font-bold">{activeLocation?.name || '---'}</p>
          <h2 className="mt-1 text-xl font-bold">كشف جرد عهدة الأدوية</h2>
          <div className="mt-4 flex items-center justify-between text-sm font-medium">
            <div>الجهة: {activeLocation?.name || '---'}</div>
            <div dir="ltr" className="tabular-nums">
              {hasValidRange ? `${displayDay(startDateInput)} - ${displayDay(endDateInput)}` : '---'}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto print:overflow-visible">
          {!hasValidRange ? (
            <div className="no-print">
              <EmptyState
                icon={CalendarRange}
                title={startDateInput && endDateInput ? 'تاريخ البداية بعد تاريخ النهاية' : 'حدد فترة شهر العهدة'}
                hint={startDateInput && endDateInput ? 'صحّح التاريخين ليظهر الكشف.' : 'اختر أول أربعاء وآخر ثلاثاء في الشهر ليظهر الكشف.'}
              />
            </div>
          ) : reportData.length === 0 ? (
            <div className="no-print">
              <EmptyState icon={FileText} title="لا توجد بيانات لهذه الفترة" />
            </div>
          ) : (
            <table className="w-full border-collapse border border-slate-300 text-right">
              <thead>
                <tr className="bg-slate-100 text-sm text-slate-900">
                  <th className="w-12 border border-slate-300 px-4 py-3 text-center font-bold">م</th>
                  <th className="border border-slate-300 px-4 py-3 font-bold">اسم الصنف</th>
                  <th className="w-32 border border-slate-300 px-4 py-3 text-center font-bold">المنصرف</th>
                  <th className="w-40 border border-slate-300 px-4 py-3 text-center font-bold">الرصيد الدفتري والفِعلي</th>
                  <th className="w-32 border border-slate-300 px-4 py-3 font-bold">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-900">
                {reportData.map((row, index) => (
                  <tr key={row.id}>
                    <td className="border border-slate-300 px-4 py-2 text-center tabular-nums">{index + 1}</td>
                    <td className="border border-slate-300 px-4 py-2 font-medium">{row.name}</td>
                    <td className="border border-slate-300 px-4 py-2 text-center font-semibold tabular-nums">{row.consumption}</td>
                    <td className="border border-slate-300 px-4 py-2 text-center font-bold tabular-nums">{row.closingBalance}</td>
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
          <div>لجنة الجرد<br/><br/>...................</div>
          <div>يعتمد، مدير الوحدة<br/><br/>...................</div>
        </div>
      </div>

    </div>
  );
};

export default MonthlyReport;
