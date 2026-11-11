import React from 'react';
import {
  Bell,
  CloudAlert,
  CloudCheck,
  CloudOff,
  LayoutGrid,
  LogOut,
  Moon,
  RefreshCw,
  Smartphone,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openSyncModal: () => void;
  openNotificationCenter: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  openSyncModal,
  openNotificationCenter,
}) => {
  const {
    theme,
    toggleTheme,
    user,
    isAuthenticating,
    signInWithGoogle,
    signOut,
    driveSyncInfo,
    notificationsList,
  } = useApp();

  const todayStr = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const capitalizedToday = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);
  const unreadCount = notificationsList.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Current Date */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
                  VidaOrganizada
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                  Google Sync
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize hidden sm:block">
                {capitalizedToday}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Início
            </button>
            <button
              onClick={() => setCurrentTab('tarefas')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                currentTab === 'tarefas'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Tarefas
            </button>
            <button
              onClick={() => setCurrentTab('financas')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                currentTab === 'financas'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Finanças
            </button>
            <button
              onClick={() => setCurrentTab('agenda')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                currentTab === 'agenda'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Agenda
            </button>
            <button
              onClick={() => setCurrentTab('configuracoes')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                currentTab === 'configuracoes'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Ajustes
            </button>
          </nav>

          {/* Right actions: Theme Toggle, Notifications, Cloud Sync, Google Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Theme Toggle (Dark / Light) */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Mudar para tema Claro' : 'Mudar para tema Escuro'}
              className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-600" />
              )}
            </button>

            {/* Notification Center Trigger */}
            <button
              onClick={openNotificationCenter}
              title="Central de Notificações & Lembretes"
              className="relative p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Cloud Sync Status Indicator - Desktop only */}
            <button
              onClick={openSyncModal}
              title="Gerenciar sincronização com Google Drive"
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                driveSyncInfo.status === 'syncing'
                  ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                  : driveSyncInfo.status === 'cloud_newer'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 animate-pulse'
                  : user
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
              }`}
            >
              {driveSyncInfo.status === 'syncing' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
                  <span className="hidden lg:inline">Sincronizando...</span>
                </>
              ) : driveSyncInfo.status === 'cloud_newer' ? (
                <>
                  <CloudAlert className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden lg:inline">Nuvem atualizada</span>
                </>
              ) : user ? (
                <>
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden lg:inline">Drive Conectado</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden lg:inline">Nuvem Desconectada</span>
                </>
              )}
            </button>

            {/* Google Account Profile or Sign In Button */}
            {user ? (
              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 rounded-xl p-1 sm:pr-3">
                <button
                  onClick={openSyncModal}
                  title="Ver status da conta"
                  className="cursor-pointer"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Usuário'}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </button>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[120px]">
                    {user.displayName || 'Usuário'}
                  </p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-[120px]">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={signOut}
                  title="Sair da conta Google"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                disabled={isAuthenticating}
                className="gsi-material-button inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 text-xs font-medium shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  viewBox="0 0 48 48"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
                <span className="hidden sm:inline">{isAuthenticating ? 'Conectando...' : 'Conectar Google'}</span>
                <span className="sm:hidden text-[11px] font-semibold">{isAuthenticating ? '...' : 'Entrar'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
