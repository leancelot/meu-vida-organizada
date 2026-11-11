import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  TaskItem,
  Transaction,
  FinancialGoal,
  BudgetLimit,
  DraftNote,
  AppNotification,
  DriveSyncInfo,
  AppDataPayload,
  GoogleCalendarEvent,
} from '../types';
import {
  initAuth,
  googleSignIn,
  logout as fbLogout,
  getAccessToken,
} from '../services/firebase';
import {
  findDriveBackupFile,
  readDriveFile,
  saveToDrive,
  DriveFileInfo,
} from '../services/driveService';
import {
  listCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent as apiDeleteCalendarEvent,
} from '../services/calendarService';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendWebNotification,
} from '../services/notificationService';
import confetti from 'canvas-confetti';

const STORAGE_KEY_DATA = 'vidaorganizada_local_data_v2';
const STORAGE_KEY_SYNC = 'vidaorganizada_sync_info_v2';
const STORAGE_KEY_NOTIFS = 'vidaorganizada_notifications_v2';
const STORAGE_KEY_THEME = 'vidaorganizada_theme_v1';

// Default initial tasks
const INITIAL_TASKS: TaskItem[] = [
  {
    id: 't-1',
    title: 'Revisar orçamento mensal e contas a pagar',
    description: 'Verificar faturas do cartão e investimentos do mês',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '09:00',
    priority: 'high',
    category: 'financas',
    completed: true,
    completedAt: new Date().toISOString(),
    subtasks: [
      { id: 'st-1', title: 'Checar extrato bancário', completed: true },
      { id: 'st-2', title: 'Atualizar planilha de gastos', completed: true },
    ],
  },
  {
    id: 't-2',
    title: 'Planejar metas da semana e prioridades',
    description: 'Definir os 3 objetivos principais de trabalho e finanças',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '11:00',
    priority: 'medium',
    category: 'pessoal',
    completed: false,
    subtasks: [
      { id: 'st-3', title: 'Bloquear horários na agenda', completed: false },
      { id: 'st-4', title: 'Organizar mesa de trabalho', completed: false },
    ],
  },
  {
    id: 't-3',
    title: 'Prática de exercícios físicos (45 min)',
    description: 'Treino de corrida ou musculação',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '18:30',
    priority: 'high',
    category: 'saude',
    completed: false,
    subtasks: [
      { id: 'st-5', title: 'Alongamento pós-treino', completed: false },
      { id: 'st-6', title: 'Hidratação (500ml)', completed: false },
    ],
  },
  {
    id: 't-4',
    title: 'Leitura de 20 páginas de livro',
    description: 'Foco e anotações dos principais aprendizados',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    dueTime: '21:00',
    priority: 'low',
    category: 'estudos',
    completed: false,
    subtasks: [],
  },
];

// Default initial transactions
const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    type: 'receita',
    title: 'Salário Mensal',
    amount: 5800.0,
    category: 'salario',
    date: new Date(new Date().getFullYear(), new Date().getMonth(), 5).toISOString().split('T')[0],
    paymentMethod: 'pix',
    notes: 'Depósito em conta corrente',
    recurring: true,
  },
  {
    id: 'tx-2',
    type: 'receita',
    title: 'Projeto Freelance',
    amount: 1450.0,
    category: 'freelance',
    date: new Date(new Date().getFullYear(), new Date().getMonth(), 8).toISOString().split('T')[0],
    paymentMethod: 'pix',
  },
  {
    id: 'tx-3',
    type: 'despesa',
    title: 'Aluguel & Condomínio',
    amount: 1850.0,
    category: 'moradia',
    date: new Date(new Date().getFullYear(), new Date().getMonth(), 10).toISOString().split('T')[0],
    paymentMethod: 'transferencia',
    recurring: true,
  },
  {
    id: 'tx-4',
    type: 'despesa',
    title: 'Supermercado do Mês',
    amount: 780.45,
    category: 'alimentacao',
    date: new Date(new Date().getFullYear(), new Date().getMonth(), 7).toISOString().split('T')[0],
    paymentMethod: 'cartao_credito',
  },
  {
    id: 'tx-5',
    type: 'despesa',
    title: 'Combustível / Transporte',
    amount: 220.0,
    category: 'transporte',
    date: new Date(new Date().getFullYear(), new Date().getMonth(), 9).toISOString().split('T')[0],
    paymentMethod: 'cartao_debito',
  },
  {
    id: 'tx-6',
    type: 'despesa',
    title: 'Academia & Saúde',
    amount: 190.0,
    category: 'saude',
    date: new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().split('T')[0],
    paymentMethod: 'cartao_credito',
    recurring: true,
  },
];

