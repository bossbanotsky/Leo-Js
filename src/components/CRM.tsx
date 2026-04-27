import React, { useState, useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { Plus, Users, Search, Building2, Phone, MapPin, Trash2, Edit } from 'lucide-react';
import { Client } from '../types';
import ConfirmModal from './ConfirmModal';

export default function CRM() {
  const { clients, addClient, updateClient, deleteClient, clientTransactions, addClientTransaction, deleteClientTransaction, recurringTransactions, addRecurringTransaction, transactions, materials } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'Supplier' | 'Buyer' | 'Both'>('Both');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Lead'>('Active');
  const [paymentMethod, setPaymentMethod] = useState<'' | 'Cash' | 'Card' | 'Bank Transfer' | 'Other'>('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [customTerms, setCustomTerms] = useState('');
  const [useCustomTerms, setUseCustomTerms] = useState(false);
  const [notes, setNotes] = useState('');

  const commonTerms = ['Net 15', 'Net 30', 'Net 60', 'Due on Receipt', 'COD'];

  const [filterType, setFilterType] = useState<'All' | 'Supplier' | 'Buyer' | 'Both'>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Inactive' | 'Lead'>('All');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<{title: string, message: string} | null>(null);
  const [ledgerClient, setLedgerClient] = useState<Client | null>(null);
  const [newTxAmount, setNewTxAmount] = useState<number | ''>('');
  const [newTxType, setNewTxType] = useState<'Payment' | 'Advance' | 'Adjustment'>('Payment');
  const [newTxNotes, setNewTxNotes] = useState('');

  const [newRecAmount, setNewRecAmount] = useState<number | ''>('');
  const [newRecFrequency, setNewRecFrequency] = useState<'Weekly' | 'Monthly'>('Monthly');
  const [newRecType, setNewRecType] = useState<'Payment' | 'Advance'>('Payment');
  const [newRecNextDate, setNewRecNextDate] = useState('');

  const openModal = (client?: Client) => {
    if (client) {
      setEditingId(client.id);
      setName(client.name);
      setType(client.type);
      setStatus(client.status);
      setPaymentMethod(client.paymentMethod || '');
      setBankName(client.bankName || '');
      setBankAccountNumber(client.bankAccountNumber || '');
      setPhone(client.phone || '');
      setAddress(client.address || '');
      
      const isCommon = commonTerms.includes(client.paymentTerms || '');
      if (client.paymentTerms && !isCommon) {
        setUseCustomTerms(true);
        setCustomTerms(client.paymentTerms);
        setPaymentTerms('Custom');
      } else {
        setUseCustomTerms(false);
        setPaymentTerms(client.paymentTerms || '');
        setCustomTerms('');
      }
      
      setNotes(client.notes || '');
    } else {
      setEditingId(null);
      setName('');
      setType('Both');
      setStatus('Active');
      setPaymentMethod('');
      setBankName('');
      setBankAccountNumber('');
      setPhone('');
      setAddress('');
      setPaymentTerms('');
      setCustomTerms('');
      setUseCustomTerms(false);
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      const finalTerms = paymentTerms === 'Custom' ? customTerms : paymentTerms;
      
      const clientData = {
        name,
        type,
        status: status || 'Active',
        ...(paymentMethod.trim() ? { paymentMethod: paymentMethod as any } : {}),
        ...(bankName.trim() ? { bankName: bankName.trim() } : {}),
        ...(bankAccountNumber.trim() ? { bankAccountNumber: bankAccountNumber.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(address.trim() ? { address: address.trim() } : {}),
        ...(finalTerms.trim() ? { paymentTerms: finalTerms.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {})
      };

      if (editingId) {
        await updateClient(editingId, clientData);
      } else {
        await addClient(clientData);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setAlertModal({title: "Error saving client", message: err.message});
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteClient(deleteConfirmId);
    } catch (err: any) {
      setAlertModal({title: "Error deleting client", message: err.message});
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleAddTransaction = async () => {
    if (!ledgerClient || !newTxAmount) return;
    try {
      await addClientTransaction({
        clientId: ledgerClient.id,
        amount: Number(newTxAmount),
        type: newTxType,
        notes: newTxNotes,
        date: new Date().toISOString()
      });
      setNewTxAmount('');
      setNewTxNotes('');
    } catch (err: any) {
      setAlertModal({title: "Error adding transaction", message: err.message});
    }
  };

  const handleAddRecurringTransaction = async () => {
    if (!ledgerClient || !newRecAmount || !newRecNextDate) return;
    try {
      await addRecurringTransaction({
        clientId: ledgerClient.id,
        amount: Number(newRecAmount),
        type: newRecType,
        frequency: newRecFrequency,
        nextDueDate: new Date(newRecNextDate).toISOString()
      });
      setNewRecAmount('');
      setNewRecNextDate('');
    } catch (err: any) {
      setAlertModal({title: "Error adding recurring transaction", message: err.message});
    }
  };

  const getClientBalance = (clientId: string) => {
    const cTxs = clientTransactions.filter(t => t.clientId === clientId);
    const mTxs = transactions.filter(t => t.clientId === clientId);
    
    const clientBalance = cTxs.reduce((sum, t) => sum + (t.type === 'Payment' ? t.amount : -t.amount), 0);
    const materialBalance = mTxs.reduce((sum, t) => sum + (t.type === 'buy' ? t.totalAmount : -t.totalAmount), 0);
    
    return clientBalance + materialBalance;
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const searchMatch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.phone && c.phone.toLowerCase().includes(searchTerm.toLowerCase()));
      const typeMatch = filterType === 'All' || c.type === filterType;
      const statusMatch = filterStatus === 'All' || c.status === filterStatus;
      return searchMatch && typeMatch && statusMatch;
    });
  }, [clients, searchTerm, filterType, filterStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">CRM</h2>
          <p className="text-gray-500 mt-1">Manage your suppliers, buyers, and partners.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
        >
          <Plus size={20} />
          Add Contact
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between col-span-1 md:col-span-2 lg:col-span-1">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Contacts</p>
            <h3 className="text-2xl font-bold font-mono text-blue-600">{clients.length}</h3>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
            <Users size={20} className="text-blue-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-4 items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search contacts..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="All">All Types</option>
            <option value="Supplier">Supplier</option>
            <option value="Buyer">Buyer</option>
            <option value="Both">Both</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Lead">Lead</option>
          </select>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredClients.map(client => (
            <div key={client.id} className="border border-gray-100 rounded-xl p-5 hover:border-blue-200 hover:shadow-md transition-all flex flex-col group relative bg-white">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-slate-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{client.name}</h4>
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {client.type}
                    </span>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${client.status === 'Active' ? 'bg-green-50 text-green-700' : client.status === 'Lead' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-700'}`}>
                      {client.status}
                    </span>
                    <div className="text-xs font-bold mt-1 text-gray-700">
                      Balance: <span className={getClientBalance(client.id) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>₱{getClientBalance(client.id).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setLedgerClient(client)} className="text-slate-300 hover:text-blue-500 text-xs font-semibold">Ledger</button>
                  <button onClick={() => openModal(client)} className="text-slate-300 hover:text-blue-500"><Edit size={16}/></button>
                  <button onClick={() => setDeleteConfirmId(client.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
              
              <div className="space-y-2 mt-2 text-sm text-gray-600">
                {client.paymentMethod && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 w-fit">{client.paymentMethod}</span>
                    {client.paymentTerms && (
                      <span className="text-sm font-bold px-3 py-1 rounded-lg bg-purple-100 text-purple-800 border border-purple-200 w-fit">
                        Terms: {client.paymentTerms}
                      </span>
                    )}
                    {(client.bankName || client.bankAccountNumber) && (
                      <div className="text-xs text-gray-500 ml-2">
                        {client.bankName} - {client.bankAccountNumber}
                      </div>
                    )}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-start gap-2">
                    <Phone size={14} className="mt-0.5 shrink-0 text-slate-400" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                    <span className="line-clamp-2 leading-relaxed">{client.address}</span>
                  </div>
                )}
                {client.notes && (
                  <div className="mt-3 pt-3 border-t border-slate-50 text-xs italic text-slate-500 line-clamp-2">
                    {client.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredClients.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              <Users size={32} className="mx-auto mb-3 opacity-20" />
              No contacts found.
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 text-gray-900">
              <h3 className="font-bold text-lg">{editingId ? 'Edit Contact' : 'New Contact'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company / Person Name</label>
                <input 
                  type="text" required
                  value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select 
                  value={type} onChange={(e) => setType(e.target.value as 'Supplier'|'Buyer'|'Both')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Both">Both (Buys & Sells)</option>
                  <option value="Supplier">Supplier / Scrapper</option>
                  <option value="Buyer">Buyer / Factory</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select 
                  value={status} onChange={(e) => setStatus(e.target.value as 'Active'|'Inactive'|'Lead')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Lead">Lead</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Payment Method</label>
                <select 
                  value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Not Specified</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {paymentMethod === 'Bank Transfer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                    <input 
                      type="text" 
                      value={bankName} onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bank Account Number</label>
                    <input 
                      type="text" 
                      value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone (Optional)</label>
                <input 
                  type="tel" 
                  value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address (Optional)</label>
                <textarea 
                  rows={2}
                  value={address} onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms (Optional)</label>
                <div className="space-y-2">
                  <select 
                    value={paymentTerms} 
                    onChange={(e) => {
                      setPaymentTerms(e.target.value);
                      setUseCustomTerms(e.target.value === 'Custom');
                      if (e.target.value !== 'Custom') {
                        setCustomTerms('');
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">No Terms</option>
                    {commonTerms.map(term => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                    <option value="Custom">Custom Terms...</option>
                  </select>
                  
                  {useCustomTerms && (
                    <input 
                      type="text" 
                      placeholder="Enter custom terms"
                      value={customTerms} 
                      onChange={(e) => setCustomTerms(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 animate-in fade-in slide-in-from-top-2 duration-200"
                      autoFocus
                    />
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <textarea 
                  rows={2}
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="Delete Contact"
        message="Are you sure you want to delete this contact?"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmId(null)}
        confirmText="Delete"
      />

      <ConfirmModal
        isOpen={alertModal !== null}
        title={alertModal?.title || "Alert"}
        message={alertModal?.message || ""}
        onConfirm={() => setAlertModal(null)}
        onCancel={() => setAlertModal(null)}
        confirmText="OK"
        cancelText="Close"
      />

      {ledgerClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 text-gray-900">
              <div>
                <h3 className="font-bold text-lg">{ledgerClient.name} - Ledger</h3>
                {ledgerClient.paymentTerms && (
                  <p className="text-xs font-semibold text-purple-700">Terms: {ledgerClient.paymentTerms}</p>
                )}
              </div>
              <button onClick={() => setLedgerClient(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-4 gap-2">
                <select value={newTxType} onChange={(e) => setNewTxType(e.target.value as any)} className="col-span-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="Payment">Payment</option>
                  <option value="Advance">Advance</option>
                  <option value="Adjustment">Adjustment</option>
                </select>
                <input type="number" placeholder="Amount" value={newTxAmount} onChange={(e) => setNewTxAmount(Number(e.target.value))} className="col-span-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <input type="text" placeholder="Notes" value={newTxNotes} onChange={(e) => setNewTxNotes(e.target.value)} className="col-span-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <button onClick={handleAddTransaction} className="col-span-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">Add</button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-4">
                <div>
                   <h4 className="text-sm font-bold text-gray-700">Scheduled Recurring</h4>
                   <div className="grid grid-cols-5 gap-2 mt-2">
                    <select value={newRecType} onChange={(e) => setNewRecType(e.target.value as any)} className="col-span-1 px-3 py-2 border border-gray-200 rounded-lg text-xs">
                      <option value="Payment">Payment</option>
                      <option value="Advance">Advance</option>
                    </select>
                    <input type="number" placeholder="Amt" value={newRecAmount} onChange={(e) => setNewRecAmount(Number(e.target.value))} className="col-span-1 px-3 py-2 border border-gray-200 rounded-lg text-xs" />
                    <select value={newRecFrequency} onChange={(e) => setNewRecFrequency(e.target.value as any)} className="col-span-1 px-3 py-2 border border-gray-200 rounded-lg text-xs">
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                    <input type="date" value={newRecNextDate} onChange={(e) => setNewRecNextDate(e.target.value)} className="col-span-1 px-3 py-2 border border-gray-200 rounded-lg text-xs" />
                    <button onClick={handleAddRecurringTransaction} className="col-span-1 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700">Add</button>
                   </div>
                   <div className="mt-2 space-y-1">
                     {recurringTransactions.filter(r => r.clientId === ledgerClient.id).map(r => (
                       <div key={r.id} className="text-xs bg-gray-50 p-2 rounded flex justify-between">
                         <span>{r.type} {r.frequency} - {r.amount}</span>
                         <span className="font-bold">{new Date(r.nextDueDate).toLocaleDateString()}</span>
                       </div>
                     ))}
                   </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-700">Transaction History</h4>
                  {
                    (() => {
                      let balance = 0;
                      const cTxs = clientTransactions.filter(t => t.clientId === ledgerClient.id).map(t => ({
                        id: t.id,
                        date: t.date,
                        type: t.type,
                        notes: t.notes,
                        amount: (t.type === 'Payment' ? t.amount : -t.amount),
                        label: t.type
                      }));
                      
                      const mTxs = transactions.filter(t => t.clientId === ledgerClient.id).map(t => {
                        const matName = materials.find(m => m.id === t.materialId)?.name || 'Material';
                        return {
                          id: t.id,
                          date: t.date,
                          type: t.type,
                          notes: t.notes,
                          amount: (t.type === 'buy' ? t.totalAmount : -t.totalAmount),
                          label: `${t.type === 'buy' ? 'Purchased' : 'Sold'}: ${matName}`
                        };
                      });

                      return [...cTxs, ...mTxs]
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map(t => {
                          balance += t.amount;
                          return (
                            <div key={t.id} className="group flex justify-between items-center py-2 border-b border-gray-50">
                              <div className="flex items-center gap-3">
                                {t.type && (
                                  <button 
                                    onClick={async () => {
                                      if (confirm('Delete this ledger entry?')) {
                                        try {
                                          await deleteClientTransaction(t.id);
                                        } catch (err: any) {
                                          setAlertModal({title: "Error", message: err.message});
                                        }
                                      }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                                <div>
                                  <div className="text-sm font-semibold">{t.label} {t.notes && <span className="text-xs font-normal text-gray-400">({t.notes})</span>}</div>
                                  <div className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`font-mono text-sm font-bold ${t.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {t.amount >= 0 ? '+' : ''}{t.amount.toFixed(2)}
                                </div>
                                <div className="text-[10px] text-gray-400">Bal: {balance.toFixed(2)}</div>
                              </div>
                            </div>
                          );
                        });
                    })()
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
