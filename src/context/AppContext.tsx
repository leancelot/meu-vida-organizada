import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
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
  PendingBankNotification,
} from '../types';
import { parseBankNotificationText } from '../services/bankNotificationParser';
import {
  acknowledgeNativeBankNotifications,
  checkBankNotificationPermission,
  fetchNativePendingBankNotifications,
  isAndroidNotificationCaptureSupported,
  NativePendingBankEvent,
  openBankNotificationSettings,
  subscribeNativeBankNotifications,
} from '../services/bankNotificationBridge';
import {
  initAuth,
  googleSignIn,
  completeNativeGoogleAuth,
  logout as fbLogout,
  getAccessToken,
  setSessionToken,
} from '../services/firebase';
import { isWorkspaceAuthError } from '../services/googleAuthError';
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
import {
  hapticSuccess,
  hapticWarning,
  hapticImpactLight,
} from '../services/hapticsService';
import confetti from 'canvas-confetti';

const STORAGE_KEY_DATA = 'vidaorganizada_local_data_v2';
const STORAGE_KEY_SYNC = 'vidaorganizada_sync_info_v2';
const STORAGE_KEY_NOTIFS = 'vidaorganizada_notifications_v2';
const STORAGE_KEY_THEME = 'vidaorganizada_theme_v1';
const STORAGE_KEY_HIDE_VALUES = 'vidaorganizada_hide_values_v1';
const STORAGE_KEY_PENDING_BANK = 'vidaorganizada_pending_bank_v1';
const STORAGE_KEY_BANK_SIGS = 'vidaorganizada_ingested_bank_sigs_v1';
const CURRENT_DATA_VERSION = 3;
const BANK_DEDUPE_WINDOW_MS = 10 * 60 * 1000;

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const DEFAULT_WIDGETS = ['overview', 'schedule', 'tasks', 'finance', 'scratchpad', 'reminders'];

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

const LEGACY_SEED_GOALS: Record<string, { title: string; targetAmount: number; currentAmount: number }> = {
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

function sanitizeLegacyPayload(parsed: any): Partial<AppDataPayload> {
  if (!parsed || typeof parsed !== 'object') return {};

  const isLegacyVersion = typeof parsed.version !== 'number' || parsed.version < CURRENT_DATA_VERSION;

  const rawTasks: TaskItem[] = Array.isArray(parsed.tasks) ? parsed.tasks : [];
  const rawTxs: Transaction[] = Array.isArray(parsed.transactions) ? parsed.transactions : [];
  const rawGoals: FinancialGoal[] = Array.isArray(parsed.financialGoals) ? parsed.financialGoals : [];
  const rawBudgets: BudgetLimit[] = Array.isArray(parsed.budgetLimits) ? parsed.budgetLimits : [];
  const rawDrafts: DraftNote[] = Array.isArray(parsed.draftNotes) ? parsed.draftNotes : [];

  if (!isLegacyVersion) {
    return {
      userName: typeof parsed.userName === 'string' ? parsed.userName : '',
      onboardingCompleted: Boolean(parsed.onboardingCompleted),
      tasks: rawTasks,
      transactions: rawTxs,
      financialGoals: rawGoals,
      budgetLimits: rawBudgets,
      draftNotes: rawDrafts,
      dashboardWidgets: Array.isArray(parsed.dashboardWidgets) ? parsed.dashboardWidgets : DEFAULT_WIDGETS,
      pendingBankNotifications: Array.isArray(parsed.pendingBankNotifications)
        ? parsed.pendingBankNotifications
        : [],
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
    userName: typeof parsed.userName === 'string' ? parsed.userName : '',
    onboardingCompleted: Boolean(parsed.onboardingCompleted),
    tasks,
    transactions,
    financialGoals,
    budgetLimits,
    draftNotes,
    dashboardWidgets: Array.isArray(parsed.dashboardWidgets) ? parsed.dashboardWidgets : DEFAULT_WIDGETS,
    pendingBankNotifications: Array.isArray(parsed.pendingBankNotifications)
      ? parsed.pendingBankNotifications
      : [],
  };
}

function loadInitialLocalPayload(): Partial<AppDataPayload> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DATA);
    if (saved) {
      return sanitizeLegacyPayload(JSON.parse(saved));
    }
  } catch (e) {
    console.warn('Erro ao ler dados locais:', e);
  }
  return {};
}

interface UndoToastInfo {
  id: string;
  message: string;
  onUndo: () => void;
}

