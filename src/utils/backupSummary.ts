import {
  AppDataPayload,
  DraftNote,
  FinancialGoal,
  PendingBankNotification,
  TaskItem,
  Transaction,
} from '../types';

export interface BackupCountsSummary {
  tasksCount: number;
  transactionsCount: number;
  goalsCount: number;
  notesCount: number;
  pendingBankCount: number;
  totalItems: number;
  lastUpdated: string | null;
  userName: string;
}

export function summarizePayloadCounts(payload: Partial<AppDataPayload>): BackupCountsSummary {
  const tasksCount = Array.isArray(payload.tasks) ? payload.tasks.length : 0;
  const transactionsCount = Array.isArray(payload.transactions) ? payload.transactions.length : 0;
  const goalsCount = Array.isArray(payload.financialGoals) ? payload.financialGoals.length : 0;
  const notesCount = Array.isArray(payload.draftNotes) ? payload.draftNotes.length : 0;
  const pendingBankCount = Array.isArray(payload.pendingBankNotifications)
    ? payload.pendingBankNotifications.length
    : 0;

  return {
    tasksCount,
    transactionsCount,
    goalsCount,
    notesCount,
    pendingBankCount,
    totalItems: tasksCount + transactionsCount + goalsCount + notesCount + pendingBankCount,
    lastUpdated: typeof payload.lastUpdated === 'string' ? payload.lastUpdated : null,
    userName: typeof payload.userName === 'string' ? payload.userName.trim() : '',
  };
}

export function hasMeaningfulLocalData(state: {
  tasks: TaskItem[];
  transactions: Transaction[];
  financialGoals: FinancialGoal[];
  draftNotes: DraftNote[];
  pendingBankNotifications?: PendingBankNotification[];
}): boolean {
  return (
    state.tasks.length > 0 ||
    state.transactions.length > 0 ||
    state.financialGoals.length > 0 ||
    state.draftNotes.length > 0 ||
    (state.pendingBankNotifications?.length ?? 0) > 0
  );
}
