import React, { useEffect, useState, useRef } from 'react';
import {
  Bell,
  CheckCircle2,
  Cloud,
  CloudCheck,
  CloudOff,
  Cpu,
  Download,
  LogOut,
  Moon,
  Package,
  RefreshCw,
  Sliders,
  Sparkles,
  Sun,
  Upload,
  User as UserIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { hapticSuccess } from '../../services/hapticsService';
import {
  checkForGitHubUpdates,
  CURRENT_APP_VERSION,
  DEFAULT_GITHUB_REPO,
  getStoredGitHubConfig,
  refreshAppCache,
  UpdateCheckResult,
} from '../../services/githubUpdateService';

interface SettingsViewProps {
  openSyncModal: () => void;
  openNotificationCenter: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  openSyncModal,
  openNotificationCenter,
}) => {
  const {
    theme,
    toggleTheme,
    userName,
    setUserName,
    user,
    signInWithGoogle,
    signOut,
    driveSyncInfo,
    syncToDriveNow,
    tasks,
    transactions,
    financialGoals,
    draftNotes,
    exportBackupJson,
    importBackupJson,
    notificationPermission,
    confirmDestructiveAction,
  } = useApp();

  // Profile name editor
  const [nameDraft, setNameDraft] = useState(userName || '');
  const [nameSavedFeedback, setNameSavedFeedback] = useState(false);

  // Update check state
  const [isChecking, setIsChecking] = useState(false);
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  // File input for JSON backup import
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameDraft(userName || '');
  }, [userName]);

  // Load initial settings
  useEffect(() => {
    const config = getStoredGitHubConfig();
    setUpdateResult(config.lastResult);

    if (config.autoCheck && !config.lastResult) {
      handleCheckUpdates();
    }
  }, []);

  const handleCheckUpdates = async () => {
    setIsChecking(true);
    try {
      const result = await checkForGitHubUpdates(DEFAULT_GITHUB_REPO, undefined, CURRENT_APP_VERSION);
      setUpdateResult(result);
    } catch (err: any) {
      console.warn('Falha ao verificar atualizações:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleHardRefresh = () => {
    confirmDestructiveAction({
      title: 'Recarregar aplicativo?',
      message: 'Deseja recarregar o aplicativo para buscar as últimas atualizações salvas?',
      confirmText: 'Recarregar',
      isDestructive: false,
      onConfirm: async () => {
        setIsRefreshingCache(true);
        await refreshAppCache();
      },
    });
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameDraft.trim()) return;
    setUserName(nameDraft.trim());
    hapticSuccess();
    setNameSavedFeedback(true);
    setTimeout(() => setNameSavedFeedback(false), 2500);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await syncToDriveNow();
    } catch (e) {
      // already handled in context
    } finally {
      setIsSyncing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sliders className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  Ajustes & Preferências
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900">
                  {CURRENT_APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Personalize sua experiência, gerencie backups e sincronize seus dados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCheckUpdates}
              disabled={isChecking}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Verificando...' : 'Buscar Atualizações'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card 0: Perfil do Usuário */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Seu Perfil</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Nome exibido nas boas-vindas e no aplicativo
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveName} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Digite seu nome"
            className="flex-1 min-h-[44px] px-4 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <button
            type="submit"
            disabled={!nameDraft.trim()}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            {nameSavedFeedback ? 'Nome salvo!' : 'Salvar Nome'}
          </button>
        </form>
      </div>

      {/* Card 1: Conta & Google Drive */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Sincronização em Nuvem (Google Drive)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Seus dados salvos com total privacidade na sua própria conta do Google
              </p>
            </div>
          </div>

          <button
            onClick={openSyncModal}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-900"
          >
            Abrir Central
          </button>
        </div>

        {/* User Status */}
        {user ? (
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Usuário'}
                  className="w-12 h-12 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-lg">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {user.displayName || 'Usuário'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CloudCheck className="w-3 h-3" />
                    Conectado
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                {driveSyncInfo.lastSyncedAt && (
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Última sincronização: {new Date(driveSyncInfo.lastSyncedAt).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Salvando...' : 'Salvar no Drive'}</span>
              </button>
              <button
                onClick={signOut}
                title="Desconectar conta Google"
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-rose-500 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-500">
                <CloudOff className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Modo Offline Ativo
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Conecte sua conta Google para sincronizar automaticamente entre seus aparelhos.
                </p>
              </div>
            </div>

            <button
              onClick={signInWithGoogle}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer shrink-0"
            >
              Conectar com Google
            </button>
          </div>
        )}
      </div>

      {/* Card 2: Preferências do Sistema */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
        <div className="border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Aparência & Notificações
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Ajustes de visualização e alertas visuais de tarefas
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Theme setting */}
          <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  Aparência
                </span>
                <span className="text-[11px] text-zinc-500 capitalize">
                  {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                </span>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Alternar
            </button>
          </div>

          {/* Notifications setting */}
          <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  Lembretes & Alertas
                </span>
                <span className="text-[11px] text-zinc-500">
                  {notificationPermission === 'granted' ? 'Alertas Ativos' : 'Desativadas'}
                </span>
              </div>
            </div>

            <button
              onClick={openNotificationCenter}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              Ver Alertas
            </button>
          </div>

          {/* AI Gemini Status */}
          <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  Leitor de Recibos IA
                </span>
                <span className="text-[11px] text-zinc-500">
                  OCR Automático
                </span>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
              Ativo
            </span>
          </div>
        </div>
      </div>

      {/* Card 3: Cópia de Segurança Local (JSON) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
        <div className="border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Cópia de Segurança Local
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Exporte ou importe seus dados a qualquer momento em arquivo JSON
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Tarefas
            </span>
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {tasks.length}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Transações
            </span>
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {transactions.length}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Metas & Notas
            </span>
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {financialGoals.length + draftNotes.length}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Privacidade
            </span>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              Controle total dos seus dados
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            onClick={exportBackupJson}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Fazer Download do Backup (JSON)</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>Restaurar de Arquivo JSON</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => {
                const content = ev.target?.result as string;
                if (content && importBackupJson(content)) {
                  setBackupMessage('Backup importado com sucesso.');
                } else {
                  setBackupMessage('Arquivo de backup inválido.');
                }
                setTimeout(() => setBackupMessage(null), 4000);
              };
              reader.readAsText(file);
              e.target.value = '';
            }}
            className="hidden"
          />
        </div>
        {backupMessage && (
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{backupMessage}</p>
        )}
      </div>

      {/* Card 4: Versão & Atualizações do App */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Versão & Atualizações
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Mantenha seu VidaOrganizada sempre em dia
              </p>
            </div>
          </div>

          <span className="text-xs font-bold font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
            {CURRENT_APP_VERSION}
          </span>
        </div>

        {/* Update Status Banner */}
        {updateResult?.hasUpdate ? (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200 dark:border-indigo-800/80 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Nova versão disponível: {updateResult.latestVersion}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Uma nova versão do VidaOrganizada está disponível para download.
            </p>

            <div className="pt-1">
              {updateResult.apkAsset ? (
                <a
                  href={updateResult.apkAsset.browser_download_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Atualização ({formatFileSize(updateResult.apkAsset.size)})</span>
                </a>
              ) : updateResult.latestRelease?.html_url ? (
                <a
                  href={updateResult.latestRelease.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Ver Download da Nova Versão</span>
                </a>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Seu aplicativo está atualizado ({CURRENT_APP_VERSION})
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Nenhuma atualização pendente no momento.
                </p>
              </div>
            </div>

            <button
              onClick={handleHardRefresh}
              disabled={isRefreshingCache}
              className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingCache ? 'animate-spin' : ''}`} />
              <span>Recarregar aplicativo</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