interface AppContextType {
  // Theme state
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark') => void;

  // Profile & Onboarding state
  userName: string;
  setUserName: (name: string) => void;
  onboardingCompleted: boolean;
  completeOnboarding: (name: string) => void;

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

  // Privacy Mode state
  hideValues: boolean;
  toggleHideValues: () => void;
  formatMoney: (amount: number) => string;

  // Finance actions
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  addGoal: (goal: Omit<FinancialGoal, 'id'>) => void;
  updateGoal: (id: string, updates: Partial<FinancialGoal>) => void;
  deleteGoal: (id: string) => void;
  updateBudgetLimit: (category: Transaction['category'], limit: number) => void;

  // Bank Notification Review Queue
  pendingBankNotifications: PendingBankNotification[];
  bankListenerSupported: boolean;
  bankListenerPermission: boolean;
  refreshBankListenerPermission: () => Promise<boolean>;
  openBankListenerSettings: () => Promise<void>;
  enqueueParsedBankText: (rawText: string, bankName?: string) => PendingBankNotification | null;
  approvePendingBankNotification: (
    id: string,
    overrides?: Partial<Omit<Transaction, 'id'>>
  ) => void;
  approveAllPendingBankNotifications: () => void;
  dismissPendingBankNotification: (id: string) => void;
  clearPendingBankNotifications: () => void;

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

  const setThemeMode = (mode: 'light' | 'dark') => {
    setTheme(mode);
  };

  // Initial sanitized payload (zero fictitious examples)
  const initialPayloadRef = useRef<Partial<AppDataPayload> | null>(null);
  if (initialPayloadRef.current === null) {
    initialPayloadRef.current = loadInitialLocalPayload();
  }
  const initialPayload = initialPayloadRef.current;

  // Profile & Onboarding
  const [userName, setUserNameState] = useState<string>(() => initialPayload.userName || '');
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(
    () => Boolean(initialPayload.onboardingCompleted)
  );

  // Auth
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // App core state (always starts empty if no user data)
  const [tasks, setTasks] = useState<TaskItem[]>(() => initialPayload.tasks || []);
  const [transactions, setTransactions] = useState<Transaction[]>(
    () => initialPayload.transactions || []
  );
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>(
    () => initialPayload.financialGoals || []
  );
  const [budgetLimits, setBudgetLimits] = useState<BudgetLimit[]>(
    () => initialPayload.budgetLimits || []
  );
  const [draftNotes, setDraftNotes] = useState<DraftNote[]>(
    () => initialPayload.draftNotes || []
  );
  const [dashboardWidgets, setDashboardWidgets] = useState<string[]>(
    () => initialPayload.dashboardWidgets || DEFAULT_WIDGETS
  );

