import React, { useState, useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { Plus, Receipt, Search, Calendar, X, Trash2, Edit } from 'lucide-react';
import { ExpenseCategory, Expense } from '../types';
import ConfirmModal from './ConfirmModal';

export default function Expenses() {
  const { expenses, addExpense, updateExpense, deleteExpense, clients, syncCrmTransactionsToExpenses } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expenseType, setExpenseType] = useState<'Operational' | 'CRM'>('Operational');
  const [category, setCategory] = useState<ExpenseCategory>('Other');
  const [description, setDescription] = useState('');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [clientId, setClientId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'dueDate'>('date');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<{title: string, message: string} | null>(null);
  
  const amount = (Number(quantity) > 0) ? (Number(quantity) * Number(unitPrice)) : (Number(unitPrice) || 0);

  const openModal = (exp?: Expense) => {
    if (exp) {
      setEditingId(exp.id);
      setExpenseType(exp.type || 'Operational');
      setCategory(exp.category);
      setDescription(exp.description);
      setQuantity(exp.quantity || '');
      setUnitPrice(exp.unitPrice || '');
      setClientId(exp.clientId || '');
      setDueDate(exp.dueDate || '');
    } else {
      setEditingId(null);
      setExpenseType('Operational');
      setCategory('Other');
      setDescription('');
      setQuantity('');
      setUnitPrice('');
      setClientId('');
      setDueDate('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    try {
      if (editingId) {
        await updateExpense(editingId, {
          amount,
          category,
          description,
          type: expenseType,
          ...(quantity ? { quantity: Number(quantity) } : {}),
          ...(unitPrice ? { unitPrice: Number(unitPrice) } : {}),
          ...(clientId ? { clientId } : {}),
          ...(dueDate ? { dueDate } : {}),
        });
      } else {
        await addExpense({
          amount,
          category,
          description,
          type: expenseType,
          ...(quantity ? { quantity: Number(quantity) } : {}),
          ...(unitPrice ? { unitPrice: Number(unitPrice) } : {}),
          date: new Date().toISOString(),
          ...(clientId ? { clientId } : {}),
          ...(dueDate ? { dueDate } : {}),
        });
      }

      setIsModalOpen(false);
      setQuantity('');
      setUnitPrice('');
      setDescription('');
      setExpenseType('Operational');
      setCategory('Other');
      setClientId('');
      setDueDate('');
      setEditingId(null);
    } catch (err: any) {
      setAlertModal({title: "Error saving expense", message: err.message});
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteExpense(deleteConfirmId);
    } catch (err: any) {
      setAlertModal({title: "Error deleting expense", message: err.message});
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const filteredExpenses = useMemo(() => {
    const filtered = expenses.filter(exp => {
      // Filter out CRM expenses where the client no longer exists
      if (exp.type === 'CRM' && exp.clientId) {
        const clientExists = clients.some(c => c.id === exp.clientId);
        if (!clientExists) return false;
      }

      const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            exp.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesDate = true;
      const eDate = new Date(exp.date).getTime();
      if (dateStart) {
        matchesDate = matchesDate && eDate >= new Date(dateStart).getTime();
      }
      if (dateEnd) {
        matchesDate = matchesDate && eDate <= new Date(dateEnd).getTime() + 86400000;
      }

      return matchesSearch && matchesDate;
    });

    return filtered.sort((a, b) => {
        if (sortBy === 'dueDate') {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [expenses, searchTerm, dateStart, dateEnd, sortBy]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Expenses</h2>
          <p className="text-gray-500 mt-1">Track your daily operations and operational costs.</p>
        </div>
        <button 
          onClick={async () => {
            await syncCrmTransactionsToExpenses();
            setAlertModal({title: "Sync Complete", message: "CRM transactions have been synced to expenses."});
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
        >
          <Receipt size={20} />
          Sync CRM Transactions
        </button>
        <button 
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
        >
          <Plus size={20} />
          Record Expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between col-span-1 md:col-span-2 lg:col-span-1">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Expenses (Period)</p>
            <h3 className="text-2xl font-bold font-mono text-rose-600">₱{totalExpenses.toFixed(2)}</h3>
          </div>
          <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center">
            <Receipt size={20} className="text-rose-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gray-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search description or category..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 w-full sm:w-auto">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="text-sm outline-none bg-transparent text-gray-600">
                    <option value="date">Sort by Date</option>
                    <option value="dueDate">Sort by Due Date</option>
                  </select>
              </div>
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

        <div className="overflow-x-auto">
          <h3 className="text-lg font-semibold text-gray-900 px-6 py-4">Operational Expenses</h3>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.filter(e => !e.type || e.type === 'Operational').map(exp => {
                const date = new Date(exp.date);
                return (
                  <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                      {date.toLocaleDateString()} <span className="text-gray-400 ml-1">{date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                      {exp.dueDate ? new Date(exp.dueDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-100 text-slate-700">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{exp.description}</td>
                    <td className="px-6 py-4 text-right font-bold font-mono text-rose-600">₱{exp.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openModal(exp)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit Expense"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmId(exp.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Expense"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredExpenses.filter(e => !e.type || e.type === 'Operational').length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No operational expenses.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <h3 className="text-lg font-semibold text-gray-900 px-6 py-4 mt-6">CRM Transactions</h3>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.filter(e => e.type === 'CRM').map(exp => {
                const date = new Date(exp.date);
                const client = clients.find(c => c.id === exp.clientId);
                return (
                  <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                      {date.toLocaleDateString()} <span className="text-gray-400 ml-1">{date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                      {exp.dueDate ? new Date(exp.dueDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{exp.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{client ? client.name : '-'}</td>
                    <td className="px-6 py-4 text-right font-bold font-mono text-rose-600">₱{exp.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openModal(exp)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit Expense"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmId(exp.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Expense"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredExpenses.filter(e => e.type === 'CRM').length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No CRM transactions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 text-gray-900">
              <h3 className="font-bold text-lg">{editingId ? 'Edit Expense' : 'Record Expense'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expense Type</label>
                <select 
                  value={expenseType}
                  onChange={(e) => setExpenseType(e.target.value as 'Operational' | 'CRM')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  <option value="Operational">Operational</option>
                  <option value="CRM">CRM Transaction</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="Fuel/Transport">Fuel/Transport</option>
                  <option value="Salary">Salary</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Meals">Meals</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Gas for pickup truck"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    placeholder="e.g. 50"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₱</span>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      placeholder="e.g. 65"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer (Optional)</label>
                <select 
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  <option value="">Select a customer...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date (Optional)</label>
                <input 
                  type="date" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₱</span>
                  <input 
                    type="number" 
                    readOnly
                    value={amount.toFixed(2)}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg bg-gray-50 text-gray-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2">
                  <Plus size={20} /> Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="Delete Expense"
        message="Are you sure you want to delete this expense?"
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
    </div>
  );
}
