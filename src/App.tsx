/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Fingerprint, Lock } from 'lucide-react';
import { notifyNativeAppReady, syncNativeSystemBars } from './services/systemAppearanceBridge';
import { initKeyboardViewportAdapter } from './services/keyboardAdapter';
import { authenticateFinanceAccess, isBiometricSupportedOnPlatform } from './services/biometricLockBridge';
import { hapticImpactLight, hapticSuccess } from './services/hapticsService';
import { AppProvider, useApp } from './context/AppContext';
import { BackNavigationProvider, useBackNavigation } from './context/BackNavigationContext';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { DashboardView } from './components/Dashboard/DashboardView';
import { AgendaTasksView } from './components/Agenda/AgendaTasksView';
import { FinanceView } from './components/Finance/FinanceView';
import { SettingsView } from './components/Settings/SettingsView';
import { OnboardingView } from './components/Onboarding/OnboardingView';
import { DriveSyncModal } from './components/DriveSync/DriveSyncModal';
import {
  AutoRestoredDriveBanner,
  DriveRestorePromptModal,
  StartFromScratchModal,
} from './components/DriveSync/DriveDecisionModals';
import { NotificationCenterModal } from './components/Notifications/NotificationCenterModal';
import { QuickActionFab } from './components/Common/QuickActionFab';
import { ToastUndo } from './components/Common/ToastUndo';
import { NativeConnectBridge } from './components/Auth/NativeConnectBridge';

