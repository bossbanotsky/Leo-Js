import React from 'react';
import { useAppStore } from '../lib/store';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ArrowDownLeft, ArrowUpRight, Banknote, ReceiptText, Box, Info } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export default function Dashboard() {
  const { transactions, materials, materialsWithStats, expenses, clientTransactions, clients } = useAppStore();
  const { user } = useAuth();

  const today = new Date().toDateString();
  const todaysTransactions = transactions.filter(t => new Date(t.date).toDateString() === today);
  const todaysCrm = clientTransactions.filter(t => 
    new Date(t.date).toDateString() === today && 
    clients.some(c => c.id === t.clientId)
  );
  const todaysExpenses = expenses.filter(e => {
    const isToday = new Date(e.date).toDateString() === today;
    if (!isToday) return false;
    if (e.type === 'CRM') {
      return clients.some(c => c.id === e.clientId);
    }
    return true;
  });
  
  const totalBought = todaysTransactions.filter(t => t.type === 'buy').reduce((sum, t) => sum + t.totalAmount, 0);
  const totalSold = todaysTransactions.filter(t => t.type === 'sell').reduce((sum, t) => sum + t.totalAmount, 0);
  const totalOpEx = todaysExpenses.reduce((sum, e) => sum + e.amount, 0);
  // CRM flows: Payments (pos) increase cash, Advances (neg) decrease cash
  const crmNetFlow = todaysCrm.reduce((sum, t) => {
    if (t.type === 'Payment') return sum + t.amount;
    if (t.type === 'Advance') return sum - t.amount;
    return sum;
  }, 0);
  
  // Real Gross Profit = Revenue - (Weighted Average Cost of Sold Items)
  const realGrossProfit = todaysTransactions
    .filter(t => t.type === 'sell')
    .reduce((sum, t) => {
      const material = materialsWithStats.find(m => m.id === t.materialId);
      const cogs = (material?.weightedAverageCost || 0) * t.quantity;
      return sum + (t.totalAmount - cogs);
    }, 0);

  // Net Cashflow = Money In (Sales + CRM Payments) - Money Out (Purchases + Expenses + CRM Advances)
  // Since Advances are saved as negative in CRM, adding crmNetFlow handles both.
  const netCashflow = totalSold - totalBought - totalOpEx + crmNetFlow;

  // Inventory Value Analysis
  const inventoryMarketValue = materials.reduce((sum, m) => sum + (m.currentStock * m.sellPrice), 0);
  const inventoryCostBasis = materialsWithStats.reduce((sum, m) => sum + (m.currentStock * (m.weightedAverageCost || 0)), 0);
  const potentialInventoryProfit = inventoryMarketValue - inventoryCostBasis;

  // Quick stats summary
  const stats = [
    { label: "Today's Gross Sales", value: `₱${totalSold.toLocaleString(undefined, {minimumFractionDigits: 2})}`, icon: <ArrowUpRight size={24} className="text-emerald-500" /> },
    { label: "Real Profit on Sales", value: `₱${realGrossProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}`, icon: <Banknote size={24} className="text-amber-500" />, sub: "Accounting for free material costs" },
    { label: "Today's Net Cashflow", value: `₱${netCashflow.toLocaleString(undefined, {minimumFractionDigits: 2})}`, icon: <Banknote size={24} className="text-blue-500" /> },
    { label: "Inv. Market Value", value: `₱${inventoryMarketValue.toLocaleString(undefined, {minimumFractionDigits: 2})}`, icon: <Box size={24} className="text-purple-500" /> },
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
    const dayCrm = clientTransactions.filter(t => 
      new Date(t.date).toDateString() === dateStr &&
      clients.some(c => c.id === t.clientId)
    );
    
    const bought = dayTrans.filter(t => t.type === 'buy').reduce((sum, t) => sum + t.totalAmount, 0);
    const sold = dayTrans.filter(t => t.type === 'sell').reduce((sum, t) => sum + t.totalAmount, 0);
    const operations = dayExps.reduce((sum, e) => sum + e.amount, 0);
    const crm = dayCrm.reduce((sum, t) => {
      if (t.type === 'Payment') return sum + t.amount;
      if (t.type === 'Advance') return sum - t.amount;
      return sum;
    }, 0);
    
    return {
      name: dateStr.split(' ')[0], // gets Mon, Tue, etc
      sales: sold,
      purchases: bought,
      expenses: operations,
      crm: crm,
      profit: sold - bought - operations + crm
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
          <div key={idx} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between w-full">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center">
                {stat.icon}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold font-mono text-gray-900 tracking-tight">{stat.value}</h3>
              {stat.sub && (
                <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                  <Info size={10} /> {stat.sub}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Profit Breakdown Analysis */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl shadow-xl text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Banknote size={120} />
        </div>
        <div className="relative z-10">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
            <Banknote className="text-amber-400" /> 
            Profitability & Inventory Analysis
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inventory Value</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-300">Book Value (At Cost)</span>
                  <span className="font-mono font-bold">₱{inventoryCostBasis.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-300">Potential Market Value</span>
                  <span className="font-mono font-bold">₱{inventoryMarketValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="pt-2 border-t border-slate-700/50 flex justify-between items-center">
                  <span className="text-amber-400 font-bold text-xs uppercase">Unrealized Profit</span>
                  <span className="font-mono font-bold text-lg text-amber-400">₱{potentialInventoryProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Today's Performance</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-300">Gross Sales Volume</span>
                  <span className="font-mono font-bold">₱{totalSold.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-300">Expenses & CRM Flows</span>
                  <span className="font-mono font-bold text-rose-400">
                    { (totalOpEx - crmNetFlow) >= 0 ? '-' : '+' }₱{Math.abs(totalOpEx - crmNetFlow).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-700/50 flex justify-between items-center">
                  <span className="text-blue-400 font-bold text-xs uppercase">Net Cash Performance</span>
                  <span className="font-mono font-bold text-lg text-blue-400">₱{netCashflow.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Efficiency Stats</p>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-1">
                    <span>Target Margin</span>
                    <span>30%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-400 rounded-full transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (realGrossProfit / (totalSold || 1)) * 100)}%` }} 
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Real profit margin on sales: {((realGrossProfit / (totalSold || 1)) * 100).toFixed(1)}%</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-400/20 text-amber-400 rounded-lg">
                    <Info size={16} />
                  </div>
                  <p className="text-[9px] text-slate-300 leading-tight italic">
                    "Karga" items have ₱0 cost basis. Weighted average cost automatically updates when you buy paid materials.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center justify-between">
            <span>Cashflow (Last 7 Days)</span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-tighter">Real-time Performance</span>
          </h3>
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
                  formatter={(value) => [`₱${Number(value).toFixed(2)}`]}
                />
                <Area type="monotone" dataKey="sales" name="Sales (Revenue)" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSold)" />
                <Area type="monotone" dataKey="purchases" name="Purchases (Cost)" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorBought)" />
                <Area type="monotone" dataKey="expenses" name="Op Expenses" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                <Area type="monotone" dataKey="crm" name="CRM/Advance" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorCrm)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Profit Margin Breakdown</h3>
          <div className="space-y-4">
            {materialsWithStats.filter(m => m.currentStock > 0 || transactions.some(t => t.materialId === m.id)).slice(0, 6).map(m => {
              const sellPrice = m.sellPrice;
              const avgCost = m.weightedAverageCost;
              const marginAmt = sellPrice - avgCost;
              const marginPct = sellPrice > 0 ? (marginAmt / sellPrice) * 100 : 0;
              
              return (
                <div key={m.id} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm font-bold text-gray-800 line-clamp-1">{m.name}</p>
                      <p className="text-[10px] text-gray-400">Avg Cost: ₱{avgCost.toFixed(2)} | Sell: ₱{sellPrice.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-black ${marginPct > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {marginPct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-gray-200" 
                      style={{ width: `${Math.max(0, (avgCost / (sellPrice || 1)) * 100)}%` }} 
                    />
                    <div 
                      className={`h-full transition-all duration-1000 ${marginPct > 40 ? 'bg-emerald-500' : marginPct > 20 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                      style={{ width: `${Math.max(0, marginPct)}%` }} 
                    />
                  </div>
                </div>
              );
            })}
            {materials.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-10">No materials tracked yet.</p>
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
}
