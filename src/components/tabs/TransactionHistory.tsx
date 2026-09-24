import React, { useState, useMemo } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { History, Search, Pencil, Trash2, Check, X, Printer, Plus } from 'lucide-react';
import { Card, EmptyState, Field, PageHeader, StockValue, TableSkeleton, TxTypeBadge, buttonClass, iconButtonClass, inputClass, td, th, theadClass } from '../ui';
import { displayDay } from '../../lib/periods';
import ItemCombobox from '../ItemCombobox';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

const ROWS_PER_PAGE = 20;

const TransactionHistory: React.FC = () => {
  const { items, transactions, editTransaction, deleteTransaction, addTransaction, loading } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ type: 'إضافة' | 'استهلاك', quantity: string, date: string }>({ type: 'إضافة', quantity: '', date: '' });

  const [newTxDate, setNewTxDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newTxItemId, setNewTxItemId] = useState('');
  const [newTxType, setNewTxType] = useState<'إضافة' | 'استهلاك'>('إضافة');
  const [newTxQty, setNewTxQty] = useState('');

  const handleAddNewTransaction = async () => {
    if (!newTxItemId) return;
    const selectedItem = items.find(i => i.id === newTxItemId);
    if (!selectedItem) return;
    const numQty = Number(newTxQty);
    if (isNaN(numQty) || numQty <= 0) {
      toast.error('يرجى إدخال كمية صحيحة');
      return;
    }
    const success = await addTransaction(newTxItemId, selectedItem.name, newTxType, numQty, newTxDate);
    if (success) { setNewTxQty(''); }
  };

  const [filterItemId, setFilterItemId] = useState<string>('all');

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.itemName.includes(searchTerm);
    const matchesItem = filterItemId === 'all' || t.itemId === filterItemId;
    return matchesSearch && matchesItem;
  });

  const selectedFilterItem = items.find(i => i.id === filterItemId);

  // Running balance calculation and chunking for print
  const printPages = useMemo(() => {
    if (!selectedFilterItem) return [];
    const sorted = [...filteredTransactions].sort((a, b) => a.date.localeCompare(b.date));
    
    let netEffect = 0;
    sorted.forEach(tx => {
      if (tx.type === 'إضافة') netEffect += tx.quantity;
      else netEffect -= tx.quantity;
    });
    
    const startingBalance = selectedFilterItem.currentQuantity - netEffect;
    let runningBalance = startingBalance;
    
    const processedRows = sorted.map(tx => {
      if (tx.type === 'إضافة') runningBalance += tx.quantity;
      else runningBalance -= tx.quantity;
      return { ...tx, remaining: runningBalance };
    });

    // Chunk into pages of 20
    const pages = [];
    for (let i = 0; i < processedRows.length; i += ROWS_PER_PAGE) {
      pages.push(processedRows.slice(i, i + ROWS_PER_PAGE));
    }
    return pages;
  }, [filteredTransactions, selectedFilterItem]);

  const handleEditClick = (tx: any) => {
    setEditId(tx.id);
    setEditData({ type: tx.type, quantity: tx.quantity.toString(), date: tx.date });
  };

  const handleSaveEdit = async () => {
    if (!editId) return;
    const qty = Number(editData.quantity);
    if (isNaN(qty) || qty <= 0) { toast.error('الكمية غير صحيحة'); return; }
    await editTransaction(editId, { ...editData, quantity: qty });
    setEditId(null);
  };

  const handleDelete = async (txId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الحركة؟ سيتم تعديل رصيد الصنف تلقائياً.')) {
      await deleteTransaction(txId);
    }
  };

  const handlePrint = () => {
    const style = document.createElement('style');
    style.id = 'tx-print-override';
    // Remove all previous restrictions: use auto size, no fixed orientation
    style.textContent = `
      * { background: transparent !important; color: black !important; }
      @page { size: auto !important; margin: 15mm !important; }
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .print-page { break-after: page !important; }
      @media print {
        .no-print { display: none !important; }
        .print-only { display: block !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      const s = document.getElementById('tx-print-override');
      if (s) s.remove();
    }, 1500);
  };

  const typeOptions = (
    <>
      <option value="إضافة">وارد</option>
      <option value="استهلاك">منصرف</option>
    </>
  );

  return (
    <div>

      {/* ====== PRINT-ONLY CONTENT ====== */}
      {selectedFilterItem && (
        <div className="hidden print:block">
          {printPages.map((pageRows, pageIdx) => (
            <div key={pageIdx} className="print-page mb-8 last:mb-0" style={{ pageBreakAfter: 'always' }}>
              {/* Header on every page */}
              <div className="mb-6 border-b-2 border-slate-900 pb-4 text-center">
                <h1 className="mb-1 text-2xl font-bold text-slate-900">سجل حركات الصنف</h1>
                <h2 className="mb-2 text-lg font-semibold text-slate-700">الصنف: {selectedFilterItem.name}</h2>
                <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                  <span>تاريخ الطباعة: {format(new Date(), 'dd/MM/yyyy')}</span>
                  <span>صفحة {pageIdx + 1} من {printPages.length}</span>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-sm text-slate-900">
                    <th className="border border-slate-300 px-4 py-3 text-right font-bold" style={{ width: '25%' }}>التاريخ</th>
                    <th className="border border-slate-300 px-4 py-3 text-center font-bold" style={{ width: '25%' }}>النوع</th>
                    <th className="border border-slate-300 px-4 py-3 text-center font-bold" style={{ width: '25%' }}>الكمية</th>
                    <th className="border border-slate-300 px-4 py-3 text-center font-bold" style={{ width: '25%' }}>المتبقي</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-900">
                  {pageRows.map((tx) => (
                    <tr key={tx.id}>
                      <td className="whitespace-nowrap border border-slate-300 px-4 py-2.5 text-right">{tx.date}</td>
                      <td className="border border-slate-300 px-4 py-2.5 text-center">{tx.type}</td>
                      <td className="border border-slate-300 px-4 py-2.5 text-center font-bold">{tx.quantity}</td>
                      <td className="border border-slate-300 px-4 py-2.5 text-center font-bold">{tx.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures on the last page only */}
              {pageIdx === printPages.length - 1 && (
                <div className="page-break-inside-avoid mt-16 grid grid-cols-3 gap-8 border-t border-slate-200 pt-8 text-center text-sm font-bold text-slate-900">
                  <div>أمين العهدة<br/><br/>...................</div>
                  <div>المراجع<br/><br/>...................</div>
                  <div>المدير المختص<br/><br/>...................</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ====== SCREEN-ONLY CONTENT ====== */}
      <div className="no-print">
        <PageHeader
          title="سجل الحركات"
          description="كل الوارد والمنصرف في الوحدة الحالية. اختر صنفا لطباعة سجله برصيده المتبقي."
          actions={selectedFilterItem && (
            <button onClick={handlePrint} className={buttonClass('secondary')}>
              <Printer className="h-4 w-4" strokeWidth={1.75} />
              طباعة سجل الصنف
            </button>
          )}
        />

        {/* Quick add */}
        <Card className="mb-4">
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_2fr_1fr_1fr_auto] lg:items-end">
            <Field label="التاريخ" htmlFor="quick-date">
              <input id="quick-date" type="date" value={newTxDate} onChange={(e) => setNewTxDate(e.target.value)} className={inputClass} />
            </Field>
            <Field label="الصنف" htmlFor="quick-item">
              <ItemCombobox
                id="quick-item"
                items={items}
                value={newTxItemId}
                onChange={setNewTxItemId}
                placeholder="اختر صنفا"
                meta={(id) => `الرصيد ${items.find(i => i.id === id)?.currentQuantity ?? ''}`}
              />
            </Field>
            <Field label="النوع" htmlFor="quick-type">
              <select id="quick-type" value={newTxType} onChange={(e) => setNewTxType(e.target.value as 'إضافة' | 'استهلاك')} className={inputClass}>
                {typeOptions}
              </select>
            </Field>
            <Field label="الكمية" htmlFor="quick-qty">
              <input id="quick-qty" type="number" inputMode="decimal" min="1" value={newTxQty} onChange={(e) => setNewTxQty(e.target.value)} className={inputClass + ' tabular-nums'} />
            </Field>
            <button onClick={handleAddNewTransaction} disabled={!newTxItemId || !newTxQty || loading} className={buttonClass('primary', 'sm:col-span-2 lg:col-span-1')}>
              <Plus className="h-4 w-4" />
              إضافة
            </button>
          </div>
        </Card>

        <Card>
          {/* Filters */}
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <label htmlFor="history-search" className="sr-only">بحث باسم الصنف</label>
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="history-search"
                type="search"
                placeholder="ابحث باسم الصنف"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={inputClass + ' pr-9'}
              />
            </div>
            <label htmlFor="history-filter" className="sr-only">تصفية حسب الصنف</label>
            <ItemCombobox
              id="history-filter"
              items={items}
              value={filterItemId}
              onChange={setFilterItemId}
              leadingOption={{ id: 'all', name: 'كل الأصناف' }}
              className="sm:w-64"
            />
          </div>

          <div className="overflow-x-auto rounded-b-xl">
            {loading ? (
              <TableSkeleton rows={6} cols={4} />
            ) : filteredTransactions.length === 0 ? (
              <EmptyState
                icon={History}
                title="لا توجد حركات"
                hint={searchTerm || filterItemId !== 'all' ? 'لا شيء يطابق البحث الحالي. جرّب كلمة أخرى أو اختر كل الأصناف.' : 'ستظهر هنا كل حركة تسجلها من شاشة إضافة حركة أو من الإضافة السريعة أعلاه.'}
              />
            ) : (
              <table className="w-full min-w-[640px]">
                <thead className={theadClass}>
                  <tr>
                    <th className={th}>التاريخ</th>
                    <th className={th}>الصنف</th>
                    <th className={th}>النوع</th>
                    <th className={th + ' text-center'}>الكمية</th>
                    <th className={th + ' w-28'}><span className="sr-only">إجراءات</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map(tx => (
                    <tr key={tx.id} className={editId === tx.id ? 'bg-primary-50/40' : 'hover:bg-slate-50'}>
                      {editId === tx.id ? (
                        <>
                          <td className={td}>
                            <label htmlFor={`edit-date-${tx.id}`} className="sr-only">التاريخ</label>
                            <input id={`edit-date-${tx.id}`} type="date" value={editData.date} onChange={(e) => setEditData({...editData, date: e.target.value})} className={inputClass + ' py-1.5'} />
                          </td>
                          <td className={td + ' font-medium text-slate-900'}>{tx.itemName}</td>
                          <td className={td}>
                            <label htmlFor={`edit-type-${tx.id}`} className="sr-only">النوع</label>
                            <select id={`edit-type-${tx.id}`} value={editData.type} onChange={(e) => setEditData({...editData, type: e.target.value as 'إضافة' | 'استهلاك'})} className={inputClass + ' py-1.5'}>
                              {typeOptions}
                            </select>
                          </td>
                          <td className={td}>
                            <label htmlFor={`edit-qty-${tx.id}`} className="sr-only">الكمية</label>
                            <input id={`edit-qty-${tx.id}`} type="number" min="1" value={editData.quantity} onChange={(e) => setEditData({...editData, quantity: e.target.value})} className={inputClass + ' mx-auto w-24 py-1.5 text-center tabular-nums'} />
                          </td>
                          <td className={td}>
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={handleSaveEdit} className={iconButtonClass()} aria-label="حفظ التعديل"><Check className="h-4 w-4 text-primary-700" /></button>
                              <button onClick={() => setEditId(null)} className={iconButtonClass()} aria-label="إلغاء التعديل"><X className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={td + ' whitespace-nowrap tabular-nums text-slate-600'}>{displayDay(tx.date)}</td>
                          <td className={td + ' font-medium text-slate-900'}>{tx.itemName}</td>
                          <td className={td}><TxTypeBadge type={tx.type} /></td>
                          <td className={td + ' text-center font-semibold tabular-nums'}>{tx.quantity}</td>
                          <td className={td}>
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleEditClick(tx)} className={iconButtonClass()} aria-label={`تعديل حركة ${tx.itemName}`}><Pencil className="h-4 w-4" strokeWidth={1.75} /></button>
                              <button onClick={() => handleDelete(tx.id)} className={iconButtonClass('danger')} aria-label={`حذف حركة ${tx.itemName}`}><Trash2 className="h-4 w-4" strokeWidth={1.75} /></button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {selectedFilterItem && (
            <div className="flex items-center justify-between rounded-b-xl border-t border-slate-200 bg-slate-50 px-5 py-4">
              <span className="text-sm font-medium text-slate-700">الرصيد الحالي: {selectedFilterItem.name}</span>
              <span className="text-lg"><StockValue value={selectedFilterItem.currentQuantity} /></span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TransactionHistory;
