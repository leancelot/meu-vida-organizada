import React from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    notificationsList,
    notificationPermission,
    enableNotifications,
    triggerTestNotification,
    dismissNotification,
    clearAllNotifications,
    tasks,
    calendarEvents,
  } = useApp();

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const dueTodayTasks = tasks.filter((t) => !t.completed && t.dueDate === todayStr);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-7 max-h-[85vh] flex flex-col relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pr-8">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Notificações & Lembretes
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Avisos de tarefas do dia, compromissos e alertas do sistema
            </p>
          </div>
        </div>

        {/* Permission / Status Banner */}
        <div className="p-3.5 mb-4 rounded-2xl border transition-colors flex items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60">
          <div className="flex items-center gap-2.5 min-w-0">
            {notificationPermission === 'granted' ? (
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                <BellOff className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                {notificationPermission === 'granted'
                  ? 'Notificações do Sistema Ativas'
                  : 'Notificações Desativadas'}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block truncate">
                {notificationPermission === 'granted'
                  ? 'Alertas silenciosos visuais no navegador'
                  : 'Autorize para receber lembretes de prazos'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {notificationPermission === 'granted' ? (
              <button
                onClick={triggerTestNotification}
                className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Testar Alerta
              </button>
            ) : (
              <button
                onClick={enableNotifications}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Ativar Agora
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Lembretes de Hoje */}
          {dueTodayTasks.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Vencendo Hoje ({dueTodayTasks.length})</span>
              </span>
              <div className="space-y-1.5">
                {dueTodayTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {t.title}
                      </p>
                      {t.dueTime && (
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                          Horário limite: {t.dueTime}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shadow-xs">
                      Pendente
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histórico de Notificações */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Histórico Recente ({notificationsList.length})
              </span>
              {notificationsList.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-[11px] text-zinc-400 hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Limpar tudo</span>
                </button>
              )}
            </div>

            {notificationsList.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 dark:text-zinc-500 space-y-1">
                <Bell className="w-8 h-8 mx-auto stroke-1 opacity-40 mb-1" />
                <p className="text-xs font-medium">Nenhum alerta recente</p>
                <p className="text-[11px]">Você será avisado quando houver prazos ou novidades.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notificationsList.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/80 flex items-start justify-between gap-3 group"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {notif.title}
                        </span>
                        <span className="text-[9px] text-zinc-400">
                          {new Date(notif.timestamp).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {notif.body}
                      </p>
                    </div>

                    <button
                      onClick={() => dismissNotification(notif.id)}
                      title="Excluir notificação"
                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
