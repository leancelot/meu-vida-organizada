import React from 'react';
import {
  CalendarDays,
  CheckSquare,
  CircleDollarSign,
  FolderGit2,
  LayoutGrid,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface MobileNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openSyncModal: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  setCurrentTab,
  openSyncModal,
}) => {
  const { tasks, driveSyncInfo } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingToday = tasks.filter(
    (t) => !t.completed && t.dueDate === todayStr
  ).length;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            currentTab === 'dashboard'
              ? 'text-indigo-600 dark:text-indigo-400 font-medium'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[11px] mt-1">Dashboard</span>
        </button>

        <button
          onClick={() => setCurrentTab('tarefas')}
          className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-colors cursor-pointer ${
            currentTab === 'tarefas'
              ? 'text-indigo-600 dark:text-indigo-400 font-medium'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <div className="relative">
            <CheckSquare className="w-5 h-5" />
            {pendingToday > 0 && (
              <span className="absolute -top-1 -right-2 bg-indigo-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {pendingToday}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-1">Tarefas</span>
        </button>

        <button
          onClick={() => setCurrentTab('financas')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            currentTab === 'financas'
              ? 'text-indigo-600 dark:text-indigo-400 font-medium'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <CircleDollarSign className="w-5 h-5" />
          <span className="text-[11px] mt-1">Finanças</span>
        </button>

        <button
          onClick={() => setCurrentTab('agenda')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            currentTab === 'agenda'
              ? 'text-indigo-600 dark:text-indigo-400 font-medium'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[11px] mt-1">Agenda</span>
        </button>

        <button
          onClick={() => setCurrentTab('configuracoes')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors relative cursor-pointer ${
            currentTab === 'configuracoes'
              ? 'text-indigo-600 dark:text-indigo-400 font-medium'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <div className="relative">
            <FolderGit2 className="w-5 h-5" />
            {driveSyncInfo.status === 'cloud_newer' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <span className="text-[11px] mt-1">Ajustes</span>
        </button>
      </div>
    </nav>
  );
};
