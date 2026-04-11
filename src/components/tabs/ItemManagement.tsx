import React, { useState } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Package, Plus } from 'lucide-react';

const ItemManagement: React.FC = () => {
  const { items, fetchItems, loading } = useInventory();
  const { activeLocationId } = useAuth();
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleAddSingleItem = async () => {
    const name = newItemName.trim();
    if (!name || !activeLocationId) return;
    
    setIsImporting(true);

    const existingNames = new Set(items.map(i => i.name));
    if (existingNames.has(name)) {
      toast.error('هذا الصنف موجود مسبقاً.');
      setIsImporting(false);
      return;
    }

    const initialQty = Number(newItemQty) || 0;

    try {
      // Create the item
      const { data: itemData, error } = await supabase
        .from('items')
        .insert({
          name,
          currentQuantity: initialQty,
          locationId: activeLocationId,
        })
        .select()
        .single();
        
      if (error) throw error;

      // If initial stock > 0, record an addition transaction manually to keep ledger accurate
      if (initialQty > 0 && itemData) {
        const { error: txError } = await supabase.from('transactions').insert({
          itemId: itemData.id,
          itemName: itemData.name,
          type: 'إضافة',
          quantity: initialQty,
          date: new Date().toISOString().split('T')[0],
          locationId: activeLocationId,
          // note: userId not strictly required if bypassed here, but could be problematic if strict RLS is enforced later
        });
        if (txError) console.error("Could not record initial transaction", txError);
      }

      toast.success('تمت إضافة الصنف بنجاح!');
      setNewItemName('');
      setNewItemQty('');
      await fetchItems();
    } catch (err: any) {
      console.error(err);
      toast.error('فشل في إضافة الصنف: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl bg-primary-50/50 p-2.5 text-primary-600 shadow-sm backdrop-blur-sm">
          <Package className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 font-serif tracking-tight">إدارة الأصناف المخزنية</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Add Single Item */}
        <div className="lg:col-span-1 rounded-2xl border border-white/40 bg-white/70 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-fit">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">إضافة صنف جديد</h3>
          <p className="text-sm text-slate-500 mb-4">
            قم بإدخال اسم الصنف والرصيد الافتتاحي له.
          </p>
          
          <div className="space-y-4 mb-4 text-right">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم الصنف</label>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-primary-600 bg-white/50 shadow-sm transition-all text-sm"
                placeholder="أدخل اسم الصنف..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الكمية الافتتاحية</label>
              <input
                type="number"
                min="0"
                value={newItemQty}
                onChange={(e) => setNewItemQty(e.target.value)}
                className="w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-primary-600 bg-white/50 shadow-sm transition-all text-sm"
                placeholder="0"
              />
            </div>
          </div>

          <button
            onClick={handleAddSingleItem}
            disabled={isImporting || !newItemName.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-primary-600 to-primary-500 px-4 py-3.5 mt-auto font-bold text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
          >
            <Plus className="h-5 w-5" />
            {isImporting ? 'جاري الإضافة...' : 'إضافة الصنف'}
          </button>
        </div>

        {/* Items Grid */}
        <div className="lg:col-span-2 rounded-2xl border border-white/40 bg-white/70 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-semibold text-slate-800 tracking-tight">الأصناف الحالية ({items.length})</h3>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12 text-slate-500 font-medium">جاري التحميل...</div>
            ) : items.length === 0 ? (
               <div className="text-center py-12 text-slate-500 bg-white/50 rounded-xl font-medium">لا توجد أصناف في هذا الموقع بعد.</div>
            ) : (
              <table className="w-full min-w-[500px] text-right">
                <thead>
                  <tr className="bg-slate-50/50 text-sm text-slate-500 uppercase tracking-wider">
                     <th className="py-4 px-6 font-semibold">الصنف</th>
                     <th className="py-4 px-6 font-semibold text-center rounded-tl-xl">الرصيد الحالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-800">{item.name}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[3rem] px-3 py-1 rounded-full text-sm font-bold tracking-wide ${item.currentQuantity <= 0 ? 'bg-red-50 text-red-700' : 'bg-primary-50 text-primary-700'}`}>
                          {item.currentQuantity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemManagement;
