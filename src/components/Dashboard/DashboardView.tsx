import React, { useState } from 'react';
import {
  ArrowRight,
  Bell,
  Calendar,
  Camera,
  CheckCircle2,
  Circle,
  Clock,
  DollarSign,
  Edit2,
  Palette,
  Pin,
  Plus,
  Sparkles,
  StickyNote,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DraftNote, TaskItem } from '../../types';

interface DashboardViewProps {
  setCurrentTab: (tab: string) => void;
}

const POSTIT_COLORS = [
  { label: 'Amarelo', hex: '#fef08a' },
  { label: 'Verde', hex: '#bbf7d0' },
  { label: 'Azul', hex: '#bae6fd' },
  { label: 'Lavanda', hex: '#e9d5ff' },
  { label: 'Pêssego', hex: '#fed7aa' },
];

export const DashboardView: React.FC<DashboardViewProps> = ({ setCurrentTab }) => {
  const {
    tasks,
    toggleTaskCompletion,
    addTask,
    transactions,
    calendarEvents,
    draftNotes,
    addDraftNote,
    updateDraftNote,
    deleteDraftNote,
    togglePinDraft,
    user,
    driveSyncInfo,
  } = useApp();

  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [isNewDraftOpen, setIsNewDraftOpen] = useState(false);
  const [newDraftTitle, setNewDraftTitle] = useState('');
  const [newDraftContent, setNewDraftContent] = useState('');
  const [newDraftColor, setNewDraftColor] = useState('#fef08a');
  const [activeEditingDraftId, setActiveEditingDraftId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Daily task metrics
  const todayTasks = tasks.filter((t) => t.dueDate === todayStr);
  const pendingTodayTasks = todayTasks.filter((t) => !t.completed);
  const completedTodayTasks = todayTasks.filter((t) => t.completed);

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

  // Calendar events for today
  const todayEvents = calendarEvents.filter((event) => {
    if (event.start?.date === todayStr) return true;
    if (event.start?.dateTime && event.start.dateTime.startsWith(todayStr)) return true;
    return false;
  });

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    addTask({
      title: quickTaskTitle.trim(),
      dueDate: todayStr,
      priority: 'medium',
      category: 'pessoal',
      completed: false,
      subtasks: [],
    });
    setQuickTaskTitle('');
  };

  const handleCreateDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDraftTitle.trim() && !newDraftContent.trim()) return;

    addDraftNote({
      title: newDraftTitle.trim() || 'Rascunho Rápido',
      content: newDraftContent.trim(),
      color: newDraftColor,
      isPinned: false,
    });

    setNewDraftTitle('');
    setNewDraftContent('');
    setIsNewDraftOpen(false);
  };

  const convertDraftToTask = (draft: DraftNote) => {
    addTask({
      title: draft.title || 'Tarefa do Post-it',
      description: draft.content,
      dueDate: todayStr,
      priority: 'medium',
      category: 'pessoal',
      completed: false,
      subtasks: [],
    });
    deleteDraftNote(draft.id);
  };

  const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'Organizador';

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* 1. Android Greeting Card */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-indigo-500/15 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-bold tracking-tight">
                Olá, {firstName}! 👋
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur-md text-white">
                Hoje
              </span>
            </div>
            <p className="text-xs text-indigo-100/90 leading-relaxed max-w-lg">
              {pendingTodayTasks.length === 0
                ? 'Todas as tarefas de hoje foram concluídas! Aproveite seu tempo.'
                : `Você tem ${pendingTodayTasks.length} ${
                    pendingTodayTasks.length === 1 ? 'tarefa pendente' : 'tarefas pendentes'
                  } para hoje.`}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md text-white border border-white/20">
              <div
                className={`w-2 h-2 rounded-full ${
                  driveSyncInfo.status === 'synced' ? 'bg-emerald-400' : 'bg-amber-300'
                }`}
              />
              <span>{user ? 'Google Drive Conectado' : 'Armazenamento Local'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics - 3 Android Material Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Tarefas Hoje */}
        <div
          onClick={() => setCurrentTab('tarefas')}
          className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
              Tarefas de Hoje
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                {completedTodayTasks.length}/{todayTasks.length}
              </span>
              <span className="text-xs text-zinc-500 font-medium">concluídas</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Saldo do Mês */}
        <div
          onClick={() => setCurrentTab('financas')}
          className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-600 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
              Saldo do Mês
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-black ${
                  balance >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatBRL(balance)}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Agenda Hoje */}
        <div
          onClick={() => setCurrentTab('agenda')}
          className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs hover:border-violet-400 dark:hover:border-violet-600 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
              Compromissos Hoje
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                {todayEvents.length}
              </span>
              <span className="text-xs text-zinc-500 font-medium">na agenda</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Atalhos Rápidos Nativos (Android Action Chips) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setCurrentTab('financas')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 text-xs font-semibold text-zinc-800 dark:text-zinc-200 shrink-0 shadow-xs transition-colors cursor-pointer"
        >
          <Camera className="w-4 h-4 text-indigo-600" />
          <span>Escanear Nota Fiscal (IA)</span>
        </button>

        <button
          onClick={() => setIsNewDraftOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-amber-500 text-xs font-semibold text-zinc-800 dark:text-zinc-200 shrink-0 shadow-xs transition-colors cursor-pointer"
        >
          <StickyNote className="w-4 h-4 text-amber-500" />
          <span>Novo Post-it</span>
        </button>

        <button
          onClick={() => setCurrentTab('agenda')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-violet-500 text-xs font-semibold text-zinc-800 dark:text-zinc-200 shrink-0 shadow-xs transition-colors cursor-pointer"
        >
          <Calendar className="w-4 h-4 text-violet-600" />
          <span>Ver Agenda Completa</span>
        </button>
      </div>

      {/* 4. Main Two-Column Layout: Tarefas de Hoje & Post-its */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Coluna 1 & 2: Tarefas do Dia */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Foco do Dia (Tarefas)
              </h2>
            </div>

            <button
              onClick={() => setCurrentTab('tarefas')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Task Input Form */}
          <form onSubmit={handleQuickAddTask} className="flex gap-2">
            <input
              type="text"
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              placeholder="Adicionar tarefa rápida para hoje..."
              className="flex-1 px-3.5 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <button
              type="submit"
              disabled={!quickTaskTitle.trim()}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 shrink-0"
            >
              Adicionar
            </button>
          </form>

          {/* Today Tasks List */}
          {todayTasks.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 dark:text-zinc-500 space-y-1">
              <CheckCircle2 className="w-8 h-8 mx-auto stroke-1 opacity-40 mb-1" />
              <p className="text-xs font-medium">Nenhuma tarefa marcada para hoje.</p>
              <p className="text-[11px]">Digite acima para adicionar um novo afazer.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => toggleTaskCompletion(t.id)}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                    t.completed
                      ? 'bg-zinc-50/60 dark:bg-zinc-850/40 border-zinc-100 dark:border-zinc-800/60 opacity-60'
                      : 'bg-white dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-700/80 hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                        t.completed
                          ? 'bg-emerald-600 text-white'
                          : 'border border-zinc-300 dark:border-zinc-600'
                      }`}
                    >
                      {t.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <span
                      className={`text-xs font-medium truncate ${
                        t.completed
                          ? 'line-through text-zinc-400 dark:text-zinc-500'
                          : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {t.title}
                    </span>
                  </div>

                  {t.dueTime && (
                    <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {t.dueTime}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coluna 3: Post-its & Rascunhos Rápidos */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Post-its Rápidos
                </h2>
              </div>

              <button
                onClick={() => setIsNewDraftOpen(true)}
                className="p-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors cursor-pointer"
                title="Novo Post-it"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Post-it Cards */}
            {draftNotes.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 dark:text-zinc-500 space-y-1">
                <StickyNote className="w-8 h-8 mx-auto stroke-1 opacity-40 mb-1" />
                <p className="text-xs font-medium">Nenhum rascunho ativo.</p>
                <p className="text-[11px]">Guarde notas e pensamentos livres.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {draftNotes.slice(0, 4).map((draft) => (
                  <div
                    key={draft.id}
                    style={{ backgroundColor: draft.color || '#fef08a' }}
                    className="p-3 rounded-2xl border border-black/10 text-zinc-900 shadow-xs flex flex-col justify-between group relative"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="text-xs font-bold text-zinc-900 truncate">
                        {draft.title}
                      </h4>
                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={() => deleteDraftNote(draft.id)}
                          className="p-0.5 text-zinc-600 hover:text-rose-700 cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-800 whitespace-pre-wrap leading-relaxed line-clamp-3">
                      {draft.content || '(Vazio)'}
                    </p>

                    <div className="mt-2 pt-1.5 border-t border-black/10 flex items-center justify-between text-[10px] text-zinc-600">
                      <span>{new Date(draft.updatedAt).toLocaleDateString('pt-BR')}</span>
                      <button
                        onClick={() => convertDraftToTask(draft)}
                        className="font-bold text-zinc-900 hover:underline cursor-pointer"
                      >
                        + Criar Tarefa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Novo Post-it */}
      {isNewDraftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Novo Post-it / Rascunho
              </h3>
              <button
                onClick={() => setIsNewDraftOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 cursor-pointer"
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
                  Conteúdo
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Escreva seu pensamento ou rascunho..."
                  value={newDraftContent}
                  onChange={(e) => setNewDraftContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Cor
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
