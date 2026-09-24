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

  // Records one movement type for several items at once, e.g. a week's consumption sheet.
  // All movements are inserted in a single request; balances are then updated item by item.
  const addTransactionsBatch = async (
    entries: { itemId: string; quantity: number }[],
    type: 'إضافة' | 'استهلاك',
    date: string,
    // Brand-new items received in the same batch (additions only); created with their quantity
    newItems: { name: string; quantity: number }[] = []
  ) => {
    if (!activeLocationId || !user || entries.length + newItems.length === 0) return false;
    setLoading(true);
    const failed: string[] = [];
    try {
      const rows = entries.map(e => {
        const item = items.find(i => i.id === e.itemId);
        if (!item) throw new Error('صنف غير موجود في القائمة');
        return { item, quantity: e.quantity };
      });

      let created: Item[] = [];
      if (newItems.length > 0) {
        const { data, error } = await supabase
          .from('items')
          .insert(newItems.map(n => ({ name: n.name.trim(), currentQuantity: n.quantity, locationId: activeLocationId })))
          .select();
        if (error) throw error;
        created = data || [];
      }
      const createdRows = created.map(item => ({
        item,
        quantity: newItems.find(n => n.name.trim() === item.name)?.quantity ?? item.currentQuantity,
      }));

      const { error: txError } = await supabase.from('transactions').insert(
        [...rows, ...createdRows].map(({ item, quantity }) => ({
          itemId: item.id,
          itemName: item.name,
          type,
          quantity,
          date,
          locationId: activeLocationId,
          userId: user.id,
        }))
      );
      if (txError) throw txError;

      for (const { item, quantity } of rows) {
        const change = type === 'إضافة' ? quantity : -quantity;
        const { error } = await supabase
          .from('items')
          .update({ currentQuantity: item.currentQuantity + change })
          .eq('id', item.id);
        if (error) failed.push(item.name);
      }

      if (failed.length > 0) {
        toast.error(`سُجلت الحركات، لكن تعذر تحديث رصيد: ${failed.join('، ')}`, { duration: 10000 });
      } else {
        toast.success(`تم تسجيل ${rows.length + createdRows.length} حركة بنجاح${createdRows.length ? ` وإضافة ${createdRows.length} صنف جديد` : ""}`);
      }
      await fetchItems();
      await fetchTransactions();
      return failed.length === 0;
    } catch (err: any) {
      console.error(err);
      toast.error('فشل في تسجيل الحركات: ' + err.message);
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

  const deleteItem = async (itemId: string) => {
    setLoading(true);
    try {
      // First delete associated transactions to avoid foreign key constraint errors
      const { error: txError } = await supabase.from('transactions').delete().eq('itemId', itemId);
      if (txError) throw txError;

      // Then delete the item itself
      const { error: itemError } = await supabase.from('items').delete().eq('id', itemId);
      if (itemError) throw itemError;

      toast.success('تم حذف الصنف بنجاح');
      await fetchItems();
      await fetchTransactions();
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء حذف الصنف: ' + err.message);
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
    addTransactionsBatch,
    deleteTransaction,
    editTransaction,
    fetchItems,
    deleteItem
  };
}
