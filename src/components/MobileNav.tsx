import React from 'react';
import {
  CalendarDays,
  CheckSquare,
  CircleDollarSign,
  LayoutGrid,
  Sliders,
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
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 shadow-lg"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)' }}
    >
      <div className="flex items-center justify-around h-14 px-1">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] active:scale-95 transition-all cursor-pointer select-none ${
            currentTab === 'dashboard'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Início</span>
        </button>

        <button
          onClick={() => setCurrentTab('tarefas')}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] relative active:scale-95 transition-all cursor-pointer select-none ${
            currentTab === 'tarefas'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <div className="relative">
            <CheckSquare className="w-5 h-5" />
            {pendingToday > 0 && (
              <span className="absolute -top-1 -right-2 bg-indigo-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {pendingToday}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Tarefas</span>
        </button>

        <button
          onClick={() => setCurrentTab('financas')}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] active:scale-95 transition-all cursor-pointer select-none ${
            currentTab === 'financas'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <CircleDollarSign className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Finanças</span>
        </button>

        <button
          onClick={() => setCurrentTab('agenda')}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] active:scale-95 transition-all cursor-pointer select-none ${
            currentTab === 'agenda'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Agenda</span>
        </button>

        <button
          onClick={() => setCurrentTab('configuracoes')}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-all relative active:scale-95 cursor-pointer select-none ${
            currentTab === 'configuracoes'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <div className="relative">
            <Sliders className="w-5 h-5" />
            {driveSyncInfo.status === 'cloud_newer' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Ajustes</span>
        </button>
      </div>
    </nav>
  );
};
