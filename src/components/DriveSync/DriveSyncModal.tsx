import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Cloud,
  CloudCheck,
  CloudDownload,
  CloudOff,
  CloudUpload,
  Download,
  FileJson,
  HelpCircle,
  RefreshCw,
  Smartphone,
  Upload,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface DriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DriveSyncModal: React.FC<DriveSyncModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    user,
    accessToken,
    signInWithGoogle,
    driveSyncInfo,
    syncToDriveNow,
    restoreFromDriveNow,
    exportBackupJson,
    importBackupJson,
    confirmDestructiveAction,
  } = useApp();

  const [isSyncingAction, setIsSyncingAction] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleManualSave = async () => {
    setIsSyncingAction(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await syncToDriveNow();
      setSuccessMessage('Dados salvos com sucesso no seu Google Drive!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao salvar no Google Drive.');
    } finally {
      setIsSyncingAction(false);
    }
  };

  const handleManualRestore = () => {
    confirmDestructiveAction({
      title: 'Restaurar Dados do Google Drive?',
      message:
        'Esta ação substituirá suas tarefas e finanças locais pelos dados armazenados no seu Google Drive.',
      details: [
        `Arquivo na nuvem: VidaOrganizada_Data.json`,
        driveSyncInfo.remoteModifiedAt
          ? `Última modificação na nuvem: ${new Date(driveSyncInfo.remoteModifiedAt).toLocaleString('pt-BR')}`
          : 'Verificando versão mais recente...',
      ],
      confirmText: 'Restaurar do Drive',
      isDestructive: false,
      onConfirm: async () => {
        setIsSyncingAction(true);
        setSuccessMessage(null);
        setErrorMessage(null);
        try {
          await restoreFromDriveNow();
          setSuccessMessage('Dados restaurados com sucesso do seu Google Drive!');
        } catch (err: any) {
          setErrorMessage(err.message || 'Falha ao restaurar dados do Google Drive.');
        } finally {
          setIsSyncingAction(false);
        }
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        confirmDestructiveAction({
          title: 'Importar Arquivo de Backup?',
          message:
            'Deseja carregar este arquivo de backup local? Os dados atuais serão substituídos pelo conteúdo do arquivo.',
          details: [`Arquivo: ${file.name}`, `Tamanho: ${(file.size / 1024).toFixed(1)} KB`],
          confirmText: 'Importar Backup',
          isDestructive: false,
          onConfirm: () => {
            const success = importBackupJson(content);
            if (success) {
              setSuccessMessage('Backup importado com sucesso!');
            } else {
              setErrorMessage('O arquivo de backup é inválido ou está corrompido.');
            }
          },
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Sincronização & Google Drive
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Mantenha seus dados seguros e sincronizados entre computador e celular
            </p>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs font-medium text-rose-800 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Real-time Cross-device Sync Info Banner */}
        <div className="mb-5 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-600 dark:text-zinc-300 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
            <Smartphone className="w-4 h-4 text-indigo-600" />
            <span>Sincronização em Nuvem Privada</span>
          </div>
          <p className="leading-relaxed">
            Seus dados são salvos de forma privada no seu próprio Google Drive. Quando você atualiza suas tarefas ou finanças, suas alterações ficam sincronizadas entre todos os seus dispositivos.
          </p>
        </div>

        {/* Google Account Status */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Conta Google Vinculada
            </span>
            {user ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                <CloudCheck className="w-3.5 h-3.5" />
                Conectado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                <CloudOff className="w-3.5 h-3.5" />
                Desconectado
              </span>
            )}
          </div>

          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Usuário'}
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {user.displayName || 'Usuário'}
                  </p>
                  <p className="text-xs text-zinc-500">{user.email}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-xs space-y-1 text-zinc-500">
                <div className="flex justify-between">
                  <span>Última sincronização local:</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {driveSyncInfo.lastSyncedAt
                      ? new Date(driveSyncInfo.lastSyncedAt).toLocaleString('pt-BR')
                      : 'Ainda não sincronizado nesta sessão'}
                  </span>
                </div>
                {driveSyncInfo.remoteModifiedAt && (
                  <div className="flex justify-between">
                    <span>Versão no Google Drive:</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {new Date(driveSyncInfo.remoteModifiedAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 space-y-3">
              <p className="text-xs text-zinc-500">
                Entre com sua conta Google para habilitar o salvamento em nuvem e a sincronização automática.
              </p>
              <button
                onClick={signInWithGoogle}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
              >
                Conectar com Google
              </button>
            </div>
          )}
        </div>

        {/* Cloud Actions */}
        {user && (
          <div className="space-y-3 mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
              Ações de Sincronização em Nuvem
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleManualSave}
                disabled={isSyncingAction}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all cursor-pointer disabled:opacity-60"
              >
                {isSyncingAction ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudUpload className="w-4 h-4" />
                )}
                <span>Salvar Agora no Drive</span>
              </button>

              <button
                onClick={handleManualRestore}
                disabled={isSyncingAction}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition-all cursor-pointer disabled:opacity-60"
              >
                <CloudDownload className="w-4 h-4 text-indigo-600" />
                <span>Restaurar do Drive</span>
              </button>
            </div>
          </div>
        )}

        {/* Manual File Backup / Restore (Zero Lock-in) */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
            Backup Local (Arquivo JSON)
          </span>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={exportBackupJson}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-zinc-500" />
              <span>Baixar Arquivo de Backup</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-zinc-500" />
              <span>Importar Arquivo JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
