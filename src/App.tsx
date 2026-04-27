import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ViewState } from './types';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Inventory from './components/Inventory';
import Pricing from './components/Pricing';
import Expenses from './components/Expenses';
import CRM from './components/CRM';
import { Menu, X, LogIn, Download } from 'lucide-react';
import { useAuth } from './lib/AuthContext';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, loading, login, logout } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  if (loading) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-[#F3F4F6]">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F3F4F6] p-4 text-[#1F2937] font-sans relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-3xl opacity-50 select-none pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-3xl opacity-50 select-none pointer-events-none" />
        
        <div className="bg-white/80 backdrop-blur-md p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-md text-center border border-white/20 relative z-10 transition-all duration-300 hover:shadow-blue-500/10">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mb-8 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <h1 className="text-4xl font-black text-white italic tracking-tighter">S</h1>
          </div>
          
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">ScrapTrack</h1>
          <p className="text-gray-500 mb-10 text-sm leading-relaxed max-w-[280px] mx-auto">
            The intelligent operating system for modern recyclers and junk shops.
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={login}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-blue-600/20 group"
            >
              <div className="bg-white/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                <LogIn size={20} />
              </div>
              <span className="text-lg">Access Dashboard</span>
            </button>
            
            <p className="text-[10px] text-gray-400 uppercase tracking-widest pt-4">
              Authorized Personnel Only
            </p>
          </div>

          {isInstallable && (
            <button 
              onClick={handleInstallClick}
              className="mt-6 flex items-center justify-center gap-2 text-emerald-600 font-semibold text-xs py-2 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-all mx-auto w-fit border border-emerald-100 animate-pulse"
            >
              <Download size={14} />
              Install Desktop Experience
            </button>
          )}
          
          <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-1 group">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                <Menu size={18} />
              </div>
              <span className="text-[10px] text-gray-400 group-hover:text-gray-600 transition-colors uppercase font-bold tracking-tighter">Inventory</span>
            </div>
            <div className="flex flex-col items-center gap-1 group">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                <LogIn size={18} className="translate-x-0.5" />
              </div>
              <span className="text-[10px] text-gray-400 group-hover:text-gray-600 transition-colors uppercase font-bold tracking-tighter">Finance</span>
            </div>
          </div>
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