// Default initial financial goals
const INITIAL_GOALS: FinancialGoal[] = [
  {
    id: 'g-1',
    title: 'Reserva de Emergência (6 meses)',
    targetAmount: 25000,
    currentAmount: 18500,
    targetDate: '2027-06-30',
    category: 'investimentos',
    color: '#10b981',
  },
  {
    id: 'g-2',
    title: 'Viagem de Férias',
    targetAmount: 6000,
    currentAmount: 3400,
    targetDate: '2027-01-15',
    category: 'lazer',
    color: '#6366f1',
  },
  {
    id: 'g-3',
    title: 'Troca de Computador / Setup',
    targetAmount: 7500,
    currentAmount: 4200,
    targetDate: '2027-04-10',
    category: 'estudos',
    color: '#f59e0b',
  },
];

// Default budget limits
const INITIAL_BUDGETS: BudgetLimit[] = [
  { category: 'moradia', monthlyLimit: 2000 },
  { category: 'alimentacao', monthlyLimit: 1200 },
  { category: 'transporte', monthlyLimit: 450 },
  { category: 'lazer', monthlyLimit: 600 },
  { category: 'saude', monthlyLimit: 400 },
];

// Default initial draft notes
const INITIAL_DRAFTS: DraftNote[] = [
  {
    id: 'draft-1',
    title: 'Ideias de Projetos & Objetivos',
    content: '• Organizar rotina matinal com 15 minutos de planejamento\n• Revisar investimentos e metas todo início de mês\n• Testar novo formato de trabalho focado',
    color: '#fef08a', // amarelo suave
    updatedAt: new Date().toISOString(),
    isPinned: true,
  },
  {
    id: 'draft-2',
    title: 'Rascunho Rápido / Notas Diárias',
    content: 'Ligar para confirmar agendamento\nComprar material de escritório\nVerificar cotação do seguro',
    color: '#bbf7d0', // verde menta
    updatedAt: new Date().toISOString(),
    isPinned: false,
  },
];

const DEFAULT_WIDGETS = ['overview', 'schedule', 'tasks', 'finance', 'scratchpad', 'reminders'];

interface UndoToastInfo {
  id: string;
  message: string;
  onUndo: () => void;
}

interface AppContextType {
  // Theme state
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Auth state
  user: User | null;
  accessToken: string | null;
  isAuthenticating: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  // Data
  tasks: TaskItem[];
  transactions: Transaction[];
  financialGoals: FinancialGoal[];
  budgetLimits: BudgetLimit[];
  draftNotes: DraftNote[];
  dashboardWidgets: string[];
  calendarEvents: GoogleCalendarEvent[];
  isLoadingCalendar: boolean;