const MainApp: React.FC = () => {
  const { onboardingCompleted, theme, financeLockEnabled } = useApp();
  const backNavigation = useBackNavigation();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [agendaQuickOpen, setAgendaQuickOpen] = useState<'task' | 'event' | null>(null);
  const [financeQuickOpen, setFinanceQuickOpen] = useState<'new-transaction' | 'scan-receipt' | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);

  // Finance biometric gate state (locked when enabled until verified in active foreground session)
  const biometricNative = isBiometricSupportedOnPlatform();
  const [isFinanceUnlocked, setIsFinanceUnlocked] = useState<boolean>(() => !financeLockEnabled || !biometricNative);
  const [isUnlockingFinance, setIsUnlockingFinance] = useState<boolean>(false);
  const [financeUnlockError, setFinanceUnlockError] = useState<string | null>(null);
  const autoPromptedTabRef = useRef<boolean>(false);

  // Sync unlock state if user toggles setting
  useEffect(() => {
    if (!financeLockEnabled || !biometricNative) {
      setIsFinanceUnlocked(true);
      setFinanceUnlockError(null);
    } else {
      // Keep current unlock if toggled inside Settings; lock again on next background or if currently closed
      setIsFinanceUnlocked(false);
    }
  }, [financeLockEnabled, biometricNative]);

  const requestFinanceUnlock = useCallback(async () => {
    if (!financeLockEnabled || !biometricNative) {
      setIsFinanceUnlocked(true);
      return;
    }
    setIsUnlockingFinance(true);
    setFinanceUnlockError(null);
    try {
      const result = await authenticateFinanceAccess();
      if (result.authenticated) {
        hapticSuccess();
        setIsFinanceUnlocked(true);
        setFinanceUnlockError(null);
      } else {
        setFinanceUnlockError(result.message || 'Autenticação necessária para abrir Finanças.');
      }
    } finally {
      setIsUnlockingFinance(false);
    }
  }, [financeLockEnabled, biometricNative]);

  // Auto-prompt once whenever user enters locked Finance tab
  useEffect(() => {
    const isLockedFinance = currentTab === 'financas' && financeLockEnabled && biometricNative && !isFinanceUnlocked;
    if (isLockedFinance && !autoPromptedTabRef.current) {
      autoPromptedTabRef.current = true;
      void requestFinanceUnlock();
    } else if (!isLockedFinance) {
      autoPromptedTabRef.current = false;
    }
  }, [currentTab, financeLockEnabled, biometricNative, isFinanceUnlocked, requestFinanceUnlock]);

  // Re-arm Finance lock when Android app moves to background
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let sub: any = null;
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive && financeLockEnabled && biometricNative) {
        setIsFinanceUnlocked(false);
        autoPromptedTabRef.current = false;
      }
    })
      .then((s) => {
        sub = s;
      })
      .catch(() => {});
    return () => {
      if (sub && sub.remove) sub.remove();
    };
  }, [financeLockEnabled, biometricNative]);

  // Handle Android App Shortcuts (com.vidaorganizada.app://shortcut?action=...)
  const applyShortcutUrl = useCallback((url?: string | null) => {
    if (!url || !url.includes('shortcut')) return;
    try {
      const parsed = new URL(url);
      const action = parsed.searchParams.get('action');
      if (!action) return;

      setIsQuickMenuOpen(false);
      setIsSyncModalOpen(false);
      setIsNotificationCenterOpen(false);

      if (action === 'new-task') {
        setCurrentTab('agenda');
        setAgendaQuickOpen('task');
      } else if (action === 'agenda') {
        setCurrentTab('agenda');
      } else if (action === 'new-transaction') {
        setCurrentTab('financas');
        setFinanceQuickOpen('new-transaction');
      } else if (action === 'scan-receipt') {
        setCurrentTab('financas');
        setFinanceQuickOpen('scan-receipt');
      }
    } catch {
      // ignore malformed URL
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    CapApp.getLaunchUrl()
      .then((launch) => {
        if (launch?.url) applyShortcutUrl(launch.url);
      })
      .catch(() => {});

    let sub: any = null;
    CapApp.addListener('appUrlOpen', (event) => {
      applyShortcutUrl(event?.url);
    })
      .then((s) => {
        sub = s;
      })
      .catch(() => {});

    return () => {
      if (sub && sub.remove) sub.remove();
    };
  }, [applyShortcutUrl]);

  // Sincronizar Status Bar, Navigation Bar e DecorView no Android nativo com o tema atual
  useEffect(() => {
    void syncNativeSystemBars(theme, !onboardingCompleted);
  }, [theme, onboardingCompleted]);

  // Sinaliza para o Splash Screen nativo que o primeiro quadro da interface já foi pintado
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    const rafId = window.requestAnimationFrame(() => {
      if (!cancelled) {
        void notifyNativeAppReady();
      }
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  // Hardware Back Button no Android nativo (LIFO: fecha modal/sheet mais recente -> volta para Início -> sai)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let sub: any = null;
    CapApp.addListener('backButton', () => {
      if (backNavigation?.handleTopBackPress()) {
        return;
      }
      if (currentTab !== 'dashboard') {
        setCurrentTab('dashboard');
      } else {
        CapApp.exitApp();
      }
    })
      .then((s) => {
        sub = s;
      })
      .catch(() => {});

    return () => {
      if (sub && sub.remove) sub.remove();
    };
  }, [backNavigation, currentTab]);

  if (!onboardingCompleted) {
    return <OnboardingView />;
  }

  const isFinanceLocked = currentTab === 'financas' && financeLockEnabled && biometricNative && !isFinanceUnlocked;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors selection:bg-indigo-500 selection:text-white">
      <Header
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setIsQuickMenuOpen(false);
          setCurrentTab(tab);
        }}
        openSyncModal={() => setIsSyncModalOpen(true)}
        openNotificationCenter={() => setIsNotificationCenterOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 pt-3 sm:pt-6 keyboard-safe-main">
        <div key={currentTab} className="animate-tab-enter">
          {currentTab === 'dashboard' && <DashboardView setCurrentTab={setCurrentTab} />}
          {currentTab === 'agenda' && (
            <AgendaTasksView
              quickOpenModal={agendaQuickOpen}
              onConsumeQuickOpen={() => setAgendaQuickOpen(null)}
            />
          )}
          {currentTab === 'financas' &&
            (isFinanceLocked ? (
              <div className="max-w-md mx-auto mt-8 sm:mt-14 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs text-center space-y-5">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/70 flex items-center justify-center">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Finanças Protegidas
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Confirme sua identidade com biometria ou PIN do aparelho para visualizar saldos e lançamentos.
                  </p>
                </div>

                {financeUnlockError && (
                  <p className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl px-3 py-2">
                    {financeUnlockError}
                  </p>
                )}

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      hapticImpactLight();
                      void requestFinanceUnlock();
                    }}
                    disabled={isUnlockingFinance}
                    className="pressable w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-60"
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>{isUnlockingFinance ? 'Verificando...' : 'Desbloquear com Biometria'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      hapticImpactLight();
                      setCurrentTab('dashboard');
                    }}
                    className="pressable w-full h-10 rounded-xl text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    Voltar para Início
                  </button>
                </div>
              </div>
            ) : (
              <FinanceView
                quickOpenAction={financeQuickOpen}
                onConsumeQuickOpen={() => setFinanceQuickOpen(null)}
              />
            ))}
          {currentTab === 'configuracoes' && (
            <SettingsView
              openSyncModal={() => setIsSyncModalOpen(true)}
              openNotificationCenter={() => setIsNotificationCenterOpen(true)}
            />
          )}
        </div>
      </main>

      <QuickActionFab
        isOpen={isQuickMenuOpen}
        onOpenChange={setIsQuickMenuOpen}
        setCurrentTab={setCurrentTab}
        onTriggerAgendaModal={(mode) => {
          setCurrentTab('agenda');
          setAgendaQuickOpen(mode);
        }}
      />

      <ToastUndo />

      <MobileNav
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setIsQuickMenuOpen(false);
          setCurrentTab(tab);
        }}
        openSyncModal={() => setIsSyncModalOpen(true)}
        isQuickMenuOpen={isQuickMenuOpen}
        onToggleQuickMenu={() => setIsQuickMenuOpen((prev) => !prev)}
      />

      <DriveSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />
    </div>
  );
};

export default function App() {
  const isConnectNative =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('connect_native') === '1';

  useEffect(() => {
    return initKeyboardViewportAdapter();
  }, []);

  return (
    <BackNavigationProvider>
      <AppProvider>
        {isConnectNative ? (
          <NativeConnectBridge />
        ) : (
          <>
            <MainApp />
            <AutoRestoredDriveBanner />
            <DriveRestorePromptModal />
            <StartFromScratchModal />
          </>
        )}
      </AppProvider>
    </BackNavigationProvider>
  );
}
