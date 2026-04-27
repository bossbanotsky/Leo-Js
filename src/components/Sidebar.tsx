import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ArrowRightLeft, Boxes, Banknote, Receipt, Users, Leaf, LogOut, Download } from 'lucide-react';
import { ViewState } from '../types';
import { useAuth } from '../lib/AuthContext';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export function Sidebar({ currentView, onChangeView }: SidebarProps) {
  const { logout } = useAuth();
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

  const navItems: { id: ViewState; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'transactions', label: 'Transactions', icon: <ArrowRightLeft size={20} /> },
    { id: 'inventory', label: 'Inventory', icon: <Boxes size={20} /> },
    { id: 'pricing', label: 'Pricing', icon: <Banknote size={20} /> },
    { id: 'expenses', label: 'Expenses', icon: <Receipt size={20} /> },
    { id: 'crm', label: 'CRM', icon: <Users size={20} /> },
  ];

  return (
    <aside className="w-full bg-white text-gray-800 flex flex-col h-full min-h-[100dvh] border-r border-gray-200 shadow-sm">
      <div className="p-6 flex items-center gap-3 border-b border-gray-200">
        <div className="bg-blue-600 rounded-lg p-2 text-white">
          <Leaf size={24} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">ScrapTrack</h1>
      </div>
      
      <nav className="flex-1 py-6 px-4 space-y-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors font-medium
              ${currentView === item.id 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}

        {isInstallable && (
          <button
            onClick={handleInstallClick}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 mt-4 animate-bounce"
          >
            <Download size={20} />
            Install Desktop App
          </button>
        )}
      </nav>

      <div className="p-4 border-t border-gray-200 flex flex-col gap-2">
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut size={20} />
          Sign Out
        </button>
        <div className="text-xs text-gray-400 text-center mt-2">
          &copy; {new Date().getFullYear()} ScrapTrack Inc.
        </div>
      </div>
    </aside>
  );
}