  // Task actions
  addTask: (task: Omit<TaskItem, 'id'>) => void;
  updateTask: (id: string, updates: Partial<TaskItem>) => void;
  toggleTaskCompletion: (id: string) => void;
  deleteTask: (id: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;

  // Finance actions
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  addGoal: (goal: Omit<FinancialGoal, 'id'>) => void;
  updateGoal: (id: string, updates: Partial<FinancialGoal>) => void;
  deleteGoal: (id: string) => void;
  updateBudgetLimit: (category: Transaction['category'], limit: number) => void;

  // Draft / Rascunhos actions
  addDraftNote: (note: Omit<DraftNote, 'id' | 'updatedAt'>) => void;
  updateDraftNote: (id: string, updates: Partial<DraftNote>) => void;
  deleteDraftNote: (id: string) => void;
  togglePinDraft: (id: string) => void;

  // Modular Dashboard
  toggleDashboardWidget: (widgetId: string) => void;

  // Notifications API (Silencioso)
  notificationPermission: NotificationPermission;
  notificationsList: AppNotification[];
  enableNotifications: () => Promise<boolean>;
  triggerTestNotification: () => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // Calendar actions
  refreshCalendar: () => Promise<void>;
  addEventToGoogleCalendar: (event: {
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
    allDay?: boolean;
    date?: string;
  }) => Promise<GoogleCalendarEvent | null>;
  removeGoogleCalendarEvent: (eventId: string) => Promise<void>;
  scheduleTaskInCalendar: (task: TaskItem, startHour?: string) => Promise<boolean>;

  // Cloud Drive Sync
  driveSyncInfo: DriveSyncInfo;
  syncToDriveNow: () => Promise<void>;
  restoreFromDriveNow: () => Promise<void>;
  exportBackupJson: () => void;
  importBackupJson: (content: string) => boolean;

  // Undo Toast state & handler
  undoToast: UndoToastInfo | null;
  clearUndoToast: () => void;

  // Modals / global confirmation helper
  confirmDestructiveAction: (config: {
    title: string;
    message: string;
    details?: string[];
    confirmText?: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void> | void;
  }) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) {
      // ignore
    }
    return 'dark'; // default to modern dark theme
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch (e) {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Auth
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // App core state
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DATA);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tasks) return parsed.tasks;
      }
    } catch (e) {
      console.warn('Erro ao ler tasks locais:', e);
    }
    return INITIAL_TASKS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DATA);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.transactions) return parsed.transactions;
      }
    } catch (e) {
      console.warn('Erro ao ler transações locais:', e);
    }
    return INITIAL_TRANSACTIONS;
  });

  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DATA);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.financialGoals) return parsed.financialGoals;
      }
    } catch (e) {
      console.warn('Erro ao ler metas locais:', e);
    }
    return INITIAL_GOALS;
  });

  const [budgetLimits, setBudgetLimits] = useState<BudgetLimit[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DATA);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.budgetLimits) return parsed.budgetLimits;
      }
    } catch (e) {
      console.warn('Erro ao ler limites locais:', e);
    }
    return INITIAL_BUDGETS;
  });

  const [draftNotes, setDraftNotes] = useState<DraftNote[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DATA);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.draftNotes) return parsed.draftNotes;
      }
    } catch (e) {
      // ignore
    }
    return INITIAL_DRAFTS;
  });

  const [dashboardWidgets, setDashboardWidgets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DATA);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.dashboardWidgets) return parsed.dashboardWidgets;
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_WIDGETS;
  });

  // Calendar events
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  // Undo Toast state
  const [undoToast, setUndoToast] = useState<UndoToastInfo | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearUndoToast = () => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoToast(null);
  };

  const showUndoToast = (message: string, onUndo: () => void) => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoToast({ id: 'toast-' + Date.now(), message, onUndo });
    undoTimeoutRef.current = setTimeout(() => {
      setUndoToast(null);
    }, 6000);
  };

  // Drive sync state
  const [driveSyncInfo, setDriveSyncInfo] = useState<DriveSyncInfo>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SYNC);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return {
      fileId: null,
      lastSyncedAt: null,
      remoteModifiedAt: null,
      status: 'idle',
    };
  });

  // Web Notifications state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return getNotificationPermission();
  });

  const [notificationsList, setNotificationsList] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTIFS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [];
  });

  const notifiedKeysRef = useRef<Set<string>>(new Set());

  // Global confirmation modal state (strictly required for destructive Workspace operations)
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string[];
    confirmText?: string;
    isDestructive?: boolean;
    isProcessing?: boolean;
    onConfirm?: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  // Save to local storage on changes
  useEffect(() => {
    const payload: AppDataPayload = {
      version: 2,
      lastUpdated: new Date().toISOString(),
      tasks,
      transactions,
      financialGoals,
      budgetLimits,
      draftNotes,
      dashboardWidgets,
    };
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(payload));
    } catch (e) {
      console.error('Falha ao salvar dados no LocalStorage:', e);
    }
  }, [tasks, transactions, financialGoals, budgetLimits, draftNotes, dashboardWidgets]);

  // Persist notifications
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(notificationsList.slice(0, 30)));
    } catch (e) {
      // ignore
    }
  }, [notificationsList]);

  // Persist driveSyncInfo to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SYNC, JSON.stringify(driveSyncInfo));
    } catch (e) {
      // ignore
    }
  }, [driveSyncInfo]);

  // Handle Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch Calendar events when accessToken is available
  const refreshCalendar = useCallback(async () => {
    const token = accessToken || (await getAccessToken());
    if (!token) return;

    setIsLoadingCalendar(true);
    try {
      const events = await listCalendarEvents(token);
      setCalendarEvents(events);
    } catch (err: any) {
      console.error('Erro ao carregar calendário:', err);
    } finally {
      setIsLoadingCalendar(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      refreshCalendar();
    }
  }, [accessToken, refreshCalendar]);

  // Auto-check Drive file when logged in
  const checkDriveStatus = useCallback(async () => {
    const token = accessToken || (await getAccessToken());
    if (!token) return;

    try {
      const file = await findDriveBackupFile(token);
      if (file) {
        setDriveSyncInfo((prev) => {
          const remoteTime = new Date(file.modifiedTime).getTime();
          const localTime = prev.lastSyncedAt ? new Date(prev.lastSyncedAt).getTime() : 0;
          const isCloudNewer = remoteTime > localTime + 2000;

          return {
            ...prev,
            fileId: file.id,
            remoteModifiedAt: file.modifiedTime,
            status: isCloudNewer ? 'cloud_newer' : prev.status === 'cloud_newer' ? 'cloud_newer' : 'synced',
          };
        });
      }
    } catch (err) {
      console.warn('Erro ao verificar status do Google Drive:', err);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      checkDriveStatus();
    }
  }, [accessToken, checkDriveStatus]);

  // Real-time synchronization interval
  useEffect(() => {
    if (!accessToken) return;
    const interval = setInterval(() => {
      checkDriveStatus();
    }, 45000);
    return () => clearInterval(interval);
  }, [accessToken, checkDriveStatus]);

  // Auto-sync debounced after local edits if logged in
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerAutoSync = useCallback(() => {
    if (!accessToken) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        setDriveSyncInfo((prev) => ({ ...prev, status: 'syncing' }));
        const payload: AppDataPayload = {
          version: 2,
          lastUpdated: new Date().toISOString(),
          tasks,
          transactions,
          financialGoals,
          budgetLimits,
          draftNotes,
          dashboardWidgets,
        };

        const result: DriveFileInfo = await saveToDrive(accessToken, payload, driveSyncInfo.fileId);
        setDriveSyncInfo({
          fileId: result.id,
          lastSyncedAt: new Date().toISOString(),
          remoteModifiedAt: result.modifiedTime,
          status: 'synced',
        });
      } catch (err: any) {
        console.error('Erro na sincronização em segundo plano:', err);
        setDriveSyncInfo((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: err.message || 'Falha ao sincronizar',
        }));
      }
    }, 4000);
  }, [accessToken, tasks, transactions, financialGoals, budgetLimits, draftNotes, dashboardWidgets, driveSyncInfo.fileId]);

  // Web Notifications Engine: Silent checks (sem sons)
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentTimeMs = now.getTime();

      // 1. Check tasks due today with specified dueTime
      tasks.forEach((task) => {
        if (task.completed || task.dueDate !== todayStr || !task.dueTime) return;

        const [hours, minutes] = task.dueTime.split(':').map(Number);
        const taskDueMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes).getTime();
        const diffMinutes = (taskDueMs - currentTimeMs) / (1000 * 60);

        if (diffMinutes <= 15 && diffMinutes >= -5) {
          const key = `task-${task.id}-${todayStr}-${task.dueTime}`;
          if (!notifiedKeysRef.current.has(key)) {
            notifiedKeysRef.current.add(key);

            const title = `⏰ Lembrete: ${task.title}`;
            const body =
              diffMinutes <= 1
                ? `Horário de vencimento agora (${task.dueTime})!`
                : `Vence em aproximadamente ${Math.ceil(diffMinutes)} minuto(s) às ${task.dueTime}.`;

            sendWebNotification(title, { body, tag: key });

            const newNotif: AppNotification = {
              id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
              title,
              body,
              timestamp: new Date().toISOString(),
              type: 'task_deadline',
              read: false,
            };
            setNotificationsList((prev) => [newNotif, ...prev.slice(0, 29)]);
          }
        }
      });

      // 2. Check Google Calendar events starting soon
      calendarEvents.forEach((event) => {
        if (!event.start?.dateTime) return;

        const eventStartMs = new Date(event.start.dateTime).getTime();
        const diffMinutes = (eventStartMs - currentTimeMs) / (1000 * 60);

        if (diffMinutes <= 15 && diffMinutes >= -2) {
          const key = `event-${event.id}-${event.start.dateTime}`;
          if (!notifiedKeysRef.current.has(key)) {
            notifiedKeysRef.current.add(key);

            const startTimeFormatted = new Date(event.start.dateTime).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            });

            const title = `📅 Google Agenda: ${event.summary || 'Compromisso'}`;
            const body =
              diffMinutes <= 1
                ? `Iniciando agora (${startTimeFormatted})!${event.location ? ` • ${event.location}` : ''}`
                : `Inicia em ${Math.ceil(diffMinutes)} minuto(s) às ${startTimeFormatted}.${event.location ? ` Local: ${event.location}` : ''}`;

            sendWebNotification(title, { body, tag: key });

            const newNotif: AppNotification = {
              id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
              title,
              body,
              timestamp: new Date().toISOString(),
              type: 'calendar_event',
              read: false,
            };
            setNotificationsList((prev) => [newNotif, ...prev.slice(0, 29)]);
          }
        }
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [tasks, calendarEvents]);

  // Request browser notification permission
  const enableNotifications = async (): Promise<boolean> => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      sendWebNotification('🔔 Notificações Ativadas!', {
        body: 'Você agora receberá alertas visuais sobre prazos e compromissos.',
      });
      return true;
    }
    return false;
  };

  const triggerTestNotification = () => {
    sendWebNotification('🔔 Notificação de Teste', {
      body: 'Seu sistema de notificações visuais está funcionando perfeitamente!',
    });
    const newNotif: AppNotification = {
      id: 'notif-test-' + Date.now(),
      title: '🔔 Teste de Notificação',
      body: 'Alerta visual emitido com sucesso.',
      timestamp: new Date().toISOString(),
      type: 'reminder',
      read: false,
    };
    setNotificationsList((prev) => [newNotif, ...prev]);
  };

  const dismissNotification = (id: string) => {
    setNotificationsList((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotificationsList([]);
  };

  // Manual save to Google Drive
  const syncToDriveNow = async () => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      await signInWithGoogle();
      return;
    }

    setDriveSyncInfo((prev) => ({ ...prev, status: 'syncing', errorMessage: undefined }));
    try {
      const payload: AppDataPayload = {
        version: 2,
        lastUpdated: new Date().toISOString(),
        tasks,
        transactions,
        financialGoals,
        budgetLimits,
        draftNotes,
        dashboardWidgets,
      };

      const result = await saveToDrive(token, payload, driveSyncInfo.fileId);
      setDriveSyncInfo({
        fileId: result.id,
        lastSyncedAt: new Date().toISOString(),
        remoteModifiedAt: result.modifiedTime,
        status: 'synced',
      });
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
    } catch (err: any) {
      console.error('Erro ao salvar no Drive:', err);
      setDriveSyncInfo((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err.message || 'Falha ao sincronizar',
      }));
      throw err;
    }
  };

  // Restore data from Google Drive
  const restoreFromDriveNow = async () => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      await signInWithGoogle();
      return;
    }

    setDriveSyncInfo((prev) => ({ ...prev, status: 'syncing' }));
    try {
      let fileId = driveSyncInfo.fileId;
      if (!fileId) {
        const file = await findDriveBackupFile(token);
        if (!file) {
          throw new Error('Nenhum backup do VidaOrganizada foi encontrado no seu Google Drive.');
        }
        fileId = file.id;
      }

      const remoteData = await readDriveFile(token, fileId);
      if (remoteData) {
        if (remoteData.tasks) setTasks(remoteData.tasks);
        if (remoteData.transactions) setTransactions(remoteData.transactions);
        if (remoteData.financialGoals) setFinancialGoals(remoteData.financialGoals);
        if (remoteData.budgetLimits) setBudgetLimits(remoteData.budgetLimits);
        if (remoteData.draftNotes) setDraftNotes(remoteData.draftNotes);
        if (remoteData.dashboardWidgets) setDashboardWidgets(remoteData.dashboardWidgets);

        setDriveSyncInfo({
          fileId,
          lastSyncedAt: new Date().toISOString(),
          remoteModifiedAt: remoteData.lastUpdated || new Date().toISOString(),
          status: 'synced',
        });
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
      }
    } catch (err: any) {
      console.error('Erro ao restaurar do Drive:', err);
      setDriveSyncInfo((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err.message || 'Falha ao carregar do Google Drive',
      }));
      throw err;
    }
  };

  // Google Sign-in flow
  const signInWithGoogle = async () => {
    setIsAuthenticating(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        try {
          const driveFile = await findDriveBackupFile(result.accessToken);
          if (driveFile) {
            setDriveSyncInfo((prev) => ({
              ...prev,
              fileId: driveFile.id,
              remoteModifiedAt: driveFile.modifiedTime,
              status: 'cloud_newer',
            }));
          }
        } catch (e) {
          console.warn('Aviso ao consultar Drive pós login:', e);
        }
        try {
          const events = await listCalendarEvents(result.accessToken);
          setCalendarEvents(events);
        } catch (e) {
          console.warn('Aviso ao consultar agenda pós login:', e);
        }
      }
    } catch (err: any) {
      console.warn('Aviso de login:', err);
      const userMessage =
        err?.message?.includes('popup') || err?.code === 'auth/popup-blocked'
          ? 'O navegador bloqueou a janela de login. Por favor, permita pop-ups para conectar com o Google.'
          : 'Não foi possível completar o login com o Google no momento. O app continuará funcionando normalmente no modo local.';

      const newNotif: AppNotification = {
        id: 'notif-auth-' + Date.now(),
        title: 'Aviso de Login',
        body: userMessage,
        timestamp: new Date().toISOString(),
        type: 'reminder',
        read: false,
      };
      setNotificationsList((prev) => [newNotif, ...prev]);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signOut = async () => {
    await fbLogout();
    setUser(null);
    setAccessToken(null);
    setCalendarEvents([]);
    setDriveSyncInfo((prev) => ({ ...prev, status: 'idle' }));
  };

  // Task actions with EDITING support & UNDO
  const addTask = (taskData: Omit<TaskItem, 'id'>) => {
    const newTask: TaskItem = {
      ...taskData,
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    };
    setTasks((prev) => [newTask, ...prev]);
    triggerAutoSync();
  };

  const updateTask = (id: string, updates: Partial<TaskItem>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    triggerAutoSync();
  };

  const toggleTaskCompletion = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextCompleted = !t.completed;
          if (nextCompleted) {
            confetti({ particleCount: 25, spread: 50, origin: { y: 0.85 } });
          }
          return {
            ...t,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
          };
        }
        return t;
      })
    );
    triggerAutoSync();
  };

  const deleteTask = (id: string) => {
    const taskToDelete = tasks.find((t) => t.id === id);
    if (!taskToDelete) return;

    setTasks((prev) => prev.filter((t) => t.id !== id));
    triggerAutoSync();

    showUndoToast(`Tarefa "${taskToDelete.title}" excluída.`, () => {
      setTasks((prev) => [taskToDelete, ...prev]);
      triggerAutoSync();
    });
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updatedSubtasks = t.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          );
          return { ...t, subtasks: updatedSubtasks };
        }
        return t;
      })
    );
    triggerAutoSync();
  };

  // Finance actions with UNDO
  const addTransaction = (txData: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...txData,
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    };
    setTransactions((prev) => [newTx, ...prev]);
    triggerAutoSync();
  };

  const deleteTransaction = (id: string) => {
    const txToDelete = transactions.find((tx) => tx.id === id);
    if (!txToDelete) return;

    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    triggerAutoSync();

    showUndoToast(`Transação "${txToDelete.title}" excluída.`, () => {
      setTransactions((prev) => [txToDelete, ...prev]);
      triggerAutoSync();
    });
  };

  const addGoal = (goalData: Omit<FinancialGoal, 'id'>) => {
    const newGoal: FinancialGoal = {
      ...goalData,
      id: 'goal-' + Date.now(),
    };
    setFinancialGoals((prev) => [...prev, newGoal]);
    triggerAutoSync();
  };

  const updateGoal = (id: string, updates: Partial<FinancialGoal>) => {
    setFinancialGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
    triggerAutoSync();
  };

  const deleteGoal = (id: string) => {
    setFinancialGoals((prev) => prev.filter((g) => g.id !== id));
    triggerAutoSync();
  };

  const updateBudgetLimit = (category: Transaction['category'], limit: number) => {
    setBudgetLimits((prev) => {
      const exists = prev.find((b) => b.category === category);
      if (exists) {
        return prev.map((b) => (b.category === category ? { ...b, monthlyLimit: limit } : b));
      } else {
        return [...prev, { category, monthlyLimit: limit }];
      }
    });
    triggerAutoSync();
  };

  // Drafts / Rascunhos actions
  const addDraftNote = (noteData: Omit<DraftNote, 'id' | 'updatedAt'>) => {
    const newNote: DraftNote = {
      ...noteData,
      id: 'draft-' + Date.now(),
      updatedAt: new Date().toISOString(),
    };
    setDraftNotes((prev) => [newNote, ...prev]);
    triggerAutoSync();
  };

  const updateDraftNote = (id: string, updates: Partial<DraftNote>) => {
    setDraftNotes((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d))
    );
    triggerAutoSync();
  };

  const deleteDraftNote = (id: string) => {
    const draftToDelete = draftNotes.find((d) => d.id === id);
    if (!draftToDelete) return;

    setDraftNotes((prev) => prev.filter((d) => d.id !== id));
    triggerAutoSync();

    showUndoToast(`Rascunho "${draftToDelete.title}" excluído.`, () => {
      setDraftNotes((prev) => [draftToDelete, ...prev]);
      triggerAutoSync();
    });
  };

  const togglePinDraft = (id: string) => {
    setDraftNotes((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isPinned: !d.isPinned } : d))
    );
    triggerAutoSync();
  };

  const toggleDashboardWidget = (widgetId: string) => {
    setDashboardWidgets((prev) => {
      const exists = prev.includes(widgetId);
      const next = exists ? prev.filter((w) => w !== widgetId) : [...prev, widgetId];
      return next;
    });
    triggerAutoSync();
  };

  // Google Calendar Integration actions
  const addEventToGoogleCalendar = async (eventData: {
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
    allDay?: boolean;
    date?: string;
  }): Promise<GoogleCalendarEvent | null> => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      await signInWithGoogle();
      return null;
    }

    try {
      const created = await createCalendarEvent(token, eventData);
      setCalendarEvents((prev) => [created, ...prev]);
      confetti({ particleCount: 25, spread: 60 });
      return created;
    } catch (err: any) {
      console.error('Falha ao adicionar evento na Google Agenda:', err);
      throw err;
    }
  };

  const removeGoogleCalendarEvent = async (eventId: string) => {
    const token = accessToken || (await getAccessToken());
    if (!token) return;

    const event = calendarEvents.find((e) => e.id === eventId);
    const summary = event ? event.summary : 'Evento da Google Agenda';

    confirmDestructiveAction({
      title: 'Excluir da Google Agenda?',
      message: `Tem certeza de que deseja remover "${summary}" da sua Google Agenda? Esta ação não pode ser desfeita.`,
      details: [`ID do evento: ${eventId}`],
      confirmText: 'Excluir Evento',
      isDestructive: true,
      onConfirm: async () => {
        await apiDeleteCalendarEvent(token, eventId);
        setCalendarEvents((prev) => prev.filter((e) => e.id !== eventId));
      },
    });
  };

  const scheduleTaskInCalendar = async (task: TaskItem, startHour = '10:00'): Promise<boolean> => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      await signInWithGoogle();
      return false;
    }

    try {
      const startIso = `${task.dueDate}T${task.dueTime || startHour}:00`;
      const startDate = new Date(startIso);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const created = await addEventToGoogleCalendar({
        summary: `[VidaOrganizada] ${task.title}`,
        description: task.description || 'Tarefa agendada via VidaOrganizada',
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
      });

      if (created) {
        updateTask(task.id, { googleCalendarEventId: created.id });
        return true;
      }
    } catch (e) {
      console.error('Falha ao agendar tarefa no Google Calendar:', e);
    }
    return false;
  };

  // Export JSON backup
  const exportBackupJson = () => {
    const payload: AppDataPayload = {
      version: 2,
      lastUpdated: new Date().toISOString(),
      tasks,
      transactions,
      financialGoals,
      budgetLimits,
      draftNotes,
      dashboardWidgets,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VidaOrganizada_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const importBackupJson = (content: string): boolean => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.tasks && Array.isArray(parsed.tasks)) setTasks(parsed.tasks);
      if (parsed.transactions && Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
      if (parsed.financialGoals && Array.isArray(parsed.financialGoals)) setFinancialGoals(parsed.financialGoals);
      if (parsed.budgetLimits && Array.isArray(parsed.budgetLimits)) setBudgetLimits(parsed.budgetLimits);
      if (parsed.draftNotes && Array.isArray(parsed.draftNotes)) setDraftNotes(parsed.draftNotes);
      if (parsed.dashboardWidgets && Array.isArray(parsed.dashboardWidgets)) setDashboardWidgets(parsed.dashboardWidgets);
      triggerAutoSync();
      return true;
    } catch (e) {
      console.error('Erro ao importar JSON:', e);
      return false;
    }
  };

  const confirmDestructiveAction = (config: {
    title: string;
    message: string;
    details?: string[];
    confirmText?: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void> | void;
  }) => {
    setConfirmConfig({
      isOpen: true,
      title: config.title,
      message: config.message,
      details: config.details,
      confirmText: config.confirmText,
      isDestructive: config.isDestructive ?? true,
      isProcessing: false,
      onConfirm: async () => {
        try {
          setConfirmConfig((prev) => ({ ...prev, isProcessing: true }));
          await config.onConfirm();
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, isProcessing: false }));
        } catch (err) {
          console.error('Erro na ação destrutiva:', err);
          setConfirmConfig((prev) => ({ ...prev, isProcessing: false }));
        }
      },
    });
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        user,
        accessToken,
        isAuthenticating,
        signInWithGoogle,
        signOut,
        tasks,
        transactions,
        financialGoals,
        budgetLimits,
        draftNotes,
        dashboardWidgets,
        calendarEvents,
        isLoadingCalendar,
        addTask,
        updateTask,
        toggleTaskCompletion,
        deleteTask,
        toggleSubtask,
        addTransaction,
        deleteTransaction,
        addGoal,
        updateGoal,
        deleteGoal,
        updateBudgetLimit,
        addDraftNote,
        updateDraftNote,
        deleteDraftNote,
        togglePinDraft,
        toggleDashboardWidget,
        notificationPermission,
        notificationsList,
        enableNotifications,
        triggerTestNotification,
        dismissNotification,
        clearAllNotifications,
        refreshCalendar,
        addEventToGoogleCalendar,
        removeGoogleCalendarEvent,
        scheduleTaskInCalendar,
        driveSyncInfo,
        syncToDriveNow,
        restoreFromDriveNow,
        exportBackupJson,
        importBackupJson,
        undoToast,
        clearUndoToast,
        confirmDestructiveAction,
      }}
    >
      {children}

      {/* Global Confirmation Modal */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 relative">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {confirmConfig.title}
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {confirmConfig.message}
            </p>
            {confirmConfig.details && confirmConfig.details.length > 0 && (
              <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                {confirmConfig.details.map((d, i) => (
                  <div key={i}>• {d}</div>
                ))}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmConfig.onConfirm}
                disabled={confirmConfig.isProcessing}
                className={`px-4 py-2 rounded-xl text-sm font-medium text-white shadow-xs transition-colors cursor-pointer ${
                  confirmConfig.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                } ${confirmConfig.isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {confirmConfig.isProcessing ? 'Processando...' : confirmConfig.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
