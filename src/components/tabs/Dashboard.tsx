import React, { useMemo } from 'react';
import { AlertTriangle, ArrowLeft, History, Package, PackagePlus } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../contexts/AuthContext';
import { formatDay, shortDay, weekRange } from '../../lib/periods';
import { TabId } from '../../App';
import { Card, CardTitle, EmptyState, PageHeader, StockValue, TxTypeBadge, buttonClass, cx } from '../ui';

const LOW_STOCK_ROWS = 6;
const RECENT_ROWS = 6;

const StatTile: React.FC<{
  label: string;
  value: number;
  note: string;
  icon: React.ElementType;
  tone?: 'default' | 'accent' | 'alert';
}> = ({ label, value, note, icon: Icon, tone = 'default' }) => (
  <div
    className={cx(
      'relative overflow-hidden rounded-2xl p-5 shadow-card',
      tone === 'accent' && 'bg-primary-600 text-white',
      tone === 'alert' && 'border border-red-100 bg-white',
      tone === 'default' && 'border border-slate-200/70 bg-white'
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <p className={cx('text-sm font-medium', tone === 'accent' ? 'text-primary-100' : 'text-slate-600')}>{label}</p>
      <span
        className={cx(
          'flex h-9 w-9 items-center justify-center rounded-xl',
          tone === 'accent' && 'bg-white/15 text-white',
          tone === 'alert' && 'bg-red-50 text-red-600',
          tone === 'default' && 'bg-primary-50 text-primary-600'
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
    </div>
    <p className={cx('mt-3 text-4xl font-semibold tabular-nums', tone === 'alert' && value > 0 ? 'text-red-700' : '')}>{value}</p>
    <p className={cx('mt-1 text-xs', tone === 'accent' ? 'text-primary-100' : 'text-slate-600')}>{note}</p>
  </div>
);

const Dashboard: React.FC<{ onNavigate: (tab: TabId) => void }> = ({ onNavigate }) => {
  const { items, transactions } = useInventory();
  const { profile } = useAuth();

  const week = weekRange(formatDay(new Date()));

  const emptyCount = useMemo(() => items.filter(i => i.currentQuantity <= 0).length, [items]);
  const lowStock = useMemo(
    () => [...items].sort((a, b) => a.currentQuantity - b.currentQuantity).slice(0, LOW_STOCK_ROWS),
    [items]
  );
  const recent = transactions.slice(0, RECENT_ROWS);
  const firstName = profile?.nickname || profile?.email?.split('@')[0];

  return (
    <div>
      <PageHeader
        title={firstName ? `أهلا، ${firstName}` : 'الرئيسية'}
        description={`الأسبوع الجاري من ${shortDay(week.start)} إلى ${shortDay(week.end)}.`}
        actions={
          <button onClick={() => onNavigate('data-entry')} className={buttonClass('inverse')}>
            <PackagePlus className="h-4 w-4" />
            إضافة حركة
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatTile label="الأصناف" value={items.length} note="في الوحدة الحالية" icon={Package} tone="accent" />
        <StatTile label="رصيدها صفر" value={emptyCount} note={emptyCount > 0 ? 'تحتاج إلى توريد' : 'لا يوجد صنف نافد'} icon={AlertTriangle} tone="alert" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle
            aside={
              <button onClick={() => onNavigate('items')} className="flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-900">
                كل الأصناف
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            }
          >
            الأقل رصيدا
          </CardTitle>
          {lowStock.length === 0 ? (
            <EmptyState icon={Package} title="لا توجد أصناف بعد" />
          ) : (
            <ul className="px-2 pb-3">
              {lowStock.map(item => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
                  <span className="truncate text-sm text-slate-800">{item.name}</span>
                  <StockValue value={item.currentQuantity} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle
            aside={
              <button onClick={() => onNavigate('history')} className="flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-900">
                السجل الكامل
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            }
          >
            آخر الحركات
          </CardTitle>
          {recent.length === 0 ? (
            <EmptyState icon={History} title="لا توجد حركات بعد" hint="ابدأ بتسجيل أول وارد أو منصرف." />
          ) : (
            <ul className="divide-y divide-slate-100 px-2 pb-2">
              {recent.map(tx => (
                <li key={tx.id} className="flex items-center gap-3 px-3 py-3">
                  <TxTypeBadge type={tx.type} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{tx.itemName}</span>
                  <span className="text-sm font-semibold tabular-nums text-slate-900">{tx.quantity}</span>
                  <span className="w-12 text-left text-xs tabular-nums text-slate-500">{shortDay(tx.date.slice(0, 10))}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
