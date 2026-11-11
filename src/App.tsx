/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { DashboardView } from './components/Dashboard/DashboardView';
import { TasksView } from './components/Tasks/TasksView';
import { FinanceView } from './components/Finance/FinanceView';
import { AgendaView } from './components/Agenda/AgendaView';
import { SettingsView } from './components/Settings/SettingsView';
import { DriveSyncModal } from './components/DriveSync/DriveSyncModal';
import { InstallGuideModal } from './components/Install/InstallGuideModal';
import { QuickActionFab } from './components/Common/QuickActionFab';
import { ToastUndo } from './components/Common/ToastUndo';

const MainApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors selection:bg-indigo-500 selection:text-white">
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openSyncModal={() => setIsSyncModalOpen(true)}
        openInstallModal={() => setIsInstallModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-28 md:pb-12">
        {currentTab === 'dashboard' && <DashboardView setCurrentTab={setCurrentTab} />}
        {currentTab === 'tarefas' && <TasksView />}
        {currentTab === 'financas' && <FinanceView />}
        {currentTab === 'agenda' && <AgendaView />}
        {currentTab === 'configuracoes' && (
          <SettingsView
            openSyncModal={() => setIsSyncModalOpen(true)}
            openInstallModal={() => setIsInstallModalOpen(true)}
          />
        )}
      </main>

      {/* Floating Action Button for Quick Creation */}
      <QuickActionFab setCurrentTab={setCurrentTab} />

      {/* Undo Toast Notification */}
      <ToastUndo />

      {/* Mobile Bottom Navigation */}
      <MobileNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openSyncModal={() => setIsSyncModalOpen(true)}
      />

      {/* Google Drive Sync Center */}
      <DriveSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />

      {/* Mobile Packaging & APK Install Guide */}
      <InstallGuideModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
