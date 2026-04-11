import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Item, Transaction } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export function useInventory() {
  const { activeLocationId, user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeLocationId) {
      fetchItems();
      fetchTransactions();
    } else {
      setItems([]);
      setTransactions([]);
    }
  }, [activeLocationId]);

  const fetchItems = async () => {
    if (!activeLocationId) return;
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('locationId', activeLocationId)
        .order('name');
      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('فشل في تحميل الأصناف');
    }
  };

  const fetchTransactions = async () => {
    if (!activeLocationId) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('locationId', activeLocationId)
        .order('date', { ascending: false });
      if (error) throw error;
      setTransactions(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('فشل في تحميل الحركات');
    }
  };

  const addTransaction = async (
    itemId: string,
    itemName: string,
    type: 'إضافة' | 'استهلاك',
    quantity: number,
    date: string
  ) => {
    if (!activeLocationId || !user) return false;
    setLoading(true);
    try {
      // Get current item to calculate new quantity
      const item = items.find((i) => i.id === itemId);
      if (!item) throw new Error('الصنف غير موجود');

      const quantityChange = type === 'إضافة' ? quantity : -quantity;
      const newQuantity = item.currentQuantity + quantityChange;

      // Use RPC for transaction to ensure atomic updates if possible, 
      // but standard supabase doesn't have custom writeBatch easily available from client without RPC.
      // We can do two sequential queries as a fallback
      // Actually, Supabase doesn't support Firestore-like batch out of the box without pg functions.
      // We will do two separate updates, but let the user know we can set up an RPC for atomicity later.

      const { error: txError } = await supabase.from('transactions').insert({
        itemId,
        itemName,
        type,
        quantity,
        date,
        locationId: activeLocationId,
        userId: user.id,
      });

      if (txError) throw txError;

      const { error: itemError } = await supabase
        .from('items')
        .update({ currentQuantity: newQuantity })
        .eq('id', itemId);

      if (itemError) throw itemError;

      toast.success('تم تسجيل الحركة بنجاح');
      await fetchItems();
      await fetchTransactions();
      return true;
    } catch (err: any) {
      console.error(err);
      toast.error('فشل في تسجيل الحركة: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteTransaction = async (txId: string) => {
    setLoading(true);
    try {
      const tx = transactions.find(t => t.id === txId);
      if (!tx) throw new Error('الحركة غير موجودة');

      const item = items.find(i => i.id === tx.itemId);
      if (!item) throw new Error('الصنف المرتبط غير موجود');

      // reverse
      const quantityReverse = tx.type === 'إضافة' ? -tx.quantity : tx.quantity;
      
      const { error: delError } = await supabase.from('transactions').delete().eq('id', txId);
      if (delError) throw delError;

      const { error: itemError } = await supabase
        .from('items')
        .update({ currentQuantity: item.currentQuantity + quantityReverse })
        .eq('id', item.id);
      
      if (itemError) throw itemError;

      toast.success('تم حذف الحركة');
      await fetchItems();
      await fetchTransactions();
    } catch (err: any) {
      console.error(err);
      toast.error('حذث خطأ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const editTransaction = async (
    txId: string, 
    updates: { type: 'إضافة' | 'استهلاك', quantity: number, date: string }
  ) => {
    setLoading(true);
    try {
      const tx = transactions.find(t => t.id === txId);
      if (!tx) throw new Error('الحركة غير موجودة');

      const item = items.find(i => i.id === tx.itemId);
      if (!item) throw new Error('الصنف المرتبط غير موجود');

      // Revert old effect
      let currentItemQuantity = item.currentQuantity;
      currentItemQuantity += tx.type === 'إضافة' ? -tx.quantity : tx.quantity;
      
      // Apply new effect
      currentItemQuantity += updates.type === 'إضافة' ? updates.quantity : -updates.quantity;

      const { error: txError } = await supabase.from('transactions').update(updates).eq('id', txId);
      if (txError) throw txError;

      const { error: itemError } = await supabase
        .from('items')
        .update({ currentQuantity: currentItemQuantity })
        .eq('id', item.id);
      
      if (itemError) throw itemError;

      toast.success('تم تعديل الحركة بنجاح');
      await fetchItems();
      await fetchTransactions();
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    items,
    transactions,
    loading,
    addTransaction,
    deleteTransaction,
    editTransaction,
    fetchItems
  };
}
