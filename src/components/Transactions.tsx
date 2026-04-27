import React, { useState, useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { useAuth } from '../lib/AuthContext';
import { Plus, ArrowDownLeft, ArrowUpRight, Search, Printer, Calendar, X, FileText } from 'lucide-react';
import { PaymentMethod, Transaction } from '../types';

export default function Transactions() {
  const { transactions, materials, addTransaction, clients } = useAppStore();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New transaction state
  const [type, setType] = useState<'buy' | 'sell'>('buy');
  const [materialId, setMaterialId] = useState(materials[0]?.id || '');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [pricePerUnit, setPricePerUnit] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');

  // Filtering state
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');

  // Receipt modal state
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);

  // Auto-fill price when material changes
  const handleMaterialChange = (id: string, currentType: 'buy' | 'sell') => {
    setMaterialId(id);
    const m = materials.find(x => x.id === id);
    if (m) {
      setPricePerUnit(currentType === 'buy' ? m.buyPrice : m.sellPrice);
    }
  };

  const handleClientChange = (id: string) => {
    setClientId(id);
    if (id) {
      const client = clients.find(c => c.id === id);
      if (client) {
        setClientName(client.name);
      }
    } else {
      setClientName('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialId || quantity === '' || pricePerUnit === '') return;

    const newTxDetails = {
      type,
      materialId,
      quantity: Number(quantity),
      pricePerUnit: Number(pricePerUnit),
      discount: Number(discount) || 0,
      paymentMethod,
      clientName: clientName || 'Walk-in',
      clientId: clientId || undefined,
      ...(notes.trim() ? { notes: notes.trim() } : {})
    };

    addTransaction(newTxDetails);
    
    // We will find the newly added transaction to show in receipt. 
    // In a real app we'd get back the ID, for now we will just show it from store next render or create dummy receipt.
    // Let's create a temporary object for the receipt view
    const tempTx: Transaction = {
      ...newTxDetails,
      id: 'NEW',
      userId: user?.uid || '',
      createdAt: Date.now(),
      date: new Date().toISOString(),
      totalAmount: (Number(quantity) * Number(pricePerUnit)) - (Number(discount) || 0)
    };
    
    setIsModalOpen(false);
    setQuantity('');
    setDiscount(0);
    setClientId('');
    setClientName('');
    setNotes('');
    setReceiptTx(tempTx);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const mat = materials.find(m => m.id === t.materialId)?.name.toLowerCase() || '';
      const matchesSearch = t.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
             mat.includes(searchTerm.toLowerCase());
      
      let matchesDate = true;
      const tDate = new Date(t.date).getTime();
      if (dateStart) {
        matchesDate = matchesDate && tDate >= new Date(dateStart).getTime();
      }
      if (dateEnd) {
        // add 1 day to include the end date fully
        matchesDate = matchesDate && tDate <= new Date(dateEnd).getTime() + 86400000;
      }

      return matchesSearch && matchesDate;
    });
  }, [transactions, searchTerm, materials, dateStart, dateEnd]);

  const totalRevenue = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'sell')
      .reduce((sum, t) => sum + t.totalAmount, 0);
  }, [filteredTransactions]);

  const totalPayout = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'buy')
      .reduce((sum, t) => sum + t.totalAmount, 0);
  }, [filteredTransactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Transactions</h2>
          <p className="text-gray-500 mt-1">Record and view buys and sales.</p>
        </div>
        <button 
          onClick={() => {
            setType('buy');
            handleMaterialChange(materials[0]?.id || '', 'buy');
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
        >
          <Plus size={20} />
          New Transaction
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Revenue (Sales)</p>
            <h3 className="text-2xl font-bold font-mono text-blue-700">₱{totalRevenue.toFixed(2)}</h3>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
            <ArrowUpRight size={20} className="text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Payouts (Buys)</p>
            <h3 className="text-2xl font-bold font-mono text-gray-900">₱{totalPayout.toFixed(2)}</h3>
          </div>
          <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
            <ArrowDownLeft size={20} className="text-red-500" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Net Period</p>
            <h3 className={`text-2xl font-bold font-mono ${totalRevenue - totalPayout >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₱{(totalRevenue - totalPayout).toFixed(2)}
            </h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gray-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by client or material..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 w-full sm:w-auto">
              <Calendar className="text-gray-400 mr-2 shrink-0" size={16} />
              <input 
                type="date" 
                value={dateStart}
                onChange={e => setDateStart(e.target.value)}
                className="text-sm outline-none bg-transparent text-gray-600 w-full"
              />
              <span className="mx-2 text-gray-400 text-sm">to</span>
              <input 
                type="date" 
                value={dateEnd}
                onChange={e => setDateEnd(e.target.value)}
                className="text-sm outline-none bg-transparent text-gray-600 w-full"
              />
            </div>
            {(dateStart || dateEnd) && (
              <button 
                onClick={() => { setDateStart(''); setDateEnd(''); }}
                className="text-gray-400 hover:text-gray-600 p-2 shrink-0"
                title="Clear Dates"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Material</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4 text-right">Qty</th>
                <th className="px-6 py-4 text-right">Price/Unit</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.map(t => {
                const material = materials.find(m => m.id === t.materialId);
                const date = new Date(t.date);
                return (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                      {date.toLocaleDateString()} <span className="text-gray-400 ml-1">{date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td className="px-6 py-4">
                      {t.type === 'buy' 
                        ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                            <ArrowDownLeft size={14} /> Buy
                          </span>
                        : <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                            <ArrowUpRight size={14} /> Sell
                          </span>
                      }
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{material?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-gray-600">{t.clientName}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{t.quantity} <span className="text-gray-400 text-xs">{material?.unit}</span></td>
                    <td className="px-6 py-4 text-right text-gray-600">₱{t.pricePerUnit.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-bold font-mono text-blue-700">₱{t.totalAmount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setReceiptTx(t)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="View Receipt"
                      >
                        <FileText size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredTransactions.map(t => {
            const material = materials.find(m => m.id === t.materialId);
            const date = new Date(t.date);
            return (
              <div key={t.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {t.type === 'buy' 
                      ? <div className="p-1.5 rounded bg-green-100 text-green-700"><ArrowDownLeft size={16} /></div>
                      : <div className="p-1.5 rounded bg-blue-100 text-blue-700"><ArrowUpRight size={16} /></div>
                    }
                    <div>
                      <h4 className="font-bold text-gray-900">{material?.name || 'Unknown'}</h4>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
                        {date.toLocaleDateString()} at {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold font-mono text-blue-700">₱{t.totalAmount.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-400 uppercase font-black uppercase">TOTAL</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs py-2 px-3 bg-gray-50 rounded-lg">
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 uppercase font-bold text-[9px]">Client</span>
                    <span className="text-gray-700 font-medium">{t.clientName}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-gray-400 uppercase font-bold text-[9px]">Quantity</span>
                    <span className="text-gray-700 font-medium">{t.quantity} {material?.unit}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-gray-400 uppercase font-bold text-[9px]">Price/Unit</span>
                    <span className="text-gray-700 font-medium">₱{t.pricePerUnit.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={() => setReceiptTx(t)}
                    className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors py-1 cursor-pointer"
                  >
                    <FileText size={14} /> View Receipt
                  </button>
                </div>
              </div>
            );
          })}
          {filteredTransactions.length === 0 && (
            <div className="p-10 text-center text-gray-500 text-sm">
              No transactions found.
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 text-gray-900 sticky top-0 z-10">
              <h3 className="font-bold text-lg">Record Transaction</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setType('buy'); handleMaterialChange(materialId, 'buy'); }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${type === 'buy' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Buy (Pay Out)
                </button>
                <button
                  type="button"
                  onClick={() => { setType('sell'); handleMaterialChange(materialId, 'sell'); }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${type === 'sell' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Sell (Receive)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Material</label>
                  <select 
                    value={materialId}
                    onChange={(e) => handleMaterialChange(e.target.value, type)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700"
                  >
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.type})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Quantity</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-12 font-mono"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold bg-white px-1.5 py-0.5 rounded border border-slate-100 uppercase">
                      {materials.find(m => m.id === materialId)?.unit || 'u'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Price / Unit</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={pricePerUnit}
                      onChange={(e) => setPricePerUnit(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Discount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Payment</label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">CRM Client (Optional)</label>
                <select 
                  value={clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700"
                >
                  <option value="">-- No CRM Client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </select>
                {clientId && clients.find(c => c.id === clientId)?.paymentTerms && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-tighter">Client Terms</span>
                    <span className="text-xs font-bold text-blue-900">{clients.find(c => c.id === clientId)?.paymentTerms}</span>
                  </div>
                )}
              </div>

              {!clientId && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Client Name / Walk-in</label>
                  <input 
                    type="text" 
                    placeholder={type === 'buy' ? 'Seller or Scavenger Name' : 'Buyer or Recycler Name'}
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Notes (Optional)</label>
                <textarea 
                  placeholder="Additional details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[80px] resize-none"
                />
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Amount</div>
                <div className="text-2xl font-black text-blue-600 font-mono">
                  ₱{(((Number(quantity) || 0) * (Number(pricePerUnit) || 0)) - (Number(discount) || 0)).toFixed(2)}
                </div>
              </div>

              <div className="pt-2 sticky bottom-0 bg-white pb-2">
                <button type="submit" className="w-full py-4 bg-blue-600 shadow-lg shadow-blue-600/20 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95">
                  <Plus size={20} /> Record Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {receiptTx && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm flex flex-col relative font-mono text-sm border-t-8 border-blue-600">
            <button onClick={() => setReceiptTx(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight font-sans">SCRAP_TRACK v2.4</h2>
              <p className="text-gray-500 text-xs mt-1">Official Receipt</p>
            </div>
            <div className="space-y-2 mb-6 border-b border-dashed border-gray-300 pb-4">
              <div className="flex justify-between"><span className="text-gray-500">Date:</span> <span className="font-bold">{new Date(receiptTx.date).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tx ID:</span> <span className="font-bold">#{(receiptTx.id).toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type:</span> <span className="font-bold uppercase text-blue-600">{receiptTx.type}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Client:</span> <span className="font-bold">{receiptTx.clientName}</span></div>
              {receiptTx.clientId && clients.find(c => c.id === receiptTx.clientId)?.paymentTerms && (
                <div className="flex justify-between"><span className="text-gray-500">Terms:</span> <span className="font-bold text-purple-700">{clients.find(c => c.id === receiptTx.clientId)?.paymentTerms}</span></div>
              )}
              {receiptTx.notes && (
                <div className="mt-2"><span className="text-gray-500 block mb-1">Notes:</span> <span className="text-xs text-gray-700 italic">{receiptTx.notes}</span></div>
              )}
            </div>
            <div className="space-y-2 mb-6">
              <div className="font-bold text-gray-900 truncate">
                {materials.find(m => m.id === receiptTx.materialId)?.name || 'Unknown'}
              </div>
              <div className="flex justify-between items-center">
                <span>{receiptTx.quantity} x ₱{receiptTx.pricePerUnit.toFixed(2)}</span>
                <span>₱{(receiptTx.quantity * receiptTx.pricePerUnit).toFixed(2)}</span>
              </div>
              {(receiptTx.discount || 0) > 0 && (
                <div className="flex justify-between items-center text-red-500 mt-1">
                  <span>Discount</span>
                  <span>-₱{receiptTx.discount?.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="border-t border-dashed border-gray-300 pt-4 mb-6">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>TOTAL:</span>
                <span>₱{receiptTx.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                <span>Payment Method:</span>
                <span className="font-bold text-gray-700">{receiptTx.paymentMethod || 'Cash'}</span>
              </div>
            </div>
            <div className="text-center text-gray-400 text-xs italic">
              Thank you for working with us!
            </div>
            <button 
              onClick={() => window.print()}
              className="mt-6 flex items-center justify-center gap-2 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg font-sans transition-colors"
            >
              <Printer size={16} /> Print Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
