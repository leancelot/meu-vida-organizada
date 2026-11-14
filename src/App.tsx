/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { syncNativeSystemBars } from './services/systemAppearanceBridge';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { DashboardView } from './components/Dashboard/DashboardView';
import { AgendaTasksView } from './components/Agenda/AgendaTasksView';
import { FinanceView } from './components/Finance/FinanceView';
import { SettingsView } from './components/Settings/SettingsView';
import { OnboardingView } from './components/Onboarding/OnboardingView';
import { DriveSyncModal } from './components/DriveSync/DriveSyncModal';
import { NotificationCenterModal } from './components/Notifications/NotificationCenterModal';
import { QuickActionFab } from './components/Common/QuickActionFab';
import { ToastUndo } from './components/Common/ToastUndo';
import { NativeConnectBridge } from './components/Auth/NativeConnectBridge';

const MainApp: React.FC = () => {
  const { onboardingCompleted, theme } = useApp();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [agendaQuickOpen, setAgendaQuickOpen] = useState<'task' | 'event' | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  // Sincronizar Status Bar, Navigation Bar e DecorView no Android nativo com o tema atual
  useEffect(() => {
    void syncNativeSystemBars(theme, !onboardingCompleted);
  }, [theme, onboardingCompleted]);

  // Hardware Back Button no Android nativo
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let sub: any = null;
    CapApp.addListener('backButton', () => {
      if (isNotificationCenterOpen) {
        setIsNotificationCenterOpen(false);
      } else if (isSyncModalOpen) {
        setIsSyncModalOpen(false);
      } else if (currentTab !== 'dashboard') {
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
  }, [isNotificationCenterOpen, isSyncModalOpen, currentTab]);

  if (!onboardingCompleted) {
    return <OnboardingView />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors selection:bg-indigo-500 selection:text-white">
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openSyncModal={() => setIsSyncModalOpen(true)}
        openNotificationCenter={() => setIsNotificationCenterOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-28 md:pb-12">
        {currentTab === 'dashboard' && <DashboardView setCurrentTab={setCurrentTab} />}
        {currentTab === 'agenda' && (
          <AgendaTasksView
            quickOpenModal={agendaQuickOpen}
            onConsumeQuickOpen={() => setAgendaQuickOpen(null)}
          />
        )}
        {currentTab === 'financas' && <FinanceView />}
        {currentTab === 'configuracoes' && (
          <SettingsView
            openSyncModal={() => setIsSyncModalOpen(true)}
            openNotificationCenter={() => setIsNotificationCenterOpen(true)}
          />
        )}
      </main>

      <QuickActionFab
        setCurrentTab={setCurrentTab}
        onTriggerAgendaModal={(mode) => {
          setCurrentTab('agenda');
          setAgendaQuickOpen(mode);
        }}
      />

      <ToastUndo />

      <MobileNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openSyncModal={() => setIsSyncModalOpen(true)}
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

  return (
    <AppProvider>
      {isConnectNative ? <NativeConnectBridge /> : <MainApp />}
    </AppProvider>
  );
}
