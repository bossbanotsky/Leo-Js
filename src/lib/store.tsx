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
      setLoading(false);
      return;
    }

    setLoading(true);

    const materialsRef = collection(db, `users/${user.uid}/materials`);
    const transactionsRef = collection(db, `users/${user.uid}/transactions`);
    const expensesRef = collection(db, `users/${user.uid}/expenses`);
    const clientsRef = collection(db, `users/${user.uid}/clients`);
    const clientTransactionsRef = collection(db, `users/${user.uid}/clientTransactions`);
    const recurringTransactionsRef = collection(db, `users/${user.uid}/recurringTransactions`);

    const qMaterials = query(materialsRef, orderBy('createdAt', 'desc'));
    const qTransactions = query(transactionsRef, orderBy('createdAt', 'desc'));
    const qExpenses = query(expensesRef, orderBy('date', 'desc'));
    const qClients = query(clientsRef, orderBy('createdAt', 'desc'));
    const qClientTransactions = query(clientTransactionsRef, orderBy('createdAt', 'desc'));
    const qRecurringTransactions = query(recurringTransactionsRef, orderBy('createdAt', 'desc'));

    const fetchMaterials = async () => {
      const cached = localStorage.getItem('materials_cache');
      const timestamp = localStorage.getItem('materials_timestamp');
      
      if (cached && timestamp && (Date.now() - Number(timestamp) < 24 * 60 * 60 * 1000)) {
        setMaterials(JSON.parse(cached));
        return;
      }

      try {
        const querySnapshot = await getDocs(qMaterials);
        const mats: Material[] = [];
        querySnapshot.forEach(doc => mats.push({ id: doc.id, ...doc.data() } as Material));
        setMaterials(mats);
        localStorage.setItem('materials_cache', JSON.stringify(mats));
        localStorage.setItem('materials_timestamp', String(Date.now()));
      } catch (error) {
        console.error("Error fetching materials: ", error);
      }
    };
    
    fetchMaterials();

    const unsubscribeTransactions = onSnapshot(qTransactions, (snapshot) => {
      const txs: Transaction[] = [];
      snapshot.forEach(doc => txs.push({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(txs);
    }, (error) => {
      console.error("Error fetching transactions: ", error);
    });

    const unsubscribeExpenses = onSnapshot(qExpenses, (snapshot) => {
      const exps: Expense[] = [];
      snapshot.forEach(doc => exps.push({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(exps);
    }, (error) => {
      console.error("Error fetching expenses: ", error);
    });

    const unsubscribeClients = onSnapshot(qClients, (snapshot) => {
      const cls: Client[] = [];
      snapshot.forEach(doc => cls.push({ id: doc.id, ...doc.data() } as Client));
      setClients(cls);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching clients: ", error);
      setLoading(false);
    });

    const unsubscribeClientTransactions = onSnapshot(qClientTransactions, (snapshot) => {
      const txs: ClientTransaction[] = [];
      snapshot.forEach(doc => txs.push({ id: doc.id, ...doc.data() } as ClientTransaction));
      setClientTransactions(txs);
    }, (error) => {
      console.error("Error fetching client transactions: ", error);
    });

    const unsubscribeRecurring = onSnapshot(qRecurringTransactions, (snapshot) => {
      const recs: RecurringTransactionSchedule[] = [];
      snapshot.forEach(doc => recs.push({ id: doc.id, ...doc.data() } as RecurringTransactionSchedule));
      setRecurringTransactions(recs);
    }, (error) => {
      console.error("Error fetching recurring transactions: ", error);
    });

    return () => {
      unsubscribeTransactions();
      unsubscribeExpenses();
      unsubscribeClients();
      unsubscribeClientTransactions();
      unsubscribeRecurring();
    };
  }, [user]);

  const addTransaction = async (tObj: Omit<Transaction, 'id' | 'date' | 'totalAmount' | 'createdAt' | 'userId'>) => {
    if (!user) return;
    
    const newTxId = doc(collection(db, `users/${user.uid}/transactions`)).id;
    const materialRef = doc(db, `users/${user.uid}/materials`, tObj.materialId);
    const txRef = doc(db, `users/${user.uid}/transactions`, newTxId);

    const totalAmount = (tObj.quantity * tObj.pricePerUnit) - (tObj.discount || 0);

    try {
      await runTransaction(db, async (transaction) => {
        const matDoc = await transaction.get(materialRef);
        if (!matDoc.exists()) throw new Error("Material does not exist!");

        const currentStock = matDoc.data().currentStock || 0;
        const stockChange = tObj.type === 'buy' ? tObj.quantity : -tObj.quantity;
        const newStock = Math.max(0, currentStock + stockChange);

        transaction.update(materialRef, { currentStock: newStock, updatedAt: Date.now() });

        const txData = {
          ...tObj,
          userId: user.uid,
          totalAmount,
          date: new Date().toISOString(),
          createdAt: Date.now()
        };

        transaction.set(txRef, txData);
      });
    } catch (error) {
      console.error("Transaction failed: ", error);
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
      await setDoc(newExpRef, {
        ...eObj,
        userId: user.uid,
        createdAt: Date.now()
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
    } catch (error) {
      console.error("Failed to delete expense: ", error);
    }
  };

  const updateExpense = async (id: string, updates: Partial<Omit<Expense, 'id' | 'createdAt' | 'userId'>>) => {
    if (!user) return;
    try {
      const expRef = doc(db, `users/${user.uid}/expenses`, id);
      await updateDoc(expRef, updates);
    } catch (error) {
      console.error("Failed to update expense: ", error);
      throw error;
    }
  };

  const addClient = async (cObj: Omit<Client, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) return;
    try {
      const newClientRef = doc(collection(db, `users/${user.uid}/clients`));
      await setDoc(newClientRef, {
        ...cObj,
        userId: user.uid,
        createdAt: Date.now()
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
    } catch (error) {
      console.error("Failed to delete client: ", error);
      throw error;
    }
  };

  const addClientTransaction = async (tObj: Omit<ClientTransaction, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) return;
    try {
      const newTxRef = doc(collection(db, `users/${user.uid}/clientTransactions`));
      await setDoc(newTxRef, {
        ...tObj,
        userId: user.uid,
        createdAt: Date.now()
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
      await setDoc(newRecRef, {
        ...rObj,
        userId: user.uid,
        createdAt: Date.now()
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
    <AppContext.Provider value={{ materials, transactions, expenses, clients, clientTransactions, recurringTransactions, addTransaction, addClientTransaction, addRecurringTransaction, syncCrmTransactionsToExpenses, updateMaterialPrice, addMaterial, updateMaterial, deleteMaterial, addExpense, updateExpense, deleteExpense, addClient, updateClient, deleteClient, loading }}>
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
