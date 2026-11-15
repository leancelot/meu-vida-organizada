import React from 'react';
import {
  CalendarDays,
  CircleDollarSign,
  LayoutGrid,
  Plus,
  Sliders,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { hapticImpactLight, hapticSelection } from '../services/hapticsService';

interface MobileNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openSyncModal: () => void;
  isQuickMenuOpen: boolean;
  onToggleQuickMenu: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  setCurrentTab,
  isQuickMenuOpen,
  onToggleQuickMenu,
}) => {
  const { tasks, driveSyncInfo } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingToday = tasks.filter((t) => !t.completed && t.dueDate === todayStr).length;

  const handleTabClick = (tab: string) => {
    hapticSelection();
    setCurrentTab(tab);
  };

  const handleQuickButtonClick = () => {
    hapticImpactLight();
    onToggleQuickMenu();
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-2.5 pb-[max(env(safe-area-inset-bottom,0px),var(--safe-area-inset-bottom,0px),10px)] pointer-events-none keyboard-hide-when-open">
      <nav
        aria-label="Navegação principal"
        className="pointer-events-auto mx-auto max-w-md bg-white/92 dark:bg-zinc-900/92 backdrop-blur-xl border border-zinc-200/90 dark:border-zinc-800 rounded-3xl shadow-xl shadow-black/10 dark:shadow-black/45 px-1.5 py-1"
      >
        <div className="grid grid-cols-5 items-center gap-1">
          {/* 1. Início */}
          <button
            type="button"
            onClick={() => handleTabClick('dashboard')}
            aria-current={currentTab === 'dashboard' ? 'page' : undefined}
            className={`relative flex flex-col items-center justify-center h-12 rounded-2xl select-none transition-all duration-150 active:scale-95 cursor-pointer ${
              currentTab === 'dashboard'
                ? 'bg-indigo-100/85 dark:bg-indigo-950/65 text-indigo-700 dark:text-indigo-300'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <LayoutGrid className="w-[18px] h-[18px]" />
            <span
              className={`text-[10px] mt-1 leading-none tracking-tight whitespace-nowrap ${
                currentTab === 'dashboard' ? 'font-bold' : 'font-medium'
              }`}
            >
              Início
            </span>
            {currentTab === 'dashboard' && (
              <span className="absolute bottom-1 w-4 h-0.5 rounded-full bg-indigo-500 dark:bg-indigo-300" />
            )}
          </button>

          {/* 2. Agenda */}
          <button
            type="button"
            onClick={() => handleTabClick('agenda')}
            aria-current={currentTab === 'agenda' ? 'page' : undefined}
            className={`relative flex flex-col items-center justify-center h-12 rounded-2xl select-none transition-all duration-150 active:scale-95 cursor-pointer ${
              currentTab === 'agenda'
                ? 'bg-indigo-100/85 dark:bg-indigo-950/65 text-indigo-700 dark:text-indigo-300'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <div className="relative">
              <CalendarDays className="w-[18px] h-[18px]" />
              {pendingToday > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-indigo-600 dark:bg-indigo-400 text-white dark:text-zinc-950 text-[9px] font-bold font-mono tabular-nums min-w-[15px] h-[15px] px-1 rounded-full flex items-center justify-center shadow-xs">
                  {pendingToday}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] mt-1 leading-none tracking-tight whitespace-nowrap ${
                currentTab === 'agenda' ? 'font-bold' : 'font-medium'
              }`}
            >
              Agenda
            </span>
            {currentTab === 'agenda' && (
              <span className="absolute bottom-1 w-4 h-0.5 rounded-full bg-indigo-500 dark:bg-indigo-300" />
            )}
          </button>

          {/* 3. Ação Rápida Integrada (+) */}
          <div className="flex items-center justify-center h-12">
            <button
              type="button"
              onClick={handleQuickButtonClick}
              aria-label={isQuickMenuOpen ? 'Fechar ações rápidas' : 'Abrir ações rápidas'}
              aria-expanded={isQuickMenuOpen}
              className={`w-11 h-10 rounded-2xl flex items-center justify-center shadow-md transition-all duration-150 active:scale-95 cursor-pointer ${
                isQuickMenuOpen
                  ? 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-950 rotate-45'
                  : 'bg-gradient-to-br from-[#DC7B62] to-[#BE6272] dark:from-[#F2A68E] dark:to-[#E69BA7] text-white dark:text-[#24120E] shadow-indigo-600/25'
              }`}
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* 4. Finanças */}
          <button
            type="button"
            onClick={() => handleTabClick('financas')}
            aria-current={currentTab === 'financas' ? 'page' : undefined}
            className={`relative flex flex-col items-center justify-center h-12 rounded-2xl select-none transition-all duration-150 active:scale-95 cursor-pointer ${
              currentTab === 'financas'
                ? 'bg-violet-100/85 dark:bg-violet-950/65 text-violet-700 dark:text-violet-300'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <CircleDollarSign className="w-[18px] h-[18px]" />
            <span
              className={`text-[10px] mt-1 leading-none tracking-tight whitespace-nowrap ${
                currentTab === 'financas' ? 'font-bold' : 'font-medium'
              }`}
            >
              Finanças
            </span>
            {currentTab === 'financas' && (
              <span className="absolute bottom-1 w-4 h-0.5 rounded-full bg-violet-500 dark:bg-violet-300" />
            )}
          </button>

          {/* 5. Ajustes */}
          <button
            type="button"
            onClick={() => handleTabClick('configuracoes')}
            aria-current={currentTab === 'configuracoes' ? 'page' : undefined}
            className={`relative flex flex-col items-center justify-center h-12 rounded-2xl select-none transition-all duration-150 active:scale-95 cursor-pointer ${
              currentTab === 'configuracoes'
                ? 'bg-indigo-100/85 dark:bg-indigo-950/65 text-indigo-700 dark:text-indigo-300'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <div className="relative">
              <Sliders className="w-[18px] h-[18px]" />
              {driveSyncInfo.status === 'cloud_newer' && (
                <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </div>
            <span
              className={`text-[10px] mt-1 leading-none tracking-tight whitespace-nowrap ${
                currentTab === 'configuracoes' ? 'font-bold' : 'font-medium'
              }`}
            >
              Ajustes
            </span>
            {currentTab === 'configuracoes' && (
              <span className="absolute bottom-1 w-4 h-0.5 rounded-full bg-indigo-500 dark:bg-indigo-300" />
            )}
          </button>
        </div>
      </nav>
    </div>
  );
};
