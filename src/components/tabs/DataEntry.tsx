import React, { useState, useEffect } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { format, previousDay, isTuesday } from 'date-fns';
import { PackagePlus } from 'lucide-react';

const DataEntry: React.FC = () => {
  const { items, addTransaction, loading } = useInventory();
  
  const [itemId, setItemId] = useState('');
  const [type, setType] = useState<'إضافة' | 'استهلاك'>('إضافة');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    // Default to current week's Tuesday
    const today = new Date();
    let defaultDate = today;
    if (!isTuesday(today)) {
      // Find the most recent tuesday, or the upcoming one if that makes sense
      // For a default, generally "previous or current Tuesday". 
      // If today is Monday, previous Tuesday.
      defaultDate = previousDay(today, 2); // 2 = Tuesday
    }
    setDate(format(defaultDate, 'yyyy-MM-dd'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) return;
    
    const selectedItem = items.find(i => i.id === itemId);
    if (!selectedItem) return;

    const numQuantity = Number(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) return;

    const success = await addTransaction(itemId, selectedItem.name, type, numQuantity, date);
    if (success) {
      setQuantity('');
      // Keep date and type
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl bg-primary-50/50 p-2.5 text-primary-600 shadow-sm backdrop-blur-sm">
          <PackagePlus className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 font-serif tracking-tight">إضافة حركة مخزنية</h2>
      </div>

      <div className="rounded-2xl border border-white/40 bg-white/70 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700">تاريخ الحركة</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-primary-600 bg-primary-50 focus:bg-white shadow-sm transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">الصنف</label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="mt-1 block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-primary-600 bg-primary-50 focus:bg-white shadow-sm transition-all"
              required
            >
              <option value="" disabled>اختر الصنف</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} · (الرصيد: {item.currentQuantity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">نوع الحركة</label>
            <div className="mt-2 flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="إضافة"
                  checked={type === 'إضافة'}
                  onChange={(e) => setType(e.target.value as 'إضافة')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                />
                <span>إضافة (وارد)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="استهلاك"
                  checked={type === 'استهلاك'}
                  onChange={(e) => setType(e.target.value as 'استهلاك')}
                  className="h-4 w-4 text-rose-600 focus:ring-rose-500"
                />
                <span>استهلاك (منصرف)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">الكمية</label>
            <input
              type="number"
              min="1"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-primary-600 bg-primary-50 focus:bg-white shadow-sm transition-all"
              required
              placeholder="أدخل الكمية..."
            />
          </div>

          <button
            type="submit"
            disabled={loading || !itemId || !quantity}
            className="mt-4 w-full rounded-xl bg-gradient-to-l from-primary-600 to-primary-500 px-4 py-3.5 text-sm font-bold text-white shadow-md hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50 transition-all"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ الحركة'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DataEntry;
