import React, { createContext, useContext, useState, useEffect } from 'react';
import { Material, Transaction, Expense, Client, ClientTransaction, RecurringTransactionSchedule } from '../types';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, runTransaction, getDoc, serverTimestamp, query, orderBy, getDocs } from 'firebase/firestore';

interface AppState {
  materials: Material[];
  transactions: Transaction[];
  expenses: Expense[];
  clients: Client[];
  clientTransactions: ClientTransaction[];
  recurringTransactions: RecurringTransactionSchedule[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'totalAmount' | 'createdAt' | 'userId'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addClientTransaction: (transaction: Omit<ClientTransaction, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  addRecurringTransaction: (recurring: Omit<RecurringTransactionSchedule, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  syncCrmTransactionsToExpenses: () => Promise<void>;
  updateMaterialPrice: (id: string, buyPrice: number, sellPrice: number) => Promise<void>;
  addMaterial: (material: Omit<Material, 'id' | 'currentStock' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  updateMaterial: (id: string, updates: Partial<Omit<Material, 'id' | 'createdAt' | 'userId'>>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Omit<Expense, 'id' | 'createdAt' | 'userId'>>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  updateClient: (id: string, updates: Partial<Omit<Client, 'id' | 'createdAt' | 'userId'>>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientTransactions, setClientTransactions] = useState<ClientTransaction[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransactionSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMaterials([]);
      setTransactions([]);
      setExpenses([]);
      setClients([]);
      setClientTransactions([]);
      setRecurringTransactions([]);
      setLoading(false);
      return;
    }

    const isCacheValid = (timestampStr: string | null) => {
      if (!timestampStr) return false;
      const cachedDate = new Date(Number(timestampStr));
      const now = new Date();
      
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      };
      
      const formatter = new Intl.DateTimeFormat('en-PH', options);
      return formatter.format(cachedDate) === formatter.format(now);
    };

    const fetchData = async () => {
      setLoading(true);

      const collections = [
        { key: 'materials', ref: collection(db, `users/${user.uid}/materials`), setter: setMaterials, order: orderBy('createdAt', 'desc') },
        { key: 'transactions', ref: collection(db, `users/${user.uid}/transactions`), setter: setTransactions, order: orderBy('createdAt', 'desc') },
        { key: 'expenses', ref: collection(db, `users/${user.uid}/expenses`), setter: setExpenses, order: orderBy('date', 'desc') },
        { key: 'clients', ref: collection(db, `users/${user.uid}/clients`), setter: setClients, order: orderBy('createdAt', 'desc') },
        { key: 'clientTransactions', ref: collection(db, `users/${user.uid}/clientTransactions`), setter: setClientTransactions, order: orderBy('createdAt', 'desc') },
        { key: 'recurringTransactions', ref: collection(db, `users/${user.uid}/recurringTransactions`), setter: setRecurringTransactions, order: orderBy('createdAt', 'desc') }
      ];

      for (const col of collections) {
        const cached = localStorage.getItem(`${col.key}_cache`);
        const timestamp = localStorage.getItem(`${col.key}_timestamp`);

        if (cached && isCacheValid(timestamp)) {
          col.setter(JSON.parse(cached));
          continue;
        }

        try {
          const q = query(col.ref, col.order);
          const snapshot = await getDocs(q);
          const data: any[] = [];
          snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
          
          col.setter(data);
          localStorage.setItem(`${col.key}_cache`, JSON.stringify(data));
          localStorage.setItem(`${col.key}_timestamp`, String(Date.now()));
        } catch (error) {
          console.error(`Error fetching ${col.key}: `, error);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const addTransaction = async (tObj: Omit<Transaction, 'id' | 'date' | 'totalAmount' | 'createdAt' | 'userId'>) => {
    if (!user) return;
    
    const newTxId = doc(collection(db, `users/${user.uid}/transactions`)).id;
    const materialRef = doc(db, `users/${user.uid}/materials`, tObj.materialId);
    const txRef = doc(db, `users/${user.uid}/transactions`, newTxId);

    const totalAmount = (tObj.quantity * tObj.pricePerUnit) - (tObj.discount || 0);
    const date = new Date().toISOString();
    const createdAt = Date.now();

    try {
      await runTransaction(db, async (transaction) => {
        const matDoc = await transaction.get(materialRef);
        if (!matDoc.exists()) throw new Error("Material does not exist!");

        const currentStock = matDoc.data().currentStock || 0;
        const stockChange = tObj.type === 'buy' ? tObj.quantity : -tObj.quantity;
        const newStock = Math.max(0, currentStock + stockChange);

        transaction.update(materialRef, { currentStock: newStock, updatedAt: createdAt });

        const txData = {
          ...tObj,
          id: newTxId,
          userId: user.uid,
          totalAmount,
          date,
          createdAt
        };

        transaction.set(txRef, txData);
        
        // Update local state for real-time feel
        setTransactions(prev => {
          const newList = [txData as Transaction, ...prev];
          localStorage.setItem('transactions_cache', JSON.stringify(newList));
          localStorage.setItem('transactions_timestamp', String(Date.now()));
          return newList;
        });
        
        setMaterials(prev => {
          const newList = prev.map(m => m.id === tObj.materialId ? { ...m, currentStock: newStock, updatedAt: createdAt } : m);
          localStorage.setItem('materials_cache', JSON.stringify(newList));
          localStorage.setItem('materials_timestamp', String(Date.now()));
          return newList;
        });
      });
    } catch (error) {
      console.error("Transaction failed: ", error);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    
    const txToDelete = transactions.find(t => t.id === id);
    if (!txToDelete) return;

    const materialRef = doc(db, `users/${user.uid}/materials`, txToDelete.materialId);
    const txRef = doc(db, `users/${user.uid}/transactions`, id);
    const now = Date.now();

    try {
      await runTransaction(db, async (transaction) => {
        const matDoc = await transaction.get(materialRef);
        
        let newStock = 0;
        if (matDoc.exists()) {
          const currentStock = matDoc.data().currentStock || 0;
          // Reverse the stock change: if we bought, we subtract; if we sold, we add
          const stockChange = txToDelete.type === 'buy' ? -txToDelete.quantity : txToDelete.quantity;
          newStock = Math.max(0, currentStock + stockChange);
          transaction.update(materialRef, { currentStock: newStock, updatedAt: now });
        }

        transaction.delete(txRef);
        
        // Update local state
        setTransactions(prev => {
          const newList = prev.filter(t => t.id !== id);
          localStorage.setItem('transactions_cache', JSON.stringify(newList));
          localStorage.setItem('transactions_timestamp', String(Date.now()));
          return newList;
        });
        
        if (matDoc.exists()) {
          setMaterials(prev => {
            const newList = prev.map(m => m.id === txToDelete.materialId ? { ...m, currentStock: newStock, updatedAt: now } : m);
            localStorage.setItem('materials_cache', JSON.stringify(newList));
            localStorage.setItem('materials_timestamp', String(Date.now()));
            return newList;
          });
        }
      });
    } catch (error) {
      console.error("Failed to delete transaction: ", error);
      throw error;
    }
  };

  const updateMaterialPrice = async (id: string, buyPrice: number, sellPrice: number) => {
    if (!user) return;
    try {
      const materialRef = doc(db, `users/${user.uid}/materials`, id);
      const now = Date.now();
      await updateDoc(materialRef, { buyPrice, sellPrice, updatedAt: now });
      const newMaterials = materials.map(m => m.id === id ? { ...m, buyPrice, sellPrice, updatedAt: now } : m);
      setMaterials(newMaterials);
      localStorage.setItem('materials_cache', JSON.stringify(newMaterials));
    } catch (error) {
      console.error("Failed to update price: ", error);
    }
  };

  const addMaterial = async (mObj: Omit<Material, 'id' | 'currentStock' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!user) return;
    try {
      const newMatRef = doc(collection(db, `users/${user.uid}/materials`));
      const newMaterial = {
        ...mObj,
        id: newMatRef.id,
        userId: user.uid,
        currentStock: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await setDoc(newMatRef, newMaterial);
      const newMaterials = [...materials, newMaterial];
      setMaterials(newMaterials);
      localStorage.setItem('materials_cache', JSON.stringify(newMaterials));
      localStorage.setItem('materials_timestamp', String(Date.now()));
    } catch (error) {
      console.error("Failed to add material: ", error);
      throw error;
    }
  };

  const updateMaterial = async (id: string, updates: Partial<Omit<Material, 'id' | 'createdAt' | 'userId'>>) => {
    if (!user) return;
    try {
      const materialRef = doc(db, `users/${user.uid}/materials`, id);
      const now = Date.now();
      await updateDoc(materialRef, { ...updates, updatedAt: now });
      const newMaterials = materials.map(m => m.id === id ? { ...m, ...updates, updatedAt: now } : m);
      setMaterials(newMaterials);
      localStorage.setItem('materials_cache', JSON.stringify(newMaterials));
    } catch (error) {
      console.error("Failed to update material: ", error);
      throw error;
    }
  };

  const deleteMaterial = async (id: string) => {
    if (!user) return;
    try {
      const materialRef = doc(db, `users/${user.uid}/materials`, id);
      await deleteDoc(materialRef);
      const newMaterials = materials.filter(m => m.id !== id);
      setMaterials(newMaterials);
      localStorage.setItem('materials_cache', JSON.stringify(newMaterials));
    } catch (error) {
      console.error("Failed to delete material: ", error);
      throw error;
    }
  };

  const addExpense = async (eObj: Omit<Expense, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) return;
    try {
      const newExpRef = doc(collection(db, `users/${user.uid}/expenses`));
      const expData = {
        ...eObj,
        id: newExpRef.id,
        userId: user.uid,
        createdAt: Date.now()
      };
      await setDoc(newExpRef, expData);
      setExpenses(prev => {
        const newList = [expData as Expense, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        localStorage.setItem('expenses_cache', JSON.stringify(newList));
        localStorage.setItem('expenses_timestamp', String(Date.now()));
        return newList;
      });
    } catch (error) {
      console.error("Failed to add expense: ", error);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!user) return;
    try {
      const expRef = doc(db, `users/${user.uid}/expenses`, id);
      await deleteDoc(expRef);
      setExpenses(prev => {
        const newList = prev.filter(e => e.id !== id);
        localStorage.setItem('expenses_cache', JSON.stringify(newList));
        localStorage.setItem('expenses_timestamp', String(Date.now()));
        return newList;
      });
    } catch (error) {
      console.error("Failed to delete expense: ", error);
    }
  };

  const updateExpense = async (id: string, updates: Partial<Omit<Expense, 'id' | 'createdAt' | 'userId'>>) => {
    if (!user) return;
    try {
      const expRef = doc(db, `users/${user.uid}/expenses`, id);
      await updateDoc(expRef, updates);
      setExpenses(prev => {
        const newList = prev.map(e => e.id === id ? { ...e, ...updates } : e);
        localStorage.setItem('expenses_cache', JSON.stringify(newList));
        localStorage.setItem('expenses_timestamp', String(Date.now()));
        return newList;
      });
    } catch (error) {
      console.error("Failed to update expense: ", error);
      throw error;
    }
  };

  const addClient = async (cObj: Omit<Client, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) return;
    try {
      const newClientRef = doc(collection(db, `users/${user.uid}/clients`));
      const clientData = {
        ...cObj,
        id: newClientRef.id,
        userId: user.uid,
        createdAt: Date.now()
      };
      await setDoc(newClientRef, clientData);
      setClients(prev => {
        const newList = [clientData as Client, ...prev];
        localStorage.setItem('clients_cache', JSON.stringify(newList));
        localStorage.setItem('clients_timestamp', String(Date.now()));
        return newList;
      });
    } catch (error) {
      console.error("Failed to add client: ", error);
      throw error;
    }
  };

  const updateClient = async (id: string, updates: Partial<Omit<Client, 'id' | 'createdAt' | 'userId'>>) => {
    if (!user) return;
    try {
      const clientRef = doc(db, `users/${user.uid}/clients`, id);
      await updateDoc(clientRef, updates);
      setClients(prev => {
        const newList = prev.map(c => c.id === id ? { ...c, ...updates } : c);
        localStorage.setItem('clients_cache', JSON.stringify(newList));
        localStorage.setItem('clients_timestamp', String(Date.now()));
        return newList;
      });
    } catch (error) {
      console.error("Failed to update client: ", error);
      throw error;
    }
  };

  const deleteClient = async (id: string) => {
    if (!user) return;
    try {
      const clientRef = doc(db, `users/${user.uid}/clients`, id);
      await deleteDoc(clientRef);
      setClients(prev => {
        const newList = prev.filter(c => c.id !== id);
        localStorage.setItem('clients_cache', JSON.stringify(newList));
        localStorage.setItem('clients_timestamp', String(Date.now()));
        return newList;
      });
    } catch (error) {
      console.error("Failed to delete client: ", error);
      throw error;
    }
  };

  const addClientTransaction = async (tObj: Omit<ClientTransaction, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) return;
    try {
      const newTxRef = doc(collection(db, `users/${user.uid}/clientTransactions`));
      const txData = {
        ...tObj,
        id: newTxRef.id,
        userId: user.uid,
        createdAt: Date.now()
      };
      await setDoc(newTxRef, txData);
      setClientTransactions(prev => {
        const newList = [txData as ClientTransaction, ...prev];
        localStorage.setItem('clientTransactions_cache', JSON.stringify(newList));
        localStorage.setItem('clientTransactions_timestamp', String(Date.now()));
        return newList;
      });
      
      if (tObj.type === 'Payment' || tObj.type === 'Advance') {
        await addExpense({
          amount: tObj.amount,
          category: 'Other',
          description: `CRM: ${tObj.type}${tObj.notes ? ' - ' + tObj.notes : ''}`,
          date: tObj.date,
          clientId: tObj.clientId,
          type: 'CRM'
        });
      }
    } catch (error) {
      console.error("Failed to add client transaction: ", error);
      throw error;
    }
  };

  const addRecurringTransaction = async (rObj: Omit<RecurringTransactionSchedule, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) return;
    try {
      const newRecRef = doc(collection(db, `users/${user.uid}/recurringTransactions`));
      const recData = {
        ...rObj,
        id: newRecRef.id,
        userId: user.uid,
        createdAt: Date.now()
      };
      await setDoc(newRecRef, recData);
      setRecurringTransactions(prev => {
        const newList = [recData as RecurringTransactionSchedule, ...prev];
        localStorage.setItem('recurringTransactions_cache', JSON.stringify(newList));
        localStorage.setItem('recurringTransactions_timestamp', String(Date.now()));
        return newList;
      });
    } catch (error) {
      console.error("Failed to add recurring transaction: ", error);
      throw error;
    }
  };

  const syncCrmTransactionsToExpenses = async () => {
    if (!user) return;
    try {
      // Find existing CRM expenses to avoid duplicates
      const existingCrmExpenses = expenses.filter(e => e.type === 'CRM');
      
      const newExpenses: Omit<Expense, 'id' | 'createdAt' | 'userId'>[] = [];
      
      for (const tx of clientTransactions) {
        if (tx.type === 'Payment' || tx.type === 'Advance') {
          const isAlreadyAdded = existingCrmExpenses.some(e => e.clientId === tx.clientId && e.amount === tx.amount && e.date === tx.date && e.description.includes(tx.type));
          
          if (!isAlreadyAdded) {
            newExpenses.push({
              amount: tx.amount,
              category: 'Other',
              description: `CRM: ${tx.type}${tx.notes ? ' - ' + tx.notes : ''}`,
              date: tx.date,
              clientId: tx.clientId,
              type: 'CRM'
            });
          }
        }
      }
      
      for (const exp of newExpenses) {
        await addExpense(exp);
      }
    } catch (error) {
      console.error("Failed to sync CRM transactions: ", error);
      throw error;
    }
  };

  return (
    <AppContext.Provider value={{ materials, transactions, expenses, clients, clientTransactions, recurringTransactions, addTransaction, deleteTransaction, addClientTransaction, addRecurringTransaction, syncCrmTransactionsToExpenses, updateMaterialPrice, addMaterial, updateMaterial, deleteMaterial, addExpense, updateExpense, deleteExpense, addClient, updateClient, deleteClient, loading }}>
        {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
