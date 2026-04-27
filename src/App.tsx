import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ViewState } from './types';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Inventory from './components/Inventory';
import Pricing from './components/Pricing';
import Expenses from './components/Expenses';
import CRM from './components/CRM';
import { Menu, X, LogIn } from 'lucide-react';
import { useAuth } from './lib/AuthContext';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, loading, login, logout } = useAuth();

  if (loading) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-[#F3F4F6]">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F3F4F6] p-4 text-[#1F2937] font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-blue-600 mb-2">ScrapTrack</h1>
          <p className="text-gray-500 mb-8">Login to manage your junk shop</p>
          <button 
            onClick={login}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
          >
            <LogIn size={20} />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-[#F3F4F6] min-h-[100dvh] text-[#1F2937] font-sans">
      {/* Mobile Topbar */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between fixed top-0 w-full z-30 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-blue-600">ScrapTrack</h1>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-gray-900/50 z-40 backdrop-blur-sm transition-opacity" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Wrapper */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 shadow-xl md:shadow-none bg-white
      `}>
        <Sidebar currentView={currentView} onChangeView={(v) => {
          setCurrentView(v);
          setIsMobileMenuOpen(false);
        }} />
      </div>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto w-full pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'transactions' && <Transactions />}
          {currentView === 'inventory' && <Inventory />}
          {currentView === 'pricing' && <Pricing />}
          {currentView === 'expenses' && <Expenses />}
          {currentView === 'crm' && <CRM />}
        </div>
      </main>
    </div>
  );
}