  // Global Privacy Mode (persisted in localStorage)
  const [hideValues, setHideValues] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_HIDE_VALUES) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HIDE_VALUES, String(hideValues));
    } catch {
      // ignore
    }
  }, [hideValues]);

  const toggleHideValues = useCallback(() => {
    hapticImpactLight();
    setHideValues((prev) => !prev);
  }, []);

  const formatMoney = useCallback(
    (amount: number) => {
      if (hideValues) return 'R$ •••••';
      return BRL_FORMATTER.format(amount);
    },
    [hideValues]
  );

  // Bank notification review queue & Android listener state
  const bankListenerSupported = isAndroidNotificationCaptureSupported();
  const [bankListenerPermission, setBankListenerPermission] = useState<boolean>(false);
  const [pendingBankNotifications, setPendingBankNotifications] = useState<PendingBankNotification[]>(
    () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_PENDING_BANK);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        // ignore
      }
      return Array.isArray(initialPayload.pendingBankNotifications)
        ? initialPayload.pendingBankNotifications
        : [];
    }
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PENDING_BANK, JSON.stringify(pendingBankNotifications));
    } catch {
      // ignore
    }
  }, [pendingBankNotifications]);

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

  // Web & Native Android Notifications state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return getNotificationPermission();
  });

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
        LocalNotifications.checkPermissions()
          .then((status) => {
            const perm: NotificationPermission =
              status.display === 'granted'
                ? 'granted'
                : status.display === 'denied'
                ? 'denied'
                : 'default';
            setNotificationPermission(perm);
          })
          .catch(() => {});
      });
    }
  }, []);

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
      version: CURRENT_DATA_VERSION,
      lastUpdated: new Date().toISOString(),
      userName,
      onboardingCompleted,
      tasks,
      transactions,
      financialGoals,
      budgetLimits,
      draftNotes,
      dashboardWidgets,
      pendingBankNotifications,
    };
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(payload));
    } catch (e) {
      console.error('Falha ao salvar dados no LocalStorage:', e);
    }
  }, [
    userName,
    onboardingCompleted,
    tasks,
    transactions,
    financialGoals,
    budgetLimits,
    draftNotes,
    dashboardWidgets,
    pendingBankNotifications,
  ]);

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

  // Bank Notification Listener & Review Queue Ingestion (Android + Resume Sync)
  const recordAndCheckSignatureDuplicate = useCallback((signature: string): boolean => {
    const now = Date.now();
    try {
      const raw = localStorage.getItem(STORAGE_KEY_BANK_SIGS);
      const parsed: Record<string, number> = raw ? JSON.parse(raw) : {};
      const cleaned: Record<string, number> = {};
      for (const [k, ts] of Object.entries(parsed)) {
        if (typeof ts === 'number' && now - ts < BANK_DEDUPE_WINDOW_MS) {
          cleaned[k] = ts;
        }
      }
      if (cleaned[signature]) {
        localStorage.setItem(STORAGE_KEY_BANK_SIGS, JSON.stringify(cleaned));
        return true;
      }
      cleaned[signature] = now;
      localStorage.setItem(STORAGE_KEY_BANK_SIGS, JSON.stringify(cleaned));
      return false;
    } catch {
      return false;
    }
  }, []);

  const ingestNativeEvents = useCallback(
    (events: NativePendingBankEvent[]) => {
      if (!events.length) return;
      const newItems: PendingBankNotification[] = [];

      events.forEach((evt) => {
        const parsed = parseBankNotificationText({
          rawText: evt.text || '',
          title: evt.title,
          bankName: evt.bankName,
          timestamp: evt.timestamp,
          source: 'android',
          allowAmbiguous: false,
        });
        if (!parsed) return;
        if (recordAndCheckSignatureDuplicate(parsed.signature)) return;
        newItems.push({
          ...parsed,
          id: evt.id || `bn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        });
      });

      if (newItems.length > 0) {
        setPendingBankNotifications((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const existingSigs = new Set(prev.map((item) => item.signature));
          const uniqueIncoming = newItems.filter(
            (item) => !existingIds.has(item.id) && !existingSigs.has(item.signature)
          );
          return uniqueIncoming.length > 0 ? [...uniqueIncoming, ...prev] : prev;
        });
      }
    },
    [recordAndCheckSignatureDuplicate]
  );

  const refreshBankListenerPermission = useCallback(async (): Promise<boolean> => {
    if (!bankListenerSupported) {
      setBankListenerPermission(false);
      return false;
    }
    const granted = await checkBankNotificationPermission();
    setBankListenerPermission(granted);
    return granted;
  }, [bankListenerSupported]);

  const openBankListenerSettings = useCallback(async () => {
    await openBankNotificationSettings();
  }, []);

  const syncNativeBankNotifications = useCallback(async () => {
    if (!bankListenerSupported) return;
    const pending = await fetchNativePendingBankNotifications();
    if (pending.length === 0) return;

    ingestNativeEvents(pending);
    const ids = pending.map((p) => p.id).filter(Boolean);
    await acknowledgeNativeBankNotifications(ids);
  }, [bankListenerSupported, ingestNativeEvents]);

  useEffect(() => {
    if (!bankListenerSupported) return;

    let active = true;
    let removeNativeListener: (() => void) | null = null;
    let appStateHandle: { remove: () => Promise<void> } | null = null;

    refreshBankListenerPermission();
    syncNativeBankNotifications();

    subscribeNativeBankNotifications((event) => {
      if (!active) return;
      ingestNativeEvents([event]);
      if (event.id) {
        acknowledgeNativeBankNotifications([event.id]);
      }
    }).then((unsub) => {
      if (active) {
        removeNativeListener = unsub;
      } else if (unsub) {
        unsub();
      }
    });

    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive && active) {
        refreshBankListenerPermission();
        syncNativeBankNotifications();
      }
    }).then((handle) => {
      appStateHandle = handle;
    });

    return () => {
      active = false;
      if (removeNativeListener) removeNativeListener();
      if (appStateHandle) appStateHandle.remove().catch(() => {});
    };
  }, [
    bankListenerSupported,
    ingestNativeEvents,
    refreshBankListenerPermission,
    syncNativeBankNotifications,
  ]);

  // Handle native Android deep-link OAuth callback (com.vidaorganizada.app://oauth#access_token=...)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isMounted = true;
    const setupListener = async () => {
      const handle = await CapApp.addListener('appUrlOpen', async (data) => {
        if (!isMounted || !data.url) return;

        try {
          if (data.url.includes('com.vidaorganizada.app')) {
            const raw = data.url;
            const hashIdx = raw.indexOf('#');
            const queryIdx = raw.indexOf('?');
            const searchStr =
              hashIdx !== -1
                ? raw.substring(hashIdx + 1)
                : queryIdx !== -1
                ? raw.substring(queryIdx + 1)
                : '';
            const params = new URLSearchParams(searchStr);

            const token = params.get('access_token');
            const idToken = params.get('id_token');

            try {
              await Browser.close();
            } catch {
              // ignore
            }

            if (token) {
              setIsAuthenticating(true);
              sessionExpiredNotifiedRef.current = false;
              const loggedUser = await completeNativeGoogleAuth(token, idToken);
              setAccessToken(token);
              if (loggedUser) {
                setUser(loggedUser);
              }

              confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });

              try {
                const driveFile = await findDriveBackupFile(token);
                if (driveFile) {
                  setDriveSyncInfo((prev) => ({
                    ...prev,
                    fileId: driveFile.id,
                    remoteModifiedAt: driveFile.modifiedTime,
                    status: 'cloud_newer',
                  }));
                }
              } catch (e) {
                console.warn('Erro ao consultar Drive pós deep link:', e);
              }

              try {
                const events = await listCalendarEvents(token);
                setCalendarEvents(events);
              } catch (e) {
                console.warn('Erro ao consultar Agenda pós deep link:', e);
              }

              const successNotif: AppNotification = {
                id: 'notif-auth-ok-' + Date.now(),
                title: '🎉 Google Conectado com Sucesso',
                body: 'Sua conta Google foi sincronizada. Google Drive e Agenda estão ativos.',
                timestamp: new Date().toISOString(),
                type: 'reminder',
                read: false,
              };
              setNotificationsList((prev) => [successNotif, ...prev]);
            }
          }
        } catch (err: any) {
          console.error('Falha ao processar login nativo do Google:', err);
        } finally {
          setIsAuthenticating(false);
        }
      });

      return handle;
    };

    const promise = setupListener();
    return () => {
      isMounted = false;
      promise.then((h) => h?.remove());
    };
  }, []);


  const sessionExpiredNotifiedRef = useRef(false);

  const handleWorkspaceAuthError = useCallback((err: unknown): boolean => {
    if (!isWorkspaceAuthError(err)) return false;

    setSessionToken(null);
    setAccessToken(null);
    setUser(null);
    setDriveSyncInfo((prev) => ({
      ...prev,
      status: 'idle',
      errorMessage: undefined,
    }));

    if (!sessionExpiredNotifiedRef.current) {
      sessionExpiredNotifiedRef.current = true;
      const expiredNotif: AppNotification = {
        id: 'notif-auth-expired-' + Date.now(),
        title: 'Sessão Google expirada',
        body: 'Sua sessão de acesso ao Google expirou. Conecte sua conta novamente para sincronizar Drive e Agenda.',
        timestamp: new Date().toISOString(),
        type: 'reminder',
        read: false,
      };
      setNotificationsList((prev) => [expiredNotif, ...prev.slice(0, 29)]);
    }

    return true;
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
      if (!handleWorkspaceAuthError(err)) {
        console.warn('Falha ao carregar calendário:', err);
      }
    } finally {
      setIsLoadingCalendar(false);
    }
  }, [accessToken, handleWorkspaceAuthError]);

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
      if (!handleWorkspaceAuthError(err)) {
        console.warn('Erro ao verificar status do Google Drive:', err);
      }
    }
  }, [accessToken, handleWorkspaceAuthError]);

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
          version: CURRENT_DATA_VERSION,
          lastUpdated: new Date().toISOString(),
          userName,
          onboardingCompleted,
          tasks,
          transactions,
          financialGoals,
          budgetLimits,
          draftNotes,
          dashboardWidgets,
          pendingBankNotifications,
        };

        const result: DriveFileInfo = await saveToDrive(accessToken, payload, driveSyncInfo.fileId);
        setDriveSyncInfo({
          fileId: result.id,
          lastSyncedAt: new Date().toISOString(),
          remoteModifiedAt: result.modifiedTime,
          status: 'synced',
        });
      } catch (err: any) {
        if (!handleWorkspaceAuthError(err)) {
          console.warn('Falha na sincronização em segundo plano:', err);
          setDriveSyncInfo((prev) => ({
            ...prev,
            status: 'error',
            errorMessage: err.message || 'Falha ao sincronizar',
          }));
        }
      }
    }, 4000);
  }, [
    accessToken,
    userName,
    onboardingCompleted,
    tasks,
    transactions,
    financialGoals,
    budgetLimits,
    draftNotes,
    dashboardWidgets,
    pendingBankNotifications,
    driveSyncInfo.fileId,
    handleWorkspaceAuthError,
  ]);

  const setUserName = (name: string) => {
    const cleaned = name.trim();
    setUserNameState(cleaned);
    triggerAutoSync();
  };

  const completeOnboarding = (name: string) => {
    const cleaned = name.trim();
    if (cleaned) {
      setUserNameState(cleaned);
    }
    setOnboardingCompleted(true);
    hapticSuccess();
    triggerAutoSync();
  };

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
        version: CURRENT_DATA_VERSION,
        lastUpdated: new Date().toISOString(),
        userName,
        onboardingCompleted,
        tasks,
        transactions,
        financialGoals,
        budgetLimits,
        draftNotes,
        dashboardWidgets,
        pendingBankNotifications,
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
      if (handleWorkspaceAuthError(err)) {
        throw new Error('Sessão Google expirada. Conecte sua conta novamente.');
      }
      console.warn('Falha ao salvar no Drive:', err);
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
        const sanitized = sanitizeLegacyPayload(remoteData);
        if (sanitized.tasks) setTasks(sanitized.tasks);
        if (sanitized.transactions) setTransactions(sanitized.transactions);
        if (sanitized.financialGoals) setFinancialGoals(sanitized.financialGoals);
        if (sanitized.budgetLimits) setBudgetLimits(sanitized.budgetLimits);
        if (sanitized.draftNotes) setDraftNotes(sanitized.draftNotes);
        if (sanitized.dashboardWidgets) setDashboardWidgets(sanitized.dashboardWidgets);
        if (sanitized.pendingBankNotifications) {
          setPendingBankNotifications(sanitized.pendingBankNotifications);
        }
        if (sanitized.userName) setUserNameState(sanitized.userName);
        if (sanitized.onboardingCompleted || sanitized.userName) {
          setOnboardingCompleted(true);
        }

        setDriveSyncInfo({
          fileId,
          lastSyncedAt: new Date().toISOString(),
          remoteModifiedAt: remoteData.lastUpdated || new Date().toISOString(),
          status: 'synced',
        });
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
      }
    } catch (err: any) {
      if (handleWorkspaceAuthError(err)) {
        throw new Error('Sessão Google expirada. Conecte sua conta novamente.');
      }
      console.warn('Falha ao restaurar do Drive:', err);
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
      if (!result) return;

      if ((result as any).isNativeRedirect) {
        // Redirecionado para Chrome seguro (Custom Tab); o listener appUrlOpen concluirá a autenticação
        return;
      }

      if (result.user && result.accessToken) {
        sessionExpiredNotifiedRef.current = false;
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
    hapticImpactLight();
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
            hapticSuccess();
            confetti({ particleCount: 25, spread: 50, origin: { y: 0.85 } });
          } else {
            hapticImpactLight();
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

    hapticWarning();
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
    hapticImpactLight();
    setTransactions((prev) => [newTx, ...prev]);
    triggerAutoSync();
  };

  const deleteTransaction = (id: string) => {
    const txToDelete = transactions.find((tx) => tx.id === id);
    if (!txToDelete) return;

    hapticWarning();
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
      if (limit <= 0 || isNaN(limit)) {
        return prev.filter((b) => b.category !== category);
      }
      const exists = prev.find((b) => b.category === category);
      if (exists) {
        return prev.map((b) => (b.category === category ? { ...b, monthlyLimit: limit } : b));
      } else {
        return [...prev, { category, monthlyLimit: limit }];
      }
    });
    triggerAutoSync();
  };

  // Bank Notification Queue actions
  const enqueueParsedBankText = (
    rawText: string,
    bankName?: string
  ): PendingBankNotification | null => {
    const parsed = parseBankNotificationText({
      rawText,
      bankName,
      source: 'manual',
      allowAmbiguous: true,
    });
    if (!parsed) return null;

    const item: PendingBankNotification = {
      ...parsed,
      id: `bn-manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    hapticImpactLight();
    setPendingBankNotifications((prev) => [item, ...prev]);
    return item;
  };

  const approvePendingBankNotification = (
    id: string,
    overrides?: Partial<Omit<Transaction, 'id'>>
  ) => {
    const target = pendingBankNotifications.find((item) => item.id === id);
    if (!target) return;

    const newTx: Transaction = {
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      type: overrides?.type ?? target.type,
      title: overrides?.title ?? target.title,
      amount: overrides?.amount ?? target.amount,
      category: overrides?.category ?? target.category,
      date: overrides?.date ?? target.date,
      paymentMethod: overrides?.paymentMethod ?? target.paymentMethod,
      notes: overrides?.notes ?? `Origem: ${target.bankName}`,
      recurring: overrides?.recurring ?? false,
    };

    hapticSuccess();
    setTransactions((prev) => [newTx, ...prev]);
    setPendingBankNotifications((prev) => prev.filter((item) => item.id !== id));
    triggerAutoSync();
  };

  const approveAllPendingBankNotifications = () => {
    if (pendingBankNotifications.length === 0) return;

    const nowBase = Date.now();
    const batch: Transaction[] = pendingBankNotifications.map((item, idx) => ({
      id: `tx-${nowBase}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      type: item.type,
      title: item.title,
      amount: item.amount,
      category: item.category,
      date: item.date,
      paymentMethod: item.paymentMethod,
      notes: `Origem: ${item.bankName}`,
      recurring: false,
    }));

    hapticSuccess();
    setTransactions((prev) => [...batch, ...prev]);
    setPendingBankNotifications([]);
    triggerAutoSync();
  };

  const dismissPendingBankNotification = (id: string) => {
    hapticImpactLight();
    setPendingBankNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  const clearPendingBankNotifications = () => {
    hapticWarning();
    setPendingBankNotifications([]);
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
      handleWorkspaceAuthError(err);
      console.warn('Falha ao adicionar evento na Google Agenda:', err);
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
        try {
          await apiDeleteCalendarEvent(token, eventId);
          setCalendarEvents((prev) => prev.filter((e) => e.id !== eventId));
        } catch (err) {
          handleWorkspaceAuthError(err);
          throw err;
        }
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
      handleWorkspaceAuthError(e);
      console.warn('Falha ao agendar tarefa no Google Calendar:', e);
    }
    return false;
  };

  // Export JSON backup
  const exportBackupJson = () => {
    const payload: AppDataPayload = {
      version: CURRENT_DATA_VERSION,
      lastUpdated: new Date().toISOString(),
      userName,
      onboardingCompleted,
      tasks,
      transactions,
      financialGoals,
      budgetLimits,
      draftNotes,
      dashboardWidgets,
      pendingBankNotifications,
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
      const sanitized = sanitizeLegacyPayload(parsed);
      if (sanitized.tasks) setTasks(sanitized.tasks);
      if (sanitized.transactions) setTransactions(sanitized.transactions);
      if (sanitized.financialGoals) setFinancialGoals(sanitized.financialGoals);
      if (sanitized.budgetLimits) setBudgetLimits(sanitized.budgetLimits);
      if (sanitized.draftNotes) setDraftNotes(sanitized.draftNotes);
      if (sanitized.dashboardWidgets) setDashboardWidgets(sanitized.dashboardWidgets);
      if (sanitized.pendingBankNotifications) {
        setPendingBankNotifications(sanitized.pendingBankNotifications);
      }
      if (sanitized.userName) setUserNameState(sanitized.userName);
      if (sanitized.onboardingCompleted || sanitized.userName) {
        setOnboardingCompleted(true);
      }
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
        setThemeMode,
        userName,
        setUserName,
        onboardingCompleted,
        completeOnboarding,
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
        hideValues,
        toggleHideValues,
        formatMoney,
        pendingBankNotifications,
        bankListenerSupported,
        bankListenerPermission,
        refreshBankListenerPermission,
        openBankListenerSettings,
        enqueueParsedBankText,
        approvePendingBankNotification,
        approveAllPendingBankNotifications,
        dismissPendingBankNotification,
        clearPendingBankNotifications,
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
