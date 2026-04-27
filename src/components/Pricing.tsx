import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { Save, TrendingUp, TrendingDown, RefreshCw, Info } from 'lucide-react';
import { fetchMarketPrices } from '../lib/gemini';

export default function Pricing() {
  const { materials, updateMaterialPrice } = useAppStore();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Local state for editing prices
  const [editingPrices, setEditingPrices] = useState<Record<string, {buy: number, sell: number}>>({});
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [isFetchingMarket, setIsFetchingMarket] = useState(false);

  useEffect(() => {
    async function loadMarketPrices() {
      if (materials.length === 0) return;

      // Get current date in Philippine Time (UTC+8)
      const now = new Date();
      const phtDateStr = new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(now); // Formats like MM/DD/YYYY

      const storedDate = localStorage.getItem('scrap_market_prices_date');
      const storedData = localStorage.getItem('scrap_market_prices_data');

      // If we already fetched for today (PHT), use cached data
      if (storedDate === phtDateStr && storedData) {
        try {
          setMarketPrices(JSON.parse(storedData));
          return;
        } catch (e) {
          // ignore corrupted data
        }
      }

      setIsFetchingMarket(true);
      const materialNames = materials.map(m => m.name);
      
      // Fetch new prices since it's a new day or no data exists
      const prices = await fetchMarketPrices(materialNames);
      
      if (Object.keys(prices).length > 0) {
        setMarketPrices(prices);
        localStorage.setItem('scrap_market_prices_date', phtDateStr);
        localStorage.setItem('scrap_market_prices_data', JSON.stringify(prices));
      }
      setIsFetchingMarket(false);
    }

    loadMarketPrices();
  }, [materials.length]); // Only re-run if number of materials changes significantly

  const handlePriceChange = (id: string, field: 'buy' | 'sell', val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;

    setEditingPrices(prev => ({
      ...prev,
      [id]: {
        ...prev[id] || { buy: materials.find(m=>m.id === id)?.buyPrice, sell: materials.find(m=>m.id === id)?.sellPrice },
        [field]: num
      }
    }));
  };

  const handleSave = (id: string) => {
    const prices = editingPrices[id];
    if (prices) {
      updateMaterialPrice(id, prices.buy, prices.sell);
      // clear edit state for this item
      const newEditing = {...editingPrices};
      delete newEditing[id];
      setEditingPrices(newEditing);
    }
  };

  const categories = ['All', ...Array.from(new Set(materials.map(m => m.type)))];
  const filteredMaterials = selectedCategory === 'All' 
    ? materials 
    : materials.filter(m => m.type === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Pricing Matrix</h2>
        <p className="text-gray-500 mt-1">Manage buying and selling rates for all materials. Add new materials in the <span className="font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-sm mx-1">Inventory</span> section, and they will automatically appear here.</p>
      </div>

      <div className="flex space-x-2 border-b border-gray-200">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 font-medium text-sm ${
              selectedCategory === cat 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="font-bold flex items-center gap-2">
            Market Rate Matrix 
            {isFetchingMarket && <RefreshCw size={14} className="text-blue-500 animate-spin" />}
          </h2>
          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold">LIVE UPDATE</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="px-6 py-3">Material</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3 text-blue-600 flex items-center gap-1" title="Estimated global market rate for this material updated daily."><Info size={14}/> Est. Market Rate</th>
                <th className="px-6 py-3 text-red-500"><TrendingDown size={14} className="inline mr-1"/> Buy Price (You Pay)</th>
                <th className="px-6 py-3 text-green-600"><TrendingUp size={14} className="inline mr-1"/> Sell Price (You Get)</th>
                <th className="px-6 py-3">Margin</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMaterials.map(m => {
                const isEditing = !!editingPrices[m.id];
                const currentBuy = isEditing ? editingPrices[m.id].buy : m.buyPrice;
                const currentSell = isEditing ? editingPrices[m.id].sell : m.sellPrice;
                const margin = currentSell - currentBuy;
                const marginPercent = currentBuy > 0 ? (margin / currentBuy) * 100 : 0;
                
                const estMarketRate = marketPrices[m.name];

                return (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-sm text-gray-900">{m.name}</td>
                    <td className="px-6 py-4 text-gray-500">
                      <span className="text-[10px] text-gray-400">{m.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      {estMarketRate !== undefined ? (
                        <div className="font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded inline-block">
                          ₱{estMarketRate.toFixed(2)}
                        </div>
                      ) : (
                        <span className="text-gray-300 italic text-xs">Fetching...</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₱</span>
                        <input 
                          type="number"
                          step="0.01"
                          min="0"
                          value={currentBuy}
                          onChange={(e) => handlePriceChange(m.id, 'buy', e.target.value)}
                          className={`w-full pl-6 pr-2 py-1.5 border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${isEditing ? 'border-red-300 bg-red-50 text-red-700' : 'border-transparent bg-transparent hover:border-gray-200 text-gray-900'}`}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₱</span>
                        <input 
                          type="number"
                          step="0.01"
                          min="0"
                          value={currentSell}
                          onChange={(e) => handlePriceChange(m.id, 'sell', e.target.value)}
                          className={`w-full pl-6 pr-2 py-1.5 border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${isEditing ? 'border-green-300 bg-green-50 text-green-700' : 'border-transparent bg-transparent hover:border-gray-200 text-blue-700 font-bold'}`}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`font-mono font-bold ${margin > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          ₱{margin.toFixed(2)} <span className="text-xs text-gray-400 font-sans font-normal ml-1">/ {m.unit}</span>
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase">
                          {marginPercent.toFixed(1)}% markup
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isEditing ? (
                        <button 
                          onClick={() => handleSave(m.id)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition"
                        >
                          Save
                        </button>
                      ) : (
                        <span className="text-xs text-blue-600 font-bold cursor-pointer hover:underline px-2" onClick={() => setEditingPrices({...editingPrices, [m.id]: {buy: currentBuy, sell: currentSell}})}>
                          EDIT
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
