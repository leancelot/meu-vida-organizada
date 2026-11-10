export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  priority: 'high' | 'medium' | 'low';
  category: 'trabalho' | 'pessoal' | 'saude' | 'estudos' | 'financas' | 'outros';
  completed: boolean;
  completedAt?: string;
  subtasks: { id: string; title: string; completed: boolean }[];
  googleCalendarEventId?: string;
  reminderMinutesBefore?: number; // e.g. 15, 30, 60 or 0
}

export type TransactionType = 'receita' | 'despesa';

export type FinanceCategory =
  | 'salario'
  | 'investimentos'
  | 'freelance'
  | 'moradia'
  | 'alimentacao'
  | 'transporte'
  | 'saude'
  | 'educacao'
  | 'lazer'
  | 'outros';

export interface Transaction {
  id: string;
  type: TransactionType;
  title: string;
  amount: number;
  category: FinanceCategory;
  date: string; // YYYY-MM-DD
  paymentMethod?: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'transferencia';
  notes?: string;
  recurring?: boolean;
}

export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
  color?: string;
}

export interface BudgetLimit {
  category: FinanceCategory;
  monthlyLimit: number;
}

export interface DraftNote {
  id: string;
  title: string;
  content: string;
  color?: string;
  updatedAt: string;
  isPinned?: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'task_deadline' | 'calendar_event' | 'reminder';
  read: boolean;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
  status?: string;
}

export interface DriveSyncInfo {
  fileId: string | null;
  lastSyncedAt: string | null;
  remoteModifiedAt: string | null;
  status: 'idle' | 'syncing' | 'synced' | 'error' | 'cloud_newer';
  errorMessage?: string;
}

export interface AppDataPayload {
  version: number;
  lastUpdated: string;
  tasks: TaskItem[];
  transactions: Transaction[];
  financialGoals: FinancialGoal[];
  budgetLimits: BudgetLimit[];
  draftNotes: DraftNote[];
  dashboardWidgets?: string[];
  habits?: any[]; // Kept for backwards compatibility with existing backups
}
