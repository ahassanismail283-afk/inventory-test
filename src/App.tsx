import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import DataEntry from './components/tabs/DataEntry';
import WeeklyReport from './components/tabs/WeeklyReport';
import MonthlyReport from './components/tabs/MonthlyReport';
import TransactionHistory from './components/tabs/TransactionHistory';
import ItemManagement from './components/tabs/ItemManagement';
import UserManagement from './components/tabs/UserManagement';
import LocationManagement from './components/tabs/LocationManagement';
import UserProfile from './components/tabs/UserProfile';

export type TabId = 
  | 'data-entry' 
  | 'weekly' 
  | 'monthly' 
  | 'history' 
  | 'items' 
  | 'users' 
  | 'locations'
  | 'profile';

const App: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('data-entry');

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
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
      case 'data-entry': return <DataEntry />;
      case 'weekly': return <WeeklyReport />;
      case 'monthly': return <MonthlyReport />;
      case 'history': return <TransactionHistory />;
      case 'items': return <ItemManagement />;
      case 'users': return profile.role === 'ADMIN' ? <UserManagement /> : <DataEntry />;
      case 'locations': return profile.role === 'ADMIN' ? <LocationManagement /> : <DataEntry />;
      case 'profile': return <UserProfile />;
      default: return <DataEntry />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderTab()}
    </Layout>
  );
};

export default App;
