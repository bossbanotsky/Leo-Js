import React, { useState, useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { Plus, Users, Search, Building2, Phone, MapPin, Trash2, Edit, Minus } from 'lucide-react';
import { Client } from '../types';
import ConfirmModal from './ConfirmModal';

export default function CRM() {
  const { clients, addClient, updateClient, deleteClient, clientTransactions, addClientTransaction, deleteClientTransaction, recurringTransactions, addRecurringTransaction, deleteRecurringTransaction, transactions, materials } = useAppStore();
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
  const [newRecFrequency, setNewRecFrequency] = useState<'Weekly' | 'Monthly' | 'Custom'>('Monthly');
  const [newRecInterval, setNewRecInterval] = useState<number>(1);
  const [newRecTargetDay, setNewRecTargetDay] = useState<number>(1);
  const [newRecType, setNewRecType] = useState<'Payment' | 'Advance'>('Payment');
  const [newRecNextDate, setNewRecNextDate] = useState('');
  const [newRecNotes, setNewRecNotes] = useState('');

  const [activeTab, setActiveTab] = useState<'info' | 'ledger' | 'recurring'>('info');

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
        interval: newRecInterval,
        targetDay: newRecTargetDay,
        nextDueDate: new Date(newRecNextDate).toISOString(),
        notes: newRecNotes
      });
      setNewRecAmount('');
      setNewRecNextDate('');
      setNewRecNotes('');
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
      </div>      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                  <Users size={20} />
                </div>
                <h3 className="font-black text-xl text-gray-900 tracking-tight">{editingId ? 'Modify Contact Profile' : 'Register New Contact'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Company / Full Name</label>
                  <input 
                    type="text" required
                    placeholder="e.g. Acme Scrap Corp"
                    value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Relationship Type</label>
                  <select 
                    value={type} onChange={(e) => setType(e.target.value as 'Supplier'|'Buyer'|'Both')}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm"
                  >
                    <option value="Both">Strategic Partner (Both)</option>
                    <option value="Supplier">Supplier / Seller</option>
                    <option value="Buyer">Buyer / Client</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Client Status</label>
                  <select 
                    value={status} onChange={(e) => setStatus(e.target.value as 'Active'|'Inactive'|'Lead')}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm"
                  >
                    <option value="Active">Active Performance</option>
                    <option value="Inactive">On-Hold / Inactive</option>
                    <option value="Lead">Potential Lead</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Direct Contact No.</label>
                  <input 
                    type="tel" 
                    placeholder="+63 9xx xxxx"
                    value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Default Terms</label>
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm"
                    >
                      <option value="">No Credit Terms</option>
                      {commonTerms.map(term => (
                        <option key={term} value={term}>{term}</option>
                      ))}
                      <option value="Custom">Custom Terms...</option>
                    </select>
                    
                    {useCustomTerms && (
                      <input 
                        type="text" 
                        placeholder="e.g. 90 Days Post-Audit"
                        value={customTerms} 
                        onChange={(e) => setCustomTerms(e.target.value)}
                        className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 animate-in fade-in slide-in-from-top-2 duration-200 font-medium text-blue-700"
                        autoFocus
                      />
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                   <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="col-span-full mb-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bank Settlement Details</span>
                      </div>
                      <div>
                        <input 
                          type="text" 
                          placeholder="Payout Method"
                          value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <input 
                          type="text" 
                          placeholder="Bank / Provider"
                          value={bankName} onChange={(e) => setBankName(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <input 
                          type="text" 
                          placeholder="Account Number"
                          value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                   </div>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Office Address</label>
                  <textarea 
                    rows={3}
                    placeholder="Physical address for logistics..."
                    value={address} onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm resize-none"
                  />
                </div>
                
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Administrative Notes</label>
                  <textarea 
                    rows={3}
                    placeholder="Internal account history or preferences..."
                    value={notes} onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm resize-none"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-slate-50 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all text-sm uppercase tracking-widest"
                >
                  Discard
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] py-4 px-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 text-sm uppercase tracking-widest"
                >
                  Finalize Profile
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="font-black text-xl text-gray-900">{ledgerClient.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Account Control Center</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                    <span className={getClientBalance(ledgerClient.id) >= 0 ? 'text-emerald-600' : 'text-rose-600' + " text-sm font-mono font-bold"}>
                      ₱{getClientBalance(ledgerClient.id).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => { setLedgerClient(null); setActiveTab('info'); }} 
                className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-6 border-b border-gray-100 gap-6 bg-white">
              <button 
                onClick={() => setActiveTab('ledger')}
                className={`py-3 text-sm font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'ledger' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Ledger & History
              </button>
              <button 
                onClick={() => setActiveTab('recurring')}
                className={`py-3 text-sm font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'recurring' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Terms & Recurring
              </button>
              <button 
                onClick={() => setActiveTab('info')}
                className={`py-3 text-sm font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Quick Info
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {activeTab === 'info' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Primary Contact</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone size={14} /> {ledgerClient.phone || 'No phone'}
                        </div>
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                          <MapPin size={14} className="mt-1 shrink-0" /> {ledgerClient.address || 'No address'}
                        </div>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Billing Setup</p>
                      <div className="space-y-2">
                        <div className="text-sm font-bold text-slate-700">Terms: {ledgerClient.paymentTerms || 'Standard'}</div>
                        <div className="text-xs text-slate-500">Method: {ledgerClient.paymentMethod || 'Variable'}</div>
                        {ledgerClient.bankName && (
                          <div className="text-xs text-slate-500">{ledgerClient.bankName} • {ledgerClient.bankAccountNumber}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  {ledgerClient.notes && (
                    <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                      <p className="text-[10px] font-black text-amber-700 uppercase mb-2">Account Notes</p>
                      <p className="text-sm text-amber-900 leading-relaxed italic">"{ledgerClient.notes}"</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'ledger' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  {/* New Quick Transaction Form */}
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                    <p className="text-[10px] font-black text-blue-700 uppercase mb-3 flex items-center gap-1">
                      <Plus size={10} /> Fast Ledger Entry
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <select 
                        value={newTxType} 
                        onChange={(e) => setNewTxType(e.target.value as any)} 
                        className="px-3 py-2.5 bg-white border border-blue-100 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="Payment">Payment (In)</option>
                        <option value="Advance">Advance (Out)</option>
                        <option value="Adjustment">Adjustment</option>
                      </select>
                      <input 
                        type="number" 
                        placeholder="Amount (₱)" 
                        value={newTxAmount} 
                        onChange={(e) => setNewTxAmount(Number(e.target.value))} 
                        className="px-3 py-2.5 bg-white border border-blue-100 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" 
                      />
                      <input 
                        type="text" 
                        placeholder="Reference / Memo" 
                        value={newTxNotes} 
                        onChange={(e) => setNewTxNotes(e.target.value)} 
                        className="px-3 py-2.5 bg-white border border-blue-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                      />
                      <button 
                        onClick={handleAddTransaction} 
                        className="py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
                      >
                        POST ENTRY
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-2 mb-2">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Transaction Timeline</h4>
                      <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Sorted by date</div>
                    </div>
                    
                    <div className="space-y-1">
                      {
                        (() => {
                          let runningBalance = 0;
                          const cTxs = clientTransactions.filter(t => t.clientId === ledgerClient.id).map(t => ({
                            id: t.id,
                            date: t.date,
                            type: t.type,
                            notes: t.notes,
                            amount: (t.type === 'Payment' ? t.amount : -t.amount),
                            label: t.type,
                            isManual: true
                          }));
                          
                          const mTxs = transactions.filter(t => t.clientId === ledgerClient.id).map(t => {
                            const matName = materials.find(m => m.id === t.materialId)?.name || 'Material';
                            return {
                              id: t.id,
                              date: t.date,
                              type: t.type,
                              notes: t.notes,
                              amount: (t.type === 'buy' ? t.totalAmount : -t.totalAmount),
                              label: `${t.type === 'buy' ? 'Purchased' : 'Sold'}: ${matName}`,
                              isManual: false
                            };
                          });

                          const allSorted = [...cTxs, ...mTxs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                          if (allSorted.length === 0) {
                            return (
                              <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                                <p className="text-sm text-slate-400 italic">No transaction history detected</p>
                              </div>
                            );
                          }

                          return allSorted.map(t => {
                            runningBalance += t.amount;
                            return (
                              <div key={t.id} className="group flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                                <div className="flex items-center gap-4">
                                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${t.amount >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {t.amount >= 0 ? <Plus size={14} /> : <Minus size={14} className="rotate-45" />}
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                      {t.label} 
                                      {t.isManual && (
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
                                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all ml-1"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(t.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                                      {t.notes && (
                                        <>
                                          <span className="h-0.5 w-0.5 rounded-full bg-slate-300"></span>
                                          <span className="text-[10px] font-medium text-slate-400 italic">"{t.notes}"</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-mono text-sm font-black ${t.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-400">Bal: ₱{runningBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                </div>
                              </div>
                            );
                          });
                        })()
                      }
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'recurring' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  {/* Recurring Setup Form */}
                  <div className="p-6 rounded-2xl bg-purple-50 border border-purple-100 shadow-sm shadow-purple-50">
                    <h5 className="text-[11px] font-black text-purple-700 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <div className="h-5 w-5 rounded bg-purple-600 text-white flex items-center justify-center">
                        <Plus size={12} />
                      </div>
                      Configure New Recurring Schedule
                    </h5>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-purple-600 uppercase ml-1">Type</label>
                        <select 
                          value={newRecType} 
                          onChange={(e) => setNewRecType(e.target.value as any)} 
                          className="w-full px-3 py-2.5 bg-white border border-purple-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                          <option value="Payment">Auto Payment (In)</option>
                          <option value="Advance">Auto Advance (Out)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-purple-600 uppercase ml-1">Amount</label>
                        <input 
                          type="number" 
                          placeholder="0.00" 
                          value={newRecAmount} 
                          onChange={(e) => setNewRecAmount(Number(e.target.value))} 
                          className="w-full px-3 py-2.5 bg-white border border-purple-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none" 
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-purple-600 uppercase ml-1">Start Date</label>
                        <input 
                          type="date" 
                          value={newRecNextDate} 
                          onChange={(e) => setNewRecNextDate(e.target.value)} 
                          className="w-full px-3 py-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" 
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-purple-600 uppercase ml-1">Frequency</label>
                        <select 
                          value={newRecFrequency} 
                          onChange={(e) => setNewRecFrequency(e.target.value as any)} 
                          className="w-full px-3 py-2.5 bg-white border border-purple-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                          <option value="Weekly">Weekly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Custom">Custom Interval</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-purple-600 uppercase ml-1">
                          {newRecFrequency === 'Weekly' ? 'Every X weeks' : 'Every X months'}
                        </label>
                        <input 
                          type="number" 
                          min="1"
                          value={newRecInterval} 
                          onChange={(e) => setNewRecInterval(Number(e.target.value))} 
                          className="w-full px-3 py-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" 
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-purple-600 uppercase ml-1">Reference</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Weekly Amort." 
                          value={newRecNotes} 
                          onChange={(e) => setNewRecNotes(e.target.value)} 
                          className="w-full px-3 py-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" 
                        />
                      </div>

                      <button 
                        onClick={handleAddRecurringTransaction} 
                        className="col-span-full py-4 bg-purple-600 text-white rounded-2xl text-sm font-black hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 mt-2 uppercase tracking-widest"
                      >
                        Activate Schedule
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Active Schedules</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recurringTransactions.filter(r => r.clientId === ledgerClient.id).map(r => (
                        <div key={r.id} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${r.type === 'Payment' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {r.type}
                              </span>
                              <span className="text-xs font-mono font-black text-slate-800">₱{r.amount.toLocaleString()}</span>
                            </div>
                            <div className="text-sm font-bold text-slate-700 mb-1">{r.notes || `${r.frequency} ${r.type}`}</div>
                            <div className="text-[10px] text-slate-400 font-medium italic">
                              Repeats every {r.interval || 1} {r.frequency === 'Weekly' ? 'weeks' : 'months'}
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                            <div>
                              <div className="text-[8px] font-black text-slate-300 uppercase">Next Expected</div>
                              <div className="text-xs font-bold text-blue-600">{new Date(r.nextDueDate).toLocaleDateString(undefined, {month: 'long', day: 'numeric'})}</div>
                            </div>
                            <button 
                              onClick={async () => {
                                if (confirm('Remove this recurring schedule?')) {
                                  try {
                                    await deleteRecurringTransaction(r.id);
                                  } catch (err: any) {
                                    setAlertModal({title: "Error", message: err.message});
                                  }
                                }
                              }}
                              className="text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {recurringTransactions.filter(r => r.clientId === ledgerClient.id).length === 0 && (
                        <div className="col-span-full py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-100">
                           <p className="text-xs text-slate-400 italic">No active recurring schedules</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer Summary */}
            {(activeTab === 'ledger' || activeTab === 'recurring') && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end items-center gap-4">
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Current Account Balance</p>
                   <p className={`text-xl font-mono font-black ${getClientBalance(ledgerClient.id) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                     ₱{getClientBalance(ledgerClient.id).toLocaleString(undefined, {minimumFractionDigits: 2})}
                   </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
