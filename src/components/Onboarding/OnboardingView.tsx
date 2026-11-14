import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Moon, Sparkles, Sun, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { hapticImpactLight, hapticSelection } from '../../services/hapticsService';

export const OnboardingView: React.FC = () => {
  const {
    theme,
    setThemeMode,
    user,
    userName,
    isAuthenticating,
    signInWithGoogle,
    completeOnboarding,
  } = useApp();

  const [nameInput, setNameInput] = useState(userName || '');

  useEffect(() => {
    if (!nameInput.trim() && user?.displayName) {
      setNameInput(user.displayName.split(' ')[0]);
    }
  }, [user?.displayName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    completeOnboarding(nameInput.trim());
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex items-center justify-center px-4 pt-[calc(max(env(safe-area-inset-top,0px),var(--safe-area-inset-top,0px))+2rem)] pb-[calc(max(env(safe-area-inset-bottom,0px),var(--safe-area-inset-bottom,0px))+2rem)] transition-colors">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-7">
        {/* Marca & Boas-vindas */}
        <header className="space-y-3">
          <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              VidaOrganizada
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
            Configure seu espaço pessoal
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Personalize como você prefere usar o aplicativo. Você poderá alterar tudo depois nos ajustes.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Nome do Usuário */}
          <div className="space-y-2">
            <label
              htmlFor="onboarding-name"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Como gostaria de ser chamado? *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="onboarding-name"
                type="text"
                required
                autoComplete="name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Digite seu nome"
                className="w-full h-12 pl-10 pr-4 text-sm rounded-2xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
          </div>

          {/* 2. Tema Visual */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Tema visual
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  hapticSelection();
                  setThemeMode('light');
                }}
                className={`min-h-[56px] p-3.5 rounded-2xl border flex items-center justify-between transition-colors cursor-pointer ${
                  theme === 'light'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <span className="flex items-center gap-2.5 text-sm font-semibold">
                  <Sun className="w-4 h-4 text-amber-500" />
                  Claro
                </span>
                {theme === 'light' && <Check className="w-4 h-4 text-indigo-600" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  hapticSelection();
                  setThemeMode('dark');
                }}
                className={`min-h-[56px] p-3.5 rounded-2xl border flex items-center justify-between transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <span className="flex items-center gap-2.5 text-sm font-semibold">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  Escuro
                </span>
                {theme === 'dark' && <Check className="w-4 h-4 text-indigo-400" />}
              </button>
            </div>
          </div>

          {/* 3. Conta Google (Opcional) */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Sincronização com Google (Opcional)
            </span>

            {user ? (
              <div className="p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Conta Google'}
                      className="w-9 h-9 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {(user.displayName || user.email || 'G')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {user.displayName || 'Conta conectada'}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                  Conectado
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  hapticImpactLight();
                  signInWithGoogle();
                }}
                disabled={isAuthenticating}
                className="w-full min-h-[48px] px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer disabled:opacity-60"
              >
                <div className="flex items-center gap-3 min-w-0">
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
                  </svg>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                      {isAuthenticating ? 'Conectando...' : 'Conectar conta Google'}
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block truncate">
                      Para backup no Drive e Google Agenda
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
                  Conectar
                </span>
              </button>
            )}
          </div>

          {/* Botão Primário */}
          <button
            type="submit"
            disabled={!nameInput.trim()}
            className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>Começar a usar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
