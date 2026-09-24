import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TabId } from '../App';
import {
  LayoutGrid,
  ClipboardCheck,
  PackagePlus,
  FileText,
  CalendarDays,
  History,
  Package,
  Users,
  MapPin,
  LogOut,
  MoreHorizontal,
  X,
  Stethoscope,
  UserCog,
  LucideIcon,
} from 'lucide-react';
import { cx, roleLabels } from './ui';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

interface NavItem {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { profile, locations, activeLocationId, setActiveLocationId, signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isAdmin = profile?.role === 'ADMIN';

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutGrid },
    { id: 'data-entry', label: 'إضافة حركة', icon: PackagePlus },
    { id: 'history', label: 'السجل', icon: History },
    { id: 'items', label: 'الأصناف', icon: Package },
    { id: 'weekly', label: 'تقرير أسبوعي', icon: CalendarDays },
    { id: 'monthly', label: 'تقرير شهري', icon: FileText },
    { id: 'reconciliation', label: 'مطابقة العهدة', icon: ClipboardCheck },
    ...(isAdmin ? [
      { id: 'users' as TabId, label: 'المستخدمون', icon: Users },
      { id: 'locations' as TabId, label: 'المواقع', icon: MapPin },
    ] : []),
    { id: 'profile', label: 'حسابي', icon: UserCog },
  ];

  // Phones get a bottom tab bar with the four daily screens; the rest live under "المزيد".
  const mobilePrimary = navItems.slice(0, 4);
  const mobileMore = navItems.slice(4);
  const moreIsActive = mobileMore.some(i => i.id === activeTab);

  const go = (id: TabId) => {
    setActiveTab(id);
    setMoreOpen(false);
    window.scrollTo({ top: 0 });
  };

  const displayName = profile?.nickname || profile?.email?.split('@')[0] || '';

  return (
    <div className="relative min-h-[100dvh] pb-24 lg:pb-12 print:min-h-0 print:bg-white print:pb-0">
      {/* Cobalt band behind the header and page title */}
      <div
        className="absolute inset-x-0 top-0 h-60 overflow-hidden bg-primary-900 no-print lg:h-72"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(36,70,214,0.9),transparent_60%)]" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-primary-500/30 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-20 no-print">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary-700 shadow-sm">
              <Stethoscope className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-semibold text-white">عهدة الوحدة البيطرية</p>
              <p className="text-xs text-primary-200">إدارة المخزون والصرف</p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            {locations.length > 1 ? (
              <div className="relative min-w-0">
                <label htmlFor="active-location" className="sr-only">الوحدة الحالية</label>
                <MapPin className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-200" />
                <select
                  id="active-location"
                  value={activeLocationId || ''}
                  onChange={(e) => setActiveLocationId(e.target.value)}
                  className="w-full max-w-[14rem] truncate rounded-xl border border-white/15 bg-white/10 py-2 pl-8 pr-9 text-sm font-medium text-white backdrop-blur focus:border-white/40 focus:outline-none focus:ring-4 focus:ring-white/10 sm:max-w-xs [&>option]:text-slate-900"
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="flex min-w-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white">
                <MapPin className="h-4 w-4 shrink-0 text-primary-200" />
                <span className="truncate">{locations.find(l => l.id === activeLocationId)?.name || 'لم تُخصَّص وحدة'}</span>
              </span>
            )}

            <button
              onClick={() => go('profile')}
              className="hidden items-center gap-2.5 rounded-xl py-1.5 pl-3 pr-1.5 text-right transition-colors hover:bg-white/10 md:flex"
            >
              {profile?.avatar_base64 ? (
                <img src={profile.avatar_base64} alt="" className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-sm font-semibold text-white">
                  {displayName.charAt(0)}
                </span>
              )}
              <span className="leading-tight">
                <span className="block max-w-[9rem] truncate text-sm font-medium text-white">{displayName}</span>
                <span className="block text-xs text-primary-200">{profile ? roleLabels[profile.role] : ''}</span>
              </span>
            </button>
            <button
              onClick={signOut}
              className="hidden h-9 w-9 items-center justify-center rounded-xl text-primary-100 transition-colors hover:bg-white/10 hover:text-white md:flex"
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        {/* Desktop navigation */}
        <nav className="mx-auto hidden max-w-6xl px-4 sm:px-6 lg:block lg:px-8" aria-label="القائمة الرئيسية">
          <div className="flex items-center gap-0.5 border-t border-white/10 py-2.5">
            {/* Account settings are reached from the name button above */}
            {navItems.filter(item => item.id !== 'profile').map(item => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cx(
                    'flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-white text-primary-800 shadow-sm' : 'text-primary-100 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className="hidden h-4 w-4 xl:block" strokeWidth={isActive ? 2.25 : 1.75} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Page */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8 print:max-w-none print:p-0">
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden no-print"
        aria-label="القائمة الرئيسية"
      >
        <div className="grid grid-cols-5">
          {mobilePrimary.map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cx('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium', isActive ? 'text-primary-700' : 'text-slate-500')}
              >
                <span className={cx('flex h-7 w-12 items-center justify-center rounded-full transition-colors', isActive && 'bg-primary-50')}>
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} />
                </span>
                {item.label}
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={cx('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium', moreIsActive ? 'text-primary-700' : 'text-slate-500')}
          >
            <span className={cx('flex h-7 w-12 items-center justify-center rounded-full', moreIsActive && 'bg-primary-50')}>
              <MoreHorizontal className="h-5 w-5" />
            </span>
            المزيد
          </button>
        </div>
      </nav>

      {/* Mobile "more" sheet */}
      <div
        className={cx('fixed inset-0 z-40 bg-slate-900/40 transition-opacity lg:hidden no-print', moreOpen ? 'opacity-100' : 'pointer-events-none opacity-0')}
        onClick={() => setMoreOpen(false)}
        aria-hidden="true"
      />
      <div
        className={cx(
          'fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-200 motion-reduce:transition-none lg:hidden no-print',
          moreOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        role="dialog"
        aria-label="المزيد"
        aria-hidden={!moreOpen}
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="leading-tight">
            <p className="font-semibold text-slate-900">{displayName}</p>
            <p className="text-xs text-slate-600">{profile ? roleLabels[profile.role] : ''}</p>
          </div>
          <button onClick={() => setMoreOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {mobileMore.map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={cx(
                  'flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-xs font-medium transition-colors',
                  isActive ? 'bg-primary-50 text-primary-800' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
                {item.label}
              </button>
            );
          })}
          <button
            onClick={signOut}
            className="flex flex-col items-center gap-2 rounded-2xl bg-red-50 px-2 py-4 text-xs font-medium text-red-700"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.75} />
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
};

export default Layout;
