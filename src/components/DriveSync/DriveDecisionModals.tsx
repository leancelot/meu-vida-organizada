import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudDownload,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../context/BackNavigationContext';
import { hapticImpactLight, hapticSelection, hapticWarning } from '../../services/hapticsService';

function formatCountSummary(counts: {
  tasksCount: number;
  transactionsCount: number;
  goalsCount: number;
  notesCount: number;
}): string {
  const parts: string[] = [];
  if (counts.tasksCount > 0) parts.push(`${counts.tasksCount} tarefa(s)`);
  if (counts.transactionsCount > 0) parts.push(`${counts.transactionsCount} lançamento(s)`);
  if (counts.goalsCount > 0) parts.push(`${counts.goalsCount} meta(s)`);
  if (counts.notesCount > 0) parts.push(`${counts.notesCount} rascunho(s)`);
  return parts.length > 0 ? parts.join(' · ') : 'Nenhum registro salvo';
}

export const DriveRestorePromptModal: React.FC = () => {
  const {
    pendingDriveRestore,
    acceptPendingDriveRestore,
    dismissPendingDriveRestore,
    openStartFromScratchModal,
    tasks,
    transactions,
    financialGoals,
    draftNotes,
  } = useApp();

  useBackHandler(Boolean(pendingDriveRestore), () => {
    dismissPendingDriveRestore();
    return true;
  });

  if (!pendingDriveRestore) return null;

  const { driveFile, remoteSummary } = pendingDriveRestore;
  const remoteDate = driveFile.modifiedTime || remoteSummary.lastUpdated;
  const formattedRemoteDate = remoteDate
    ? new Date(remoteDate).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Data desconhecida';

  const localCounts = {
    tasksCount: tasks.length,
    transactionsCount: transactions.length,
    goalsCount: financialGoals.length,
    notesCount: draftNotes.length,
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          hapticSelection();
          dismissPendingDriveRestore();
        }
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-backdrop-in keyboard-modal-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drive-restore-title"
        className="w-full sm:max-w-lg bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:pb-7 keyboard-modal-sheet overflow-y-auto relative animate-bottom-sheet"
      >
        <div className="sm:hidden w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mb-3 shrink-0" />
        <button
          type="button"
          onClick={() => {
            hapticSelection();
            dismissPendingDriveRestore();
          }}
          className="pressable absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3.5 pr-10">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <CloudDownload className="w-5 h-5" />
          </div>
          <div>
            <h3
              id="drive-restore-title"
              className="text-lg font-bold text-zinc-900 dark:text-zinc-100 text-balance"
            >
              Backup encontrado no Google Drive
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Você já possui registros neste aparelho e também há uma cópia salva na sua conta Google. Como deseja continuar?
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/25 border border-indigo-200/80 dark:border-indigo-900/60 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                Salvo no Google Drive
              </span>
              <span className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                {formattedRemoteDate}
              </span>
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-200 font-medium tabular-nums">
              {formatCountSummary(remoteSummary)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
              Neste aparelho agora
            </span>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
              {formatCountSummary(localCounts)}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={() => {
              hapticImpactLight();
              acceptPendingDriveRestore();
            }}
            className="pressable w-full min-h-[46px] px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <CloudDownload className="w-4 h-4" />
            <span>Restaurar do Google Drive</span>
          </button>

          <button
            type="button"
            onClick={() => {
              hapticSelection();
              dismissPendingDriveRestore();
            }}
            className="pressable w-full min-h-[44px] px-4 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold cursor-pointer"
          >
            Manter dados deste aparelho
          </button>

          <button
            type="button"
            onClick={() => {
              hapticWarning();
              dismissPendingDriveRestore();
              openStartFromScratchModal();
            }}
            className="pressable w-full min-h-[44px] px-4 py-2 rounded-2xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recomeçar do zero</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const StartFromScratchModal: React.FC = () => {
  const {
    isStartFromScratchOpen,
    closeStartFromScratchModal,
    resetWorkspaceToZero,
    user,
    accessToken,
    driveSyncInfo,
    tasks,
    transactions,
    financialGoals,
    draftNotes,
  } = useApp();

  const [alsoResetCloud, setAlsoResetCloud] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isStartFromScratchOpen) {
      setAlsoResetCloud(false);
      setIsResetting(false);
      setErrorMessage(null);
    }
  }, [isStartFromScratchOpen]);

  useBackHandler(isStartFromScratchOpen, () => {
    if (isResetting) return false;
    closeStartFromScratchModal();
    return true;
  });

  if (!isStartFromScratchOpen) return null;

  const hasCloudConnection = Boolean(user && accessToken);
  const localSummary = formatCountSummary({
    tasksCount: tasks.length,
    transactionsCount: transactions.length,
    goalsCount: financialGoals.length,
    notesCount: draftNotes.length,
  });

  const handleConfirmReset = async () => {
    setIsResetting(true);
    setErrorMessage(null);
    try {
      await resetWorkspaceToZero({ alsoResetCloud });
      closeStartFromScratchModal();
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Não foi possível concluir a limpeza agora. Tente novamente.'
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isResetting) {
          hapticSelection();
          closeStartFromScratchModal();
        }
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-backdrop-in keyboard-modal-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-scratch-title"
        className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:pb-6 keyboard-modal-sheet overflow-y-auto relative animate-bottom-sheet"
      >
        <div className="sm:hidden w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mb-3 shrink-0" />
        <button
          type="button"
          onClick={closeStartFromScratchModal}
          disabled={isResetting}
          className="pressable absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3.5 pr-10">
          <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3
              id="reset-scratch-title"
              className="text-lg font-bold text-zinc-900 dark:text-zinc-100 text-balance"
            >
              Recomeçar do zero?
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Todos os registros salvos neste aparelho serão apagados e o aplicativo voltará para a tela inicial de configuração.
            </p>
          </div>
        </div>

        <div className="mt-4 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-1 text-xs">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
            Dados atuais no aparelho
          </span>
          <span className="text-zinc-600 dark:text-zinc-400 block tabular-nums">
            {localSummary}
          </span>
        </div>

        {hasCloudConnection && (
          <div className="mt-3 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2.5">
            <div className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                {alsoResetCloud
                  ? 'Atenção: o arquivo salvo no Google Drive também será substituído por um estado vazio.'
                  : driveSyncInfo.fileId || driveSyncInfo.remoteModifiedAt
                  ? 'Seu backup antigo no Google Drive permanecerá salvo e intacto.'
                  : 'Nenhum dado será apagado da sua conta Google.'}
              </span>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1 border-t border-zinc-100 dark:border-zinc-800">
              <input
                type="checkbox"
                checked={alsoResetCloud}
                onChange={(e) => {
                  hapticSelection();
                  setAlsoResetCloud(e.target.checked);
                }}
                disabled={isResetting}
                className="mt-0.5 w-4 h-4 rounded text-rose-600 cursor-pointer"
              />
              <span className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug">
                Também iniciar um novo backup limpo no Google Drive (substitui o backup salvo na nuvem)
              </span>
            </label>
          </div>
        )}

        {errorMessage && (
          <p className="mt-3 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl px-3 py-2">
            {errorMessage}
          </p>
        )}

        <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              hapticSelection();
              closeStartFromScratchModal();
            }}
            disabled={isResetting}
            className="pressable min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmReset}
            disabled={isResetting}
            className="pressable min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isResetting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Limpando...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Recomeçar do zero</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AutoRestoredDriveBanner: React.FC = () => {
  const {
    autoRestoredNotice,
    dismissAutoRestoredNotice,
    openStartFromScratchModal,
  } = useApp();

  if (!autoRestoredNotice) return null;

  const { summary } = autoRestoredNotice;

  return (
    <div className="fixed top-[calc(max(env(safe-area-inset-top,0px),var(--safe-area-inset-top,0px))+0.75rem)] left-1/2 -translate-x-1/2 z-50 w-[min(calc(100vw-1.5rem),28rem)] animate-sheet-up">
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-emerald-200 dark:border-emerald-900/70 rounded-2xl shadow-xl p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Dados restaurados do Google Drive
              </p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 tabular-nums">
                {formatCountSummary(summary)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              hapticSelection();
              dismissAutoRestoredNotice();
            }}
            aria-label="Fechar aviso"
            className="pressable p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>Conta sincronizada</span>
          </span>
          <button
            type="button"
            onClick={() => {
              hapticWarning();
              dismissAutoRestoredNotice();
              openStartFromScratchModal();
            }}
            className="pressable min-h-[36px] px-3 py-1 rounded-xl text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Prefiro recomeçar do zero</span>
          </button>
        </div>
      </div>
    </div>
  );
};
