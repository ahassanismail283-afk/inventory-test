import React, { useState, useMemo } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { History, Search, Edit2, Trash2, Check, X, Printer } from 'lucide-react';
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

  return (
    <div className="mx-auto max-w-6xl p-6 print:max-w-none print:p-0">
      
      {/* ====== PRINT-ONLY CONTENT ====== */}
      {selectedFilterItem && (
        <div className="hidden print:block">
          {printPages.map((pageRows, pageIdx) => (
            <div key={pageIdx} className="print-page mb-8 last:mb-0" style={{ pageBreakAfter: 'always' }}>
              {/* Header on every page */}
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                <h1 className="text-2xl font-bold text-slate-900 mb-1 font-serif tracking-tight">سجل حركات الصنف</h1>
                <h2 className="text-lg font-semibold text-slate-700 mb-2">الصنف: {selectedFilterItem.name}</h2>
                <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                  <span>تاريخ الطباعة: {format(new Date(), 'dd/MM/yyyy')}</span>
                  <span>صفحة {pageIdx + 1} من {printPages.length}</span>
                </div>
              </div>

              {/* Table - Matching Web App Aesthetic */}
              <table className="w-full border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100/80 text-sm text-slate-900">
                    <th className="border border-slate-300 py-3 px-4 font-bold text-right" style={{ width: '25%' }}>التاريخ</th>
                    <th className="border border-slate-300 py-3 px-4 font-bold text-center" style={{ width: '25%' }}>النوع</th>
                    <th className="border border-slate-300 py-3 px-4 font-bold text-center" style={{ width: '25%' }}>الكمية</th>
                    <th className="border border-slate-300 py-3 px-4 font-bold text-center" style={{ width: '25%' }}>المتبقي</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-900">
                  {pageRows.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="border border-slate-300 py-2.5 px-4 text-right whitespace-nowrap">{tx.date}</td>
                      <td className="border border-slate-300 py-2.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tx.type === 'إضافة' ? 'bg-primary-50 text-primary-700' : 'bg-orange-50 text-orange-700'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="border border-slate-300 py-2.5 px-4 text-center font-bold">{tx.quantity}</td>
                      <td className="border border-slate-300 py-2.5 px-4 text-center font-bold bg-slate-50/50">{tx.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures on the last page only */}
              {pageIdx === printPages.length - 1 && (
                <div className="mt-16 grid grid-cols-3 gap-8 text-center text-sm font-bold text-slate-900 border-t border-slate-200 pt-8 page-break-inside-avoid">
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
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-50/50 p-2.5 text-primary-600 shadow-sm backdrop-blur-sm">
              <History className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 font-serif tracking-tight">سجل الحركات</h2>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {selectedFilterItem && (
              <button 
                onClick={handlePrint} 
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-slate-800 to-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all w-full sm:w-auto hover:-translate-y-0.5"
              >
                <Printer className="h-4 w-4" />
                طباعة السجل
              </button>
            )}
            <select 
              value={filterItemId} 
              onChange={(e) => setFilterItemId(e.target.value)} 
              className="w-full sm:w-auto rounded-xl border border-slate-200 py-2.5 pl-4 pr-10 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white/50 backdrop-blur-sm shadow-sm"
            >
              <option value="all">كل الأصناف</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="بحث سريع..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-4 pr-10 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white/50 backdrop-blur-sm shadow-sm" 
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-white/40">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12 text-slate-500 font-medium animate-pulse">جاري التحميل...</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-medium">لا توجد حركات لعرضها.</div>
            ) : (
              <table className="w-full min-w-[800px] text-right">
                <thead>
                  <tr className="bg-slate-50/50 text-sm text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6 font-semibold whitespace-nowrap hidden lg:table-cell">تاريخ الحركة</th>
                    <th className="py-4 px-6 font-semibold">الصنف</th>
                    <th className="py-4 px-6 font-semibold text-center">النوع</th>
                    <th className="py-4 px-6 font-semibold text-center">الكمية</th>
                    <th className="py-4 px-6 font-semibold text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  <tr className="bg-primary-50/20 hover:bg-primary-50/30 transition-colors">
                    <td className="py-3 px-4"><input type="date" value={newTxDate} onChange={(e) => setNewTxDate(e.target.value)} className="border border-slate-300 p-1.5 rounded-lg text-sm w-full focus:ring-1 focus:ring-primary-500" /></td>
                    <td className="py-3 px-4">
                      <select value={newTxItemId} onChange={(e) => setNewTxItemId(e.target.value)} className="border border-slate-300 p-1.5 rounded-lg text-sm w-full focus:ring-1 focus:ring-primary-500">
                        <option value="" disabled>اختر صنفاً...</option>
                        {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <select value={newTxType} onChange={(e) => setNewTxType(e.target.value as 'إضافة' | 'استهلاك')} className="border border-slate-300 p-1.5 rounded-lg text-sm focus:ring-1 focus:ring-primary-500">
                        <option value="إضافة">إضافة</option>
                        <option value="استهلاك">استهلاك</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-center"><input type="number" min="1" placeholder="الكمية" value={newTxQty} onChange={(e) => setNewTxQty(e.target.value)} className="border border-slate-300 p-1.5 rounded-lg text-sm w-20 text-center focus:ring-1 focus:ring-primary-500" /></td>
                    <td className="py-4 px-6 text-left">
                      <button onClick={handleAddNewTransaction} disabled={!newTxItemId || !newTxQty} className="flex items-center justify-center gap-1.5 bg-gradient-to-l from-primary-600 to-primary-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:shadow-md disabled:opacity-50 mx-auto lg:mr-auto lg:ml-0 transition-all hover:scale-105 active:scale-95">
                        <Check className="h-4 w-4" /> اضافة
                      </button>
                    </td>
                  </tr>
                  {filteredTransactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                      {editId === tx.id ? (
                        <>
                          <td className="py-3 px-4"><input type="date" value={editData.date} onChange={(e) => setEditData({...editData, date: e.target.value})} className="border p-1.5 rounded-lg" /></td>
                          <td className="py-3 px-4 font-medium text-slate-900">{tx.itemName}</td>
                          <td className="py-3 px-4 text-center">
                            <select value={editData.type} onChange={(e) => setEditData({...editData, type: e.target.value as 'إضافة' | 'استهلاك'})} className="border p-1.5 rounded-lg">
                              <option value="إضافة">إضافة</option>
                              <option value="استهلاك">استهلاك</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-center"><input type="number" min="1" value={editData.quantity} onChange={(e) => setEditData({...editData, quantity: e.target.value})} className="border p-1.5 rounded-lg w-20 text-center" /></td>
                          <td className="py-3 px-4 text-left">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={handleSaveEdit} className="text-green-600 hover:bg-green-50 p-2 rounded-xl transition-colors"><Check className="h-5 w-5" /></button>
                              <button onClick={() => setEditId(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-xl transition-colors"><X className="h-5 w-5" /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-4 px-6 whitespace-nowrap text-slate-500 text-sm hidden lg:table-cell group-hover:text-slate-700 transition-colors">{tx.date}</td>
                          <td className="py-4 px-6 font-semibold text-slate-800">{tx.itemName}<div className="lg:hidden text-xs text-slate-400 mt-1">{tx.date}</div></td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${tx.type === 'إضافة' ? 'bg-primary-50 text-primary-700' : 'bg-orange-50 text-orange-700'}`}>{tx.type}</span>
                          </td>
                          <td className="py-4 px-6 text-center font-bold text-slate-700">{tx.quantity}</td>
                          <td className="py-4 px-6 text-left">
                            <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEditClick(tx)} className="text-slate-400 hover:text-primary-600 hover:bg-primary-50 p-2 rounded-xl transition-colors"><Edit2 className="h-4 w-4" /></button>
                              <button onClick={() => handleDelete(tx.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-colors"><Trash2 className="h-4 w-4" /></button>
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
            <div className="bg-slate-50/80 p-6 border-t border-slate-200">
              <div className="flex justify-between items-center text-lg font-bold text-slate-900 font-serif">
                <span>الرصيد الحالي للصنف:</span>
                <span className="text-primary-700 bg-white px-4 py-1 rounded-xl shadow-sm border border-primary-100">{selectedFilterItem.currentQuantity}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;
