import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TabId } from '../App';
import { 
  LayoutDashboard, 
  FileText, 
  CalendarDays, 
  History, 
  Package, 
  Users, 
  MapPin, 
  LogOut,
  Menu,
  X,
  Stethoscope,
  Settings,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { profile, locations, activeLocationId, setActiveLocationId, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = profile?.role === 'ADMIN';

  const navItems = [
    { id: 'data-entry', label: 'إضافة حركة', icon: LayoutDashboard },
    { id: 'weekly', label: 'التقرير الأسبوعي', icon: CalendarDays },
    { id: 'monthly', label: 'التقرير الشهري', icon: FileText },
    { id: 'history', label: 'سجل الحركات', icon: History },
    { id: 'items', label: 'إدارة الأصناف', icon: Package },
    ...(isAdmin ? [
      { id: 'users', label: 'إدارة المستخدمين', icon: Users },
      { id: 'locations', label: 'إدارة الوحدات والمواقع', icon: MapPin },
    ] : []),
    { id: 'profile', label: 'إعدادات الحساب', icon: Settings },
  ] as const;

  const handleTabClick = (id: TabId) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#fbf9f5] font-sans text-slate-800 print:h-auto print:block">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden print-only"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed inset-y-0 right-0 z-50 w-64 bg-primary-50 shadow-[12px_0_40px_rgba(0,0,0,0.03)] transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 no-print
          ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-bl from-primary-700 to-primary-600 p-2 text-white shadow-sm">
                <Stethoscope className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-wide font-serif mt-1">إدارة عهدة الوحدة البيطرية</span>
            </div>
            <button className="lg:hidden text-slate-500" onClick={() => setMobileMenuOpen(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id as TabId)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white/70 text-primary-700 shadow-sm backdrop-blur-md'
                      : 'text-slate-600 hover:bg-white/40 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4">
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden relative print:overflow-visible print:h-auto print:flex-none">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-[#fbf9f5]/70 backdrop-blur-[24px] px-4 py-4 sm:px-6 lg:px-8 no-print">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="text-slate-500 lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>
              
              {locations.length > 1 ? (
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-slate-400" />
                  <select
                    value={activeLocationId || ''}
                    onChange={(e) => setActiveLocationId(e.target.value)}
                    className="block w-full max-w-xs rounded-xl border-0 py-1.5 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6 bg-white/50"
                  >
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <MapPin className="h-5 w-5 text-primary-500" />
                  {locations.find(l => l.id === activeLocationId)?.name || 'تحميل الموقع...'}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-sm text-slate-500 sm:flex sm:items-center sm:gap-2">
                {profile?.avatar_base64 ? (
                  <img src={profile.avatar_base64} alt="Avatar" className="h-8 w-8 rounded-full object-cover border border-slate-200" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-primary-600" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-900 leading-tight">{profile?.nickname || profile?.email?.split('@')[0]}</span>
                  <span className="text-[10px] text-primary-600 font-bold uppercase tracking-wider">{profile?.role}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Area */}
        <main className="flex-1 overflow-y-auto w-full print:overflow-visible print:h-auto">
          <div className="min-h-full print:p-0">
             {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
