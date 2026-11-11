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
}) => {
  const { tasks, driveSyncInfo } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingToday = tasks.filter((t) => !t.completed && t.dueDate === todayStr).length;

  const handleTabClick = (tab: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(8);
      } catch {
        // ignore
      }
    }
    setCurrentTab(tab);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800 shadow-xl"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      <div className="flex items-center justify-around h-15 px-2">
        {/* 1. Início */}
        <button
          onClick={() => handleTabClick('dashboard')}
          className="flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] select-none transition-transform active:scale-95 cursor-pointer"
        >
          <div
            className={`flex items-center justify-center px-4 py-1 rounded-full transition-colors ${
              currentTab === 'dashboard'
                ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
          </div>
          <span
            className={`text-[10px] mt-0.5 tracking-tight ${
              currentTab === 'dashboard'
                ? 'font-bold text-indigo-600 dark:text-indigo-400'
                : 'font-medium text-zinc-500 dark:text-zinc-400'
            }`}
          >
            Início
          </span>
        </button>

        {/* 2. Tarefas */}
        <button
          onClick={() => handleTabClick('tarefas')}
          className="flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] select-none transition-transform active:scale-95 cursor-pointer"
        >
          <div
            className={`relative flex items-center justify-center px-4 py-1 rounded-full transition-colors ${
              currentTab === 'tarefas'
                ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <CheckSquare className="w-5 h-5" />
            {pendingToday > 0 && (
              <span className="absolute -top-1 right-2 bg-indigo-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {pendingToday}
              </span>
            )}
          </div>
          <span
            className={`text-[10px] mt-0.5 tracking-tight ${
              currentTab === 'tarefas'
                ? 'font-bold text-indigo-600 dark:text-indigo-400'
                : 'font-medium text-zinc-500 dark:text-zinc-400'
            }`}
          >
            Tarefas
          </span>
        </button>

        {/* 3. Finanças */}
        <button
          onClick={() => handleTabClick('financas')}
          className="flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] select-none transition-transform active:scale-95 cursor-pointer"
        >
          <div
            className={`flex items-center justify-center px-4 py-1 rounded-full transition-colors ${
              currentTab === 'financas'
                ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <CircleDollarSign className="w-5 h-5" />
          </div>
          <span
            className={`text-[10px] mt-0.5 tracking-tight ${
              currentTab === 'financas'
                ? 'font-bold text-indigo-600 dark:text-indigo-400'
                : 'font-medium text-zinc-500 dark:text-zinc-400'
            }`}
          >
            Finanças
          </span>
        </button>

        {/* 4. Agenda */}
        <button
          onClick={() => handleTabClick('agenda')}
          className="flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] select-none transition-transform active:scale-95 cursor-pointer"
        >
          <div
            className={`flex items-center justify-center px-4 py-1 rounded-full transition-colors ${
              currentTab === 'agenda'
                ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <CalendarDays className="w-5 h-5" />
          </div>
          <span
            className={`text-[10px] mt-0.5 tracking-tight ${
              currentTab === 'agenda'
                ? 'font-bold text-indigo-600 dark:text-indigo-400'
                : 'font-medium text-zinc-500 dark:text-zinc-400'
            }`}
          >
            Agenda
          </span>
        </button>

        {/* 5. Ajustes */}
        <button
          onClick={() => handleTabClick('configuracoes')}
          className="flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] select-none transition-transform active:scale-95 cursor-pointer"
        >
          <div
            className={`relative flex items-center justify-center px-4 py-1 rounded-full transition-colors ${
              currentTab === 'configuracoes'
                ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <Sliders className="w-5 h-5" />
            {driveSyncInfo.status === 'cloud_newer' && (
              <span className="absolute top-0.5 right-3 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <span
            className={`text-[10px] mt-0.5 tracking-tight ${
              currentTab === 'configuracoes'
                ? 'font-bold text-indigo-600 dark:text-indigo-400'
                : 'font-medium text-zinc-500 dark:text-zinc-400'
            }`}
          >
            Ajustes
          </span>
        </button>
      </div>
    </nav>
  );
};
