import React, { useState, useMemo } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { Printer, CalendarDays } from 'lucide-react';
import { format, startOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

const MonthlyReport: React.FC = () => {
  const { items, transactions } = useInventory();
  const { locations, activeLocationId } = useAuth();
  
  // Default to the first day of current month and today
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [startDateInput, setStartDateInput] = useState(format(firstDay, 'yyyy-MM-dd'));
  const [endDateInput, setEndDateInput] = useState(format(today, 'yyyy-MM-dd'));

  // Calculate Tuesday boundaries
  const startDate = startOfWeek(parseISO(startDateInput), { weekStartsOn: 2 }); // Tuesday
  const endDate = startOfWeek(parseISO(endDateInput), { weekStartsOn: 2 }); // Tuesday

  const activeLocation = locations.find(l => l.id === activeLocationId);

  const reportData = useMemo(() => {
    // 1. Filter consumptions in date range
    const periodConsumptions = transactions.filter(t => {
      const txDate = parseISO(t.date);
      return t.type === 'استهلاك' && isWithinInterval(txDate, { start: startDate, end: endDate });
    });

    // 2. Sum by item Id
    const consumptionMap: Record<string, number> = {};
    periodConsumptions.forEach(t => {
      consumptionMap[t.itemId] = (consumptionMap[t.itemId] || 0) + t.quantity;
    });

    // 3. Map to items and filter
    const report = items
      .filter(item => item.currentQuantity > 0 || consumptionMap[item.id] > 0)
      .map(item => ({
        id: item.id,
        name: item.name,
        currentStock: item.currentQuantity,
        consumption: consumptionMap[item.id] || 0
      }));

    return report;
  }, [items, transactions, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-4xl p-6 print:max-w-none print:p-0">
      
      {/* Controls - Hidden in print */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 no-print bg-white/70 backdrop-blur-xl p-6 rounded-2xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-50/50 p-2 text-primary-600 shadow-sm backdrop-blur-sm">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 font-serif tracking-tight">التقرير الشهري (جرد الرصيد)</h2>
              <p className="text-sm text-slate-500 mt-1">يعرض المنصرف والرصيد لفترة مخصصة (يتم ضبطها ليوم الثلاثاء)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">من (أي يوم)</label>
              <input
                type="date"
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
                className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-primary-600 bg-primary-50 focus:bg-white shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">إلى (أي يوم)</label>
              <input
                type="date"
                value={endDateInput}
                onChange={(e) => setEndDateInput(e.target.value)}
                className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-primary-600 bg-white/50 shadow-sm"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-slate-800 to-slate-900 px-6 py-2.5 font-semibold text-white hover:shadow-lg transition-all w-full sm:w-auto h-fit"
        >
          <Printer className="h-5 w-5" />
          طباعة التقرير
        </button>
      </div>

      {/* Printable Report Area */}
      <div className="bg-white/80 backdrop-blur-xl p-0 sm:p-8 rounded-none sm:rounded-2xl sm:border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] print:p-0 print:border-none print:shadow-none print:bg-transparent print:overflow-visible">
        
        {/* Official Header */}
        <div className="mb-8 border-b-2 border-slate-900 pb-6 text-center text-slate-900">
          <h1 className="text-2xl font-bold mb-2">{activeLocation?.name || '---'}</h1>
          <h2 className="text-xl font-semibold mb-4">كشف جرد عهدة الأدوية</h2>
          <div className="flex justify-between items-center text-sm font-medium mt-4">
             <div>الجهة: {activeLocation?.name || '---'}</div>
             <div dir="ltr">
               {format(startDate, 'dd/MM/yyyy')} - {format(endDate, 'dd/MM/yyyy')}
             </div>
          </div>
        </div>

        <div className="overflow-x-auto print:overflow-visible">
          {reportData.length === 0 ? (
             <div className="text-center py-8 text-slate-500 no-print">لا توجد بيانات لهذه الفترة.</div>
          ) : (
            <table className="w-full text-right border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100/80 text-sm text-slate-900 print:bg-slate-100">
                  <th className="border border-slate-300 py-3 px-4 font-bold w-12 text-center">م</th>
                  <th className="border border-slate-300 py-3 px-4 font-bold">اسم الصنف</th>
                  <th className="border border-slate-300 py-3 px-4 font-bold text-center w-32">المنصرف</th>
                  <th className="border border-slate-300 py-3 px-4 font-bold text-center w-40">الرصيد الدفتري والفِعلي</th>
                  <th className="border border-slate-300 py-3 px-4 font-bold w-32">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="text-slate-900 text-sm">
                {reportData.map((row, index) => (
                  <tr key={row.id}>
                    <td className="border border-slate-300 py-2 px-4 text-center">{index + 1}</td>
                    <td className="border border-slate-300 py-2 px-4 font-medium">{row.name}</td>
                    <td className="border border-slate-300 py-2 px-4 text-center font-semibold">{row.consumption}</td>
                    <td className="border border-slate-300 py-2 px-4 text-center font-bold">{row.currentStock}</td>
                    <td className="border border-slate-300 py-2 px-4"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Signatures */}
        <div className="mt-16 grid grid-cols-3 gap-4 text-center text-sm font-bold text-slate-900 border-t border-slate-200 pt-8 mt-auto page-break-inside-avoid">
          <div>أمين العهدة<br/><br/>...................</div>
          <div>لجنة الجرد<br/><br/>...................</div>
          <div>يعتمد، مدير الوحدة<br/><br/>...................</div>
        </div>
      </div>

    </div>
  );
};

export default MonthlyReport;
