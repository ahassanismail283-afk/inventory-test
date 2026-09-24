import React, { useState } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { findMatchingItems } from '../../lib/itemNames';
import { Package, Plus, Trash2 } from 'lucide-react';
import { Card, CardTitle, EmptyState, Field, PageHeader, StockValue, TableSkeleton, buttonClass, iconButtonClass, inputClass, td, th, theadClass } from '../ui';

const ItemManagement: React.FC = () => {
  const { items, fetchItems, loading, deleteItem } = useInventory();
  const { activeLocationId } = useAuth();
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleAddSingleItem = async () => {
    const name = newItemName.trim();
    if (!name || !activeLocationId) return;
    
    setIsImporting(true);

    // Same name once spelling variants are folded: refuse. Close names: ask first.
    const match = findMatchingItems(name, items);
    if (match.exact) {
      toast.error(`هذا الصنف موجود مسبقا باسم «${match.exact.name}».`);
      setIsImporting(false);
      return;
    }
    if (match.similar.length > 0 && !window.confirm(
      `الاسم «${name}» يشبه أصنافا موجودة:\n${match.similar.map(m => `- ${m.name}`).join('\n')}\n\nهل هو صنف مختلف فعلا وتريد إضافته؟`
    )) {
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

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (window.confirm(`هل أنت متأكد من رغبتك في حذف الصنف "${itemName}"؟\nسيتم أيضاً حذف جميع الحركات المرتبطة بهذا الصنف!`)) {
      await deleteItem(itemId);
    }
  };

  const outOfStock = items.filter(i => i.currentQuantity <= 0).length;

  return (
    <div>
      <PageHeader title="الأصناف" description="أصناف العهدة في الوحدة الحالية وأرصدتها." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr] lg:items-start">

        {/* Add Single Item */}
        <Card>
          <CardTitle>صنف جديد</CardTitle>
          <form
            onSubmit={(e) => { e.preventDefault(); handleAddSingleItem(); }}
            className="space-y-4 p-5"
          >
            <Field label="اسم الصنف" htmlFor="new-item-name">
              <input
                id="new-item-name"
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="الرصيد الافتتاحي" htmlFor="new-item-qty" hint="يُسجَّل كحركة وارد بتاريخ اليوم.">
              <input
                id="new-item-qty"
                type="number"
                inputMode="decimal"
                min="0"
                value={newItemQty}
                onChange={(e) => setNewItemQty(e.target.value)}
                className={inputClass + ' tabular-nums'}
                placeholder="0"
              />
            </Field>
            <button
              type="submit"
              disabled={isImporting || !newItemName.trim()}
              className={buttonClass('primary', 'w-full')}
            >
              <Plus className="h-4 w-4" />
              {isImporting ? 'جارٍ الإضافة...' : 'إضافة الصنف'}
            </button>
          </form>
        </Card>

        {/* Items list */}
        <Card className="overflow-hidden">
          <CardTitle
            aside={
              <span className="text-sm text-slate-600">
                {items.length} صنف{outOfStock > 0 && <span className="text-red-700">، {outOfStock} رصيده صفر</span>}
              </span>
            }
          >
            الأصناف الحالية
          </CardTitle>

          <div className="overflow-x-auto">
            {loading ? (
              <TableSkeleton rows={6} cols={2} />
            ) : items.length === 0 ? (
              <EmptyState icon={Package} title="لا توجد أصناف في هذه الوحدة" hint="أضف أول صنف من النموذج مع رصيده الافتتاحي." />
            ) : (
              <table className="w-full min-w-[420px]">
                <thead className={theadClass}>
                  <tr>
                    <th className={th}>الصنف</th>
                    <th className={th + ' w-32 text-center'}>الرصيد الحالي</th>
                    <th className={th + ' w-16'}><span className="sr-only">إجراءات</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className={td + ' font-medium text-slate-900'}>{item.name}</td>
                      <td className={td + ' text-center'}><StockValue value={item.currentQuantity} /></td>
                      <td className={td + ' text-left'}>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className={iconButtonClass('danger')}
                          aria-label={`حذف ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ItemManagement;
