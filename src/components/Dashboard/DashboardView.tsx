import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Edit2,
  Eye,
  EyeOff,
  FolderGit2,
  LayoutGrid,
  Palette,
  Pin,
  Plus,
  Sliders,
  Sparkles,
  StickyNote,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DraftNote } from '../../types';

interface DashboardViewProps {
  setCurrentTab: (tab: string) => void;
}

const POSTIT_COLORS = [
  { label: 'Amarelo', hex: '#fef08a', textDark: true },
  { label: 'Verde', hex: '#bbf7d0', textDark: true },
  { label: 'Azul', hex: '#bae6fd', textDark: true },
  { label: 'Lavanda', hex: '#e9d5ff', textDark: true },
  { label: 'Pêssego', hex: '#fed7aa', textDark: true },
  { label: 'Cinza', hex: '#f4f4f5', textDark: true },
];

export const DashboardView: React.FC<DashboardViewProps> = ({ setCurrentTab }) => {
  const {
    tasks,
    toggleTaskCompletion,
    transactions,
    calendarEvents,
    draftNotes,
    addDraftNote,
    updateDraftNote,
    deleteDraftNote,
    togglePinDraft,
    addTask,
    dashboardWidgets,
    toggleDashboardWidget,
    notificationPermission,
    enableNotifications,
    triggerTestNotification,
    notificationsList,
    dismissNotification,
    clearAllNotifications,
  } = useApp();

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [newDraftTitle, setNewDraftTitle] = useState('');
  const [newDraftContent, setNewDraftContent] = useState('');
  const [newDraftColor, setNewDraftColor] = useState('#fef08a');
  const [isNewDraftOpen, setIsNewDraftOpen] = useState(false);
  const [activeEditingDraftId, setActiveEditingDraftId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Daily task metrics
  const todayTasks = tasks.filter((t) => t.dueDate === todayStr);
  const pendingTodayTasks = todayTasks.filter((t) => !t.completed);

  // Financial metrics for current month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyTx = transactions.filter((tx) => {
    const d = new Date(tx.date + 'T00:00:00');
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalIncome = monthlyTx
    .filter((tx) => tx.type === 'receita')
    .reduce((s, tx) => s + tx.amount, 0);
  const totalExpense = monthlyTx
    .filter((tx) => tx.type === 'despesa')
    .reduce((s, tx) => s + tx.amount, 0);
  const balance = totalIncome - totalExpense;

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const handleCreateDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDraftTitle.trim() && !newDraftContent.trim()) return;

    addDraftNote({
      title: newDraftTitle.trim() || 'Rascunho sem título',
      content: newDraftContent.trim(),
      color: newDraftColor,
      isPinned: false,
    });

    setNewDraftTitle('');
    setNewDraftContent('');
    setNewDraftColor('#fef08a');
    setIsNewDraftOpen(false);
  };

  const convertDraftToTask = (draft: DraftNote) => {
    addTask({
      title: draft.title || 'Tarefa do Rascunho',
      description: draft.content,
      dueDate: todayStr,
      priority: 'medium',
      category: 'pessoal',
      completed: false,
      subtasks: [],
    });
    alert(`Rascunho "${draft.title}" convertido em tarefa para hoje com sucesso!`);
  };

  const isWidgetVisible = (id: string) => dashboardWidgets.includes(id);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner with Customization Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Dashboard Modular
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Personalizável
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Visão geral interativa: configure seus módulos e anote rascunhos ao vivo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {notificationPermission !== 'granted' ? (
            <button
              onClick={enableNotifications}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer animate-pulse"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Ativar Notificações</span>
            </button>
          ) : (
            <button
              onClick={triggerTestNotification}
              title="Testar notificação visual silenciosa"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-xs font-medium border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-indigo-500" />
              <span>Testar Notificação</span>
            </button>
          )}

          <button
            onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isCustomizeOpen
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isCustomizeOpen ? 'Fechar Módulos' : 'Personalizar Módulos'}</span>
          </button>

          <button
            onClick={() => setCurrentTab('configuracoes')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-200 dark:border-indigo-900 transition-colors cursor-pointer"
            title="Verificar atualizações do app no GitHub e configurações"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Atualizações & Ajustes</span>
          </button>
        </div>
      </div>

      {/* Modular Widgets Customizer Panel */}
      {isCustomizeOpen && (
        <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 rounded-3xl p-5 animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
              Escolha quais módulos deseja exibir no seu Dashboard:
            </span>
            <span className="text-xs text-zinc-500">Clique para ativar/ocultar</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'reminders', label: 'Central de Lembretes & Notificações' },
              { id: 'tasks', label: 'Tarefas de Hoje' },
              { id: 'schedule', label: 'Próximos Compromissos (Agenda)' },
              { id: 'scratchpad', label: 'Bloco de Rascunhos & Post-its' },
              { id: 'finance', label: 'Resumo Financeiro' },
            ].map((widget) => {
              const active = isWidgetVisible(widget.id);
              return (
                <button
                  key={widget.id}
                  onClick={() => toggleDashboardWidget(widget.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{widget.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* GRID OF MODULAR WIDGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* WIDGET 1: Central de Lembretes & Notificações Web Silenciosas */}
        {isWidgetVisible('reminders') && (
          <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Lembretes Ativos & Notificações Visuais
                </h3>
                <span className="text-xs text-zinc-400">
                  ({notificationsList.length} alertas silenciosos recentes)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {notificationsList.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-xs text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    Limpar todos
                  </button>
                )}
                {notificationPermission !== 'granted' && (
                  <button
                    onClick={enableNotifications}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 border border-amber-200 dark:border-amber-800"
                  >
                    Permitir no Navegador
                  </button>
                )}
              </div>
            </div>

            {notificationsList.length === 0 ? (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-850/50 border border-zinc-100 dark:border-zinc-800 text-center text-xs text-zinc-500">
                Nenhum alerta recente. O sistema monitora tarefas com horários e compromissos da agenda e emitirá notificações visuais silenciosas automaticamente.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {notificationsList.slice(0, 6).map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-xs flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {notif.title}
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-400 text-[11px] mt-0.5">
                        {notif.body}
                      </p>
                      <span className="text-[10px] text-zinc-400 mt-1 block">
                        {new Date(notif.timestamp).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <button
                      onClick={() => dismissNotification(notif.id)}
                      className="text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WIDGET 2: Tarefas de Hoje */}
        {isWidgetVisible('tasks') && (
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Tarefas de Hoje
                </h3>
                <span className="text-xs text-zinc-400">
                  ({pendingTodayTasks.length} pendentes)
                </span>
              </div>
              <button
                onClick={() => setCurrentTab('tarefas')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Ver todas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayTasks.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 space-y-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <p className="text-xs font-medium">Nenhuma tarefa marcada para hoje.</p>
                <button
                  onClick={() => setCurrentTab('tarefas')}
                  className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                >
                  + Adicionar tarefa
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => toggleTaskCompletion(t.id)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all cursor-pointer ${
                          t.completed
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-zinc-300 dark:border-zinc-700 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                      <div className="min-w-0">
                        <p
                          className={`text-xs sm:text-sm font-semibold truncate ${
                            t.completed
                              ? 'line-through text-zinc-400'
                              : 'text-zinc-900 dark:text-zinc-100'
                          }`}
                        >
                          {t.title}
                        </p>
                        {t.dueTime && (
                          <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                            <Clock className="w-3 h-3 text-indigo-500" />
                            <span>{t.dueTime}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        t.priority === 'high'
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : t.priority === 'medium'
                          ? 'bg-amber-50 text-amber-600 border border-amber-200'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {t.priority === 'high' ? 'Alta' : t.priority === 'medium' ? 'Média' : 'Baixa'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WIDGET 3: Resumo Financeiro */}
        {isWidgetVisible('finance') && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Finanças do Mês
                </h3>
              </div>
              <button
                onClick={() => setCurrentTab('financas')}
                className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Painel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase">
                  Saldo Líquido Atual
                </span>
                <div
                  className={`text-xl font-bold tracking-tight mt-0.5 ${
                    balance >= 0 ? 'text-zinc-900 dark:text-zinc-100' : 'text-rose-600'
                  }`}
                >
                  {formatBRL(balance)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <span className="text-zinc-500 block">Receitas</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    {formatBRL(totalIncome)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                  <span className="text-zinc-500 block">Despesas</span>
                  <span className="font-bold text-rose-600 text-sm">
                    {formatBRL(totalExpense)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WIDGET 4: Próximos Compromissos da Agenda */}
        {isWidgetVisible('schedule') && (
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Google Agenda
                </h3>
              </div>
              <button
                onClick={() => setCurrentTab('agenda')}
                className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Ver agenda</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {calendarEvents.length === 0 ? (
              <div className="p-6 text-center text-zinc-400 space-y-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <p className="text-xs">Nenhum evento agendado para os próximos dias.</p>
                <button
                  onClick={() => setCurrentTab('agenda')}
                  className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                >
                  + Agendar compromisso
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {calendarEvents.slice(0, 4).map((ev) => {
                  const startTime = ev.start?.dateTime
                    ? new Date(ev.start.dateTime).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Dia todo';

                  const dateFormatted = ev.start?.dateTime
                    ? new Date(ev.start.dateTime).toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : ev.start?.date || '';

                  return (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-zinc-900 dark:text-zinc-100">
                        <span className="truncate pr-2">{ev.summary}</span>
                        <span className="text-indigo-600 dark:text-indigo-400 shrink-0">
                          {startTime}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 mt-0.5 block">
                        {dateFormatted} {ev.location ? `• ${ev.location}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* WIDGET 5: Bloco de Rascunhos / Post-its Coloridos */}
        {isWidgetVisible('scratchpad') && (
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Bloco de Rascunhos & Post-its
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Modifique livremente suas ideias com cores de destaque e converta em tarefas
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsNewDraftOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Post-it</span>
              </button>
            </div>

            {/* Quick Drafts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {draftNotes.map((draft) => {
                const isEditing = activeEditingDraftId === draft.id;
                const noteColor = draft.color || '#fef08a';

                return (
                  <div
                    key={draft.id}
                    style={{ backgroundColor: noteColor }}
                    className="p-4 rounded-2xl border border-black/10 text-zinc-900 shadow-xs flex flex-col justify-between group transition-transform hover:scale-[1.01] relative"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={draft.title}
                            onChange={(e) => updateDraftNote(draft.id, { title: e.target.value })}
                            className="text-xs font-bold w-full bg-white/80 px-2 py-1 rounded border border-zinc-300 text-zinc-900 focus:outline-none"
                          />
                        ) : (
                          <h4 className="text-xs font-bold text-zinc-900 truncate">
                            {draft.title}
                          </h4>
                        )}

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Color Switcher */}
                          <div className="relative group/color">
                            <button
                              title="Mudar cor do post-it"
                              className="p-1 rounded opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-900 cursor-pointer"
                            >
                              <Palette className="w-3 h-3" />
                            </button>
                            <div className="absolute right-0 top-6 hidden group-hover/color:flex bg-white dark:bg-zinc-800 p-1.5 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 gap-1 z-30">
                              {POSTIT_COLORS.map((c) => (
                                <button
                                  key={c.hex}
                                  type="button"
                                  onClick={() => updateDraftNote(draft.id, { color: c.hex })}
                                  className="w-4 h-4 rounded-full border border-black/20 cursor-pointer hover:scale-125 transition-transform"
                                  style={{ backgroundColor: c.hex }}
                                />
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => togglePinDraft(draft.id)}
                            title={draft.isPinned ? 'Desafixar' : 'Fixar'}
                            className={`p-1 rounded cursor-pointer ${
                              draft.isPinned
                                ? 'text-amber-800 font-bold'
                                : 'text-zinc-500 opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setActiveEditingDraftId(isEditing ? null : draft.id)}
                            title="Editar texto"
                            className="text-zinc-500 hover:text-zinc-900 p-1 opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteDraftNote(draft.id)}
                            title="Excluir rascunho"
                            className="text-zinc-500 hover:text-rose-600 p-1 opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <textarea
                          rows={4}
                          value={draft.content}
                          onChange={(e) => updateDraftNote(draft.id, { content: e.target.value })}
                          className="w-full text-xs bg-white/90 p-2 rounded-xl border border-zinc-300 text-zinc-900 resize-none focus:outline-none"
                        />
                      ) : (
                        <p className="text-xs text-zinc-800 whitespace-pre-wrap leading-relaxed line-clamp-4 font-normal">
                          {draft.content || '(Vazio)'}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-black/10 flex items-center justify-between text-[10px] text-zinc-600">
                      <span>
                        {new Date(draft.updatedAt).toLocaleDateString('pt-BR')}
                      </span>
                      <button
                        onClick={() => convertDraftToTask(draft)}
                        className="font-bold text-zinc-900 hover:underline cursor-pointer"
                      >
                        + Criar Tarefa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* New Draft Modal */}
      {isNewDraftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Novo Post-it / Rascunho
              </h3>
              <button
                onClick={() => setIsNewDraftOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDraft} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Título
                </label>
                <input
                  type="text"
                  placeholder="Ex: Ideias para o projeto, Lista de compras..."
                  value={newDraftTitle}
                  onChange={(e) => setNewDraftTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Conteúdo do Post-it
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Digite seus pensamentos ou rascunhos livremente..."
                  value={newDraftContent}
                  onChange={(e) => setNewDraftContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Cor do Post-it
                </label>
                <div className="flex items-center gap-2">
                  {POSTIT_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setNewDraftColor(c.hex)}
                      className={`w-7 h-7 rounded-full border border-black/20 cursor-pointer transition-transform ${
                        newDraftColor === c.hex ? 'scale-125 ring-2 ring-indigo-500' : ''
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewDraftOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                >
                  Salvar Post-it
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
