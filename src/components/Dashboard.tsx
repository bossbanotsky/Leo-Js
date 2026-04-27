import React from 'react';
import { useAppStore } from '../lib/store';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ArrowDownLeft, ArrowUpRight, Banknote, ReceiptText } from 'lucide-react';

export default function Dashboard() {
  const { transactions, materials, expenses, clientTransactions } = useAppStore();

  const today = new Date().toDateString();
  const todaysTransactions = transactions.filter(t => new Date(t.date).toDateString() === today);
  const todaysCrm = clientTransactions.filter(t => new Date(t.date).toDateString() === today);
  const todaysExpenses = expenses.filter(e => new Date(e.date).toDateString() === today && e.type !== 'CRM');
  
  const totalBought = todaysTransactions.filter(t => t.type === 'buy').reduce((sum, t) => sum + t.totalAmount, 0);
  const totalSold = todaysTransactions.filter(t => t.type === 'sell').reduce((sum, t) => sum + t.totalAmount, 0);
  const totalOpEx = todaysExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalCrm = todaysCrm.reduce((sum, t) => sum + t.amount, 0);
  
  const netProfit = totalSold - totalBought - totalOpEx - totalCrm;

  // Quick stats summary
  const stats = [
    { label: "Today's Gross Sales", value: `₱${totalSold.toFixed(2)}`, icon: <ArrowUpRight size={24} className="text-emerald-500" /> },
    { label: "Today's Mat. Purchases", value: `₱${totalBought.toFixed(2)}`, icon: <ArrowDownLeft size={24} className="text-rose-500" /> },
    { label: "Today's Op Expenses", value: `₱${totalOpEx.toFixed(2)}`, icon: <ReceiptText size={24} className="text-orange-500" /> },
    { label: "Today's CRM Transactions", value: `₱${totalCrm.toFixed(2)}`, icon: <Banknote size={24} className="text-purple-500" /> },
    { label: "Today's Net Profit", value: `₱${netProfit.toFixed(2)}`, icon: <Banknote size={24} className="text-blue-500" /> },
  ];

  // Process data for charts
  const last7Days = Array.from({length: 7}).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toDateString();
  }).reverse();

  const chartData = last7Days.map(dateStr => {
    const dayTrans = transactions.filter(t => new Date(t.date).toDateString() === dateStr);
    const dayExps = expenses.filter(e => new Date(e.date).toDateString() === dateStr && e.type !== 'CRM');
    const dayCrm = clientTransactions.filter(t => new Date(t.date).toDateString() === dateStr);
    
    const bought = dayTrans.filter(t => t.type === 'buy').reduce((sum, t) => sum + t.totalAmount, 0);
    const sold = dayTrans.filter(t => t.type === 'sell').reduce((sum, t) => sum + t.totalAmount, 0);
    const operations = dayExps.reduce((sum, e) => sum + e.amount, 0);
    const crm = dayCrm.reduce((sum, t) => sum + t.amount, 0);
    
    return {
      name: dateStr.split(' ')[0], // gets Mon, Tue, etc
      sales: sold,
      purchases: bought,
      expenses: operations,
      crm: crm,
      profit: sold - bought - operations - crm
    };
  });

  const getTopMaterials = () => {
    return materials.map(m => ({
      name: m.name,
      stock: m.currentStock
    })).sort((a,b) => b.stock - a.stock).slice(0, 5);
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h2>
        <p className="text-gray-500 mt-1">Overview of today's operations and inventory.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
              <h3 className="text-2xl font-bold font-mono text-gray-900 mt-1">{stat.value}</h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center">
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Cashflow (Last 7 Days)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorBought" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCrm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `₱${val}`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip 
                  cursor={{stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="sales" name="Sales (₱)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSold)" />
                <Area type="monotone" dataKey="purchases" name="Purchases (₱)" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorBought)" />
                <Area type="monotone" dataKey="expenses" name="Op Expenses (₱)" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                <Area type="monotone" dataKey="crm" name="CRM (₱)" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorCrm)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Inventory by Volume</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getTopMaterials()} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 13}} width={120} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="stock" name="Stock (kg)" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
    </div>
  );
}
