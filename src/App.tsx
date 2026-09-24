import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/tabs/Dashboard';
import DataEntry from './components/tabs/DataEntry';
import WeeklyReport from './components/tabs/WeeklyReport';
import MonthlyReport from './components/tabs/MonthlyReport';
import TransactionHistory from './components/tabs/TransactionHistory';
import ItemManagement from './components/tabs/ItemManagement';
import UserManagement from './components/tabs/UserManagement';
import LocationManagement from './components/tabs/LocationManagement';
import UserProfile from './components/tabs/UserProfile';
import CustodyReconciliation from './components/tabs/CustodyReconciliation';

export type TabId = 
  | 'dashboard'
  | 'data-entry' 
  | 'weekly' 
  | 'monthly' 
  | 'reconciliation'
  | 'history' 
  | 'items' 
  | 'users' 
  | 'locations'
  | 'profile';

const App: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  if (loading) {
    return (
      <div className="relative flex min-h-[100dvh] w-full motion-safe:animate-pulse" aria-busy="true" aria-label="جارٍ التحميل">
        <div className="absolute inset-x-0 top-0 h-60 bg-primary-900" />
        <div className="relative mx-auto w-full max-w-6xl space-y-4 px-4 pt-28 sm:px-6 lg:px-8">
          <div className="h-8 w-48 rounded-xl bg-white/20" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-white shadow-card" />)}
          </div>
        </div>
      </div>
    );
  }

  const isRecovery = window.location.hash.includes('type=recovery');

  if (!user || !profile) {
    return <Login />;
  }

  if (isRecovery) {
    return <Login isRecoveryMode={true} />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={setActiveTab} />;
      case 'data-entry': return <DataEntry />;
      case 'weekly': return <WeeklyReport />;
      case 'monthly': return <MonthlyReport />;
      case 'reconciliation': return <CustodyReconciliation />;
      case 'history': return <TransactionHistory />;
      case 'items': return <ItemManagement />;
      case 'users': return profile.role === 'ADMIN' ? <UserManagement /> : <DataEntry />;
      case 'locations': return profile.role === 'ADMIN' ? <LocationManagement /> : <DataEntry />;
      case 'profile': return <UserProfile />;
      default: return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderTab()}
    </Layout>
  );
};

export default App;
