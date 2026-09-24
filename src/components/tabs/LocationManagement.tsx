import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { Card, CardTitle, EmptyState, Field, PageHeader, TableSkeleton, buttonClass, iconButtonClass, inputClass } from '../ui';
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
    <div>
      <PageHeader title="الوحدات والمواقع" description="الوحدات والعيادات التي تُسجَّل عليها العهدة." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr] lg:items-start">
        <Card>
          <CardTitle>موقع جديد</CardTitle>
          <form onSubmit={handleAddLocation} className="space-y-4 p-5">
            <Field label="اسم الموقع" htmlFor="new-location">
              <input
                id="new-location"
                type="text"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <button
              type="submit"
              disabled={loading || !newLocationName.trim()}
              className={buttonClass('primary', 'w-full')}
            >
              <Plus className="h-4 w-4" />
              إضافة
            </button>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <CardTitle aside={<span className="text-sm text-slate-600">{locations.length} موقع</span>}>
            المواقع الحالية
          </CardTitle>
          {loading && locations.length === 0 ? (
            <TableSkeleton rows={3} cols={1} />
          ) : locations.length === 0 ? (
            <EmptyState icon={MapPin} title="لا توجد مواقع مسجلة" hint="أضف أول وحدة من النموذج، ثم خصصها للمستخدمين من شاشة المستخدمين." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {locations.map((loc) => (
                <li key={loc.id} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
                    <span className="text-sm font-medium text-slate-900">{loc.name}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(loc.id)}
                    className={iconButtonClass('danger')}
                    aria-label={`حذف ${loc.name}`}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default LocationManagement;
