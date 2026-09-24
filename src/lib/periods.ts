import { format, parseISO, startOfWeek, addDays, isTuesday, nextTuesday } from 'date-fns';
import { Item, Transaction } from '../types';

// Custody weeks run Wednesday → Tuesday, both days inclusive.
// All period comparisons use 'yyyy-MM-dd' strings, which sort chronologically.

const toDay = (date: string) => date.slice(0, 10);

export const formatDay = (date: Date) => format(date, 'yyyy-MM-dd');

// 'yyyy-MM-dd' → 'dd/MM/yyyy' for display
export const displayDay = (day: string) => format(parseISO(day), 'dd/MM/yyyy');

// 'yyyy-MM-dd' → 'd/M' for compact hints
export const shortDay = (day: string) => format(parseISO(day), 'd/M');

// The Tuesday that closes the week containing `date` (today if it is a Tuesday).
export function weekEndingTuesday(date: Date): Date {
  return isTuesday(date) ? date : nextTuesday(date);
}

// The Wednesday → Tuesday week containing the given 'yyyy-MM-dd' day.
export function weekRange(day: string): { start: string; end: string } {
  const start = startOfWeek(parseISO(day), { weekStartsOn: 3 }); // 3 = Wednesday
  return { start: formatDay(start), end: formatDay(addDays(start, 6)) };
}

export interface PeriodRow {
  id: string;
  name: string;
  openingBalance: number;
  additions: number;
  consumption: number;
  closingBalance: number;
}

// Per-item totals for [start, end] inclusive.
// closing = opening + additions − consumption, where opening is the balance at the end of the
// previous period. The closing balance is derived from today's quantity minus the net effect of
// every transaction dated after `end`, so reports for past periods stay correct.
export function summarizePeriod(
  items: Item[],
  transactions: Transaction[],
  start: string,
  end: string
): PeriodRow[] {
  const additions: Record<string, number> = {};
  const consumption: Record<string, number> = {};
  const netAfterEnd: Record<string, number> = {};

  transactions.forEach(t => {
    const day = toDay(t.date);
    const signed = t.type === 'إضافة' ? t.quantity : -t.quantity;
    if (day > end) {
      netAfterEnd[t.itemId] = (netAfterEnd[t.itemId] || 0) + signed;
    } else if (day >= start) {
      if (t.type === 'إضافة') additions[t.itemId] = (additions[t.itemId] || 0) + t.quantity;
      else consumption[t.itemId] = (consumption[t.itemId] || 0) + t.quantity;
    }
  });

  return items.map(item => {
    const add = additions[item.id] || 0;
    const cons = consumption[item.id] || 0;
    const closingBalance = item.currentQuantity - (netAfterEnd[item.id] || 0);
    return {
      id: item.id,
      name: item.name,
      openingBalance: closingBalance - add + cons,
      additions: add,
      consumption: cons,
      closingBalance,
    };
  });
}

const entryTime = (t: Transaction) => (t as Transaction & { createdat?: string }).createdat ?? t.createdAt ?? '';

export interface LedgerRow {
  id: string;
  date: string;
  type: Transaction['type'];
  quantity: number;
  remaining: number;
}

export interface ItemLedger {
  id: string;
  name: string;
  openingBalance: number;
  rows: LedgerRow[];
  closingBalance: number;
}

// Per-item movement ledger for [start, end] inclusive, oldest first, with the balance after each
// movement. Opening is the balance at the end of the day before `start`.
export function itemLedgers(items: Item[], transactions: Transaction[], start: string, end: string): ItemLedger[] {
  const byItem: Record<string, Transaction[]> = {};
  const netFromStart: Record<string, number> = {};
  transactions.forEach(t => {
    const day = toDay(t.date);
    if (day < start) return;
    const signed = t.type === 'إضافة' ? t.quantity : -t.quantity;
    netFromStart[t.itemId] = (netFromStart[t.itemId] || 0) + signed;
    if (day <= end) (byItem[t.itemId] ||= []).push(t);
  });

  return items.map(item => {
    const openingBalance = item.currentQuantity - (netFromStart[item.id] || 0);
    let running = openingBalance;
    const rows = (byItem[item.id] || [])
      // Same-day movements keep the order they were entered in (the column is `createdat` in the database)
      .sort((a, b) => toDay(a.date).localeCompare(toDay(b.date)) || String(entryTime(a)).localeCompare(String(entryTime(b))))
      .map(t => {
        running += t.type === 'إضافة' ? t.quantity : -t.quantity;
        return { id: t.id, date: toDay(t.date), type: t.type, quantity: t.quantity, remaining: running };
      });
    return { id: item.id, name: item.name, openingBalance, rows, closingBalance: running };
  });
}
