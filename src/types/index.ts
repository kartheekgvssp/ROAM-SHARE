export type ExpenseCategory =
  | 'Food'
  | 'Transport'
  | 'Lodging'
  | 'Activities'
  | 'Shopping'
  | 'Misc';

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  paidBy: string; // Participant name e.g. "User A"
  date: string; // YYYY-MM-DD
  splitWith: string[]; // List of participant names sharing this expense
  notes?: string;
  syncedToSheet?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SettlementTransaction {
  from: string; // Debtor e.g. "User B"
  to: string; // Creditor e.g. "User A"
  amount: number;
  settled?: boolean;
}

export interface ParticipantSummary {
  name: string;
  totalPaid: number;
  fairShare: number;
  netBalance: number; // positive = owed money, negative = owes money
}

export interface TripSettlement {
  totalSpent: number;
  perPersonShare: number;
  participants: ParticipantSummary[];
  transactions: SettlementTransaction[];
  calculatedAt: string;
}

export interface Trip {
  id: string;
  code?: string; // 6-digit alphanumeric code e.g. "7K9M2P"
  destination: string;
  startDate: string;
  endDate: string;
  budget?: number;
  currency: string;
  status: 'active' | 'ended';
  createdBy: string;
  participants: string[];
  sheetId?: string;
  sheetUrl?: string;
  lastSyncedAt?: string;
  settlement?: TripSettlement;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  name: string;
  email?: string;
  photoURL?: string;
  uid?: string;
  isGoogleUser?: boolean;
}
