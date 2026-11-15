import {
  AppDataPayload,
  BudgetLimit,
  DraftNote,
  FinancialGoal,
  TaskItem,
  Transaction,
} from '../types';

export const CURRENT_DATA_VERSION = 3;
export const DEFAULT_WIDGETS = [
  'overview',
  'schedule',
  'tasks',
  'finance',
  'scratchpad',
  'reminders',
];

// Assinaturas exatas dos antigos registros de exemplo para remoção segura apenas se não editados
const LEGACY_SEED_TASK_TITLES: Record<string, string> = {
  't-1': 'Revisar orçamento mensal e contas a pagar',
  't-2': 'Planejar metas da semana e prioridades',
  't-3': 'Prática de exercícios físicos (45 min)',
  't-4': 'Leitura de 20 páginas de livro',
};

const LEGACY_SEED_TRANSACTIONS: Record<string, { title: string; amount: number }> = {
  'tx-1': { title: 'Salário Mensal', amount: 5800 },
  'tx-2': { title: 'Projeto Freelance', amount: 1450 },
  'tx-3': { title: 'Aluguel & Condomínio', amount: 1850 },
  'tx-4': { title: 'Supermercado do Mês', amount: 780.45 },
  'tx-5': { title: 'Combustível / Transporte', amount: 220 },
  'tx-6': { title: 'Academia & Saúde', amount: 190 },
};

const LEGACY_SEED_GOALS: Record<
  string,
  { title: string; targetAmount: number; currentAmount: number }
> = {
  'g-1': { title: 'Reserva de Emergência (6 meses)', targetAmount: 25000, currentAmount: 18500 },
  'g-2': { title: 'Viagem de Férias', targetAmount: 6000, currentAmount: 3400 },
  'g-3': { title: 'Troca de Computador / Setup', targetAmount: 7500, currentAmount: 4200 },
};

const LEGACY_SEED_DRAFTS: Record<string, string> = {
  'draft-1': 'Ideias de Projetos & Objetivos',
  'draft-2': 'Rascunho Rápido / Notas Diárias',
};

const LEGACY_SEED_BUDGETS: Record<string, number> = {
  moradia: 2000,
  alimentacao: 1200,
  transporte: 450,
  lazer: 600,
  saude: 400,
};

export function sanitizeLegacyPayload(parsed: unknown): Partial<AppDataPayload> {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  const record = parsed as Record<string, unknown>;
  const isLegacyVersion =
    typeof record.version !== 'number' || record.version < CURRENT_DATA_VERSION;

  const rawTasks: TaskItem[] = Array.isArray(record.tasks) ? (record.tasks as TaskItem[]) : [];
  const rawTxs: Transaction[] = Array.isArray(record.transactions)
    ? (record.transactions as Transaction[])
    : [];
  const rawGoals: FinancialGoal[] = Array.isArray(record.financialGoals)
    ? (record.financialGoals as FinancialGoal[])
    : [];
  const rawBudgets: BudgetLimit[] = Array.isArray(record.budgetLimits)
    ? (record.budgetLimits as BudgetLimit[])
    : [];
  const rawDrafts: DraftNote[] = Array.isArray(record.draftNotes)
    ? (record.draftNotes as DraftNote[])
    : [];
  const dashboardWidgets = Array.isArray(record.dashboardWidgets)
    ? (record.dashboardWidgets as string[])
    : DEFAULT_WIDGETS;
  const pendingBankNotifications = Array.isArray(record.pendingBankNotifications)
    ? (record.pendingBankNotifications as AppDataPayload['pendingBankNotifications'])
    : [];

  if (!isLegacyVersion) {
    return {
      userName: typeof record.userName === 'string' ? record.userName : '',
      onboardingCompleted: Boolean(record.onboardingCompleted),
      tasks: rawTasks,
      transactions: rawTxs,
      financialGoals: rawGoals,
      budgetLimits: rawBudgets,
      draftNotes: rawDrafts,
      dashboardWidgets,
      pendingBankNotifications,
    };
  }

  const tasks = rawTasks.filter((t) => LEGACY_SEED_TASK_TITLES[t.id] !== t.title);
  const transactions = rawTxs.filter((tx) => {
    const seed = LEGACY_SEED_TRANSACTIONS[tx.id];
    return !(seed && seed.title === tx.title && seed.amount === tx.amount);
  });
  const financialGoals = rawGoals.filter((g) => {
    const seed = LEGACY_SEED_GOALS[g.id];
    return !(
      seed &&
      seed.title === g.title &&
      seed.targetAmount === g.targetAmount &&
      seed.currentAmount === g.currentAmount
    );
  });
  const budgetLimits = rawBudgets.filter(
    (b) => LEGACY_SEED_BUDGETS[b.category] !== b.monthlyLimit
  );
  const draftNotes = rawDrafts.filter((d) => LEGACY_SEED_DRAFTS[d.id] !== d.title);

  return {
    userName: typeof record.userName === 'string' ? record.userName : '',
    onboardingCompleted: Boolean(record.onboardingCompleted),
    tasks,
    transactions,
    financialGoals,
    budgetLimits,
    draftNotes,
    dashboardWidgets,
    pendingBankNotifications,
  };
}
