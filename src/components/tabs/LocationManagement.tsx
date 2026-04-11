import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { Location } from '../../types';
import { toast } from 'react-hot-toast';

const LocationManagement: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('locations').select('*').order('name');
      if (error) throw error;
      setLocations(data || []);
    } catch (err: any) {
      toast.error('فشل في جلب المواقع');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('locations').insert({ name: newLocationName.trim() });
      if (error) throw error;
      
      toast.success('تمت إضافة الموقع بنجاح');
      setNewLocationName('');
      await fetchLocations();
    } catch (err: any) {
      toast.error('حدث خطأ أثناء الإضافة');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموقع؟ هذا قد يسبب مشاكل في الأصناف المرتبطة به.')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('locations').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('تم حذف الموقع');
      await fetchLocations();
    } catch (err: any) {
      toast.error('حدث خطأ أثناء الحذف');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-lg bg-primary-100 p-2 text-primary-600">
          <MapPin className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">إدارة المواقع والوحدات</h2>
          <p className="text-sm text-slate-500">إضافة أو حذف المواقع والعيادات</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <form onSubmit={handleAddLocation} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">إضافة موقع جديد</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">اسم الموقع</label>
                <input
                  type="text"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="الوحدة البيطرية بشندويل..."
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || !newLocationName.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-500 disabled:opacity-50"
              >
                <Plus className="h-5 w-5" />
                إضافة
              </button>
            </div>
          </form>
        </div>

        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
           <h3 className="text-lg font-semibold text-slate-900 mb-4">المواقع الحالية</h3>
           <div className="overflow-hidden rounded-lg border border-slate-200">
             <table className="min-w-full divide-y divide-slate-200 text-right">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-sm font-semibold text-slate-900">اسم الموقع</th>
                    <th scope="col" className="px-6 py-3 text-sm font-semibold text-slate-900 w-24">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {locations.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-4 text-center text-sm text-slate-500">
                        لا توجد مواقع مسجلة.
                      </td>
                    </tr>
                  ) : (
                    locations.map((loc) => (
                      <tr key={loc.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                          {loc.name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <button
                            onClick={() => handleDelete(loc.id)}
                            className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1.5 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
             </table>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LocationManagement;
