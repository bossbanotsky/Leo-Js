export type MaterialType = 'Metal' | 'Plastic' | 'Paper' | 'Glass' | 'Electronics' | 'Other';
export type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer' | 'Other';

export interface Material {
  id: string;
  userId: string;
  name: string;
  type: MaterialType;
  buyPrice: number; // Price per kg or unit
  sellPrice: number;
  currentStock: number; // in kg or units
  unit: string;
  conversionRate?: number; // Rate to convert to other unit
  createdAt: number;
  updatedAt: number;
}

export interface Transaction {
  id: string;
  userId: string;
  date: string; // ISO string
  type: 'buy' | 'sell';
  materialId: string;
  quantity: number;
  pricePerUnit: number;
  discount?: number;
  paymentMethod?: PaymentMethod;
  totalAmount: number;
  clientName: string; // Seller or Buyer name
  clientId?: string; // Optional reference to CRM client
  notes?: string;
  createdAt: number;
}

export type ExpenseCategory = 'Fuel/Transport' | 'Salary' | 'Maintenance' | 'Utilities' | 'Meals' | 'Logistics' | 'Other';

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: string; // ISO string
  dueDate?: string; // ISO string
  createdAt: number;
  quantity?: number;
  unitPrice?: number;
  clientId?: string;
  type?: 'Operational' | 'CRM';
}

export type ViewState = 'dashboard' | 'transactions' | 'inventory' | 'pricing' | 'expenses' | 'crm';

export interface Client {
  id: string;
  userId: string;
  name: string;
  type: 'Supplier' | 'Buyer' | 'Both';
  status: 'Active' | 'Inactive' | 'Lead';
  phone?: string;
  address?: string;
  paymentMethod?: PaymentMethod;
  paymentTerms?: string;
  bankName?: string;
  bankAccountNumber?: string;
  notes?: string;
  createdAt: number;
}

export interface ClientTransaction {
  id: string;
  userId: string;
  clientId: string;
  type: 'Payment' | 'Advance' | 'Adjustment';
  amount: number;
  date: string; // ISO string
  notes?: string;
  createdAt: number;
}

export interface RecurringTransactionSchedule {
  id: string;
  userId: string;
  clientId: string;
  type: 'Payment' | 'Advance';
  amount: number;
  frequency: 'Weekly' | 'Monthly';
  nextDueDate: string; // ISO string
  createdAt: number;
}
