import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Reconciliation } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

// Custody reconciliation dates for the active location, newest first.
export function useReconciliations() {
  const { activeLocationId, user } = useAuth();
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeLocationId) fetchReconciliations();
    else setReconciliations([]);
  }, [activeLocationId]);

  const fetchReconciliations = async () => {
    if (!activeLocationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reconciliations')
        .select('*')
        .eq('locationId', activeLocationId)
        .order('date', { ascending: false });
      if (error) throw error;
      setReconciliations(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('فشل في تحميل المطابقات');
    } finally {
      setLoading(false);
    }
  };

  const addReconciliation = async (date: string, note: string) => {
    if (!activeLocationId || !user) return false;
    if (reconciliations.some(r => r.date === date)) {
      toast.error('توجد مطابقة مسجلة بهذا التاريخ بالفعل');
      return false;
    }
    try {
      const { error } = await supabase.from('reconciliations').insert({
        locationId: activeLocationId,
        date,
        note: note.trim() || null,
        createdBy: user.id,
      });
      if (error) throw error;
      toast.success('تم تسجيل المطابقة');
      await fetchReconciliations();
      return true;
    } catch (err: any) {
      console.error(err);
      toast.error('فشل في تسجيل المطابقة: ' + err.message);
      return false;
    }
  };

  const deleteReconciliation = async (id: string) => {
    try {
      const { error } = await supabase.from('reconciliations').delete().eq('id', id);
      if (error) throw error;
      toast.success('تم حذف المطابقة');
      await fetchReconciliations();
    } catch (err: any) {
      console.error(err);
      toast.error('فشل في حذف المطابقة: ' + err.message);
    }
  };

  return { reconciliations, loading, addReconciliation, deleteReconciliation };
}
