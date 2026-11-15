import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  PinOff,
  Plus,
  ArrowRight,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { hapticSelection, hapticImpactLight } from '../../services/hapticsService';

interface DashboardViewProps {
  setCurrentTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setCurrentTab }) => {
  const {
    tasks,
    toggleTaskCompletion,
    snoozeTaskToTomorrow,
    addTask,
    calendarEvents,
    draftNotes,
    togglePinDraft,
    deleteDraftNote,
    user,
    userName,
    driveSyncInfo,
  } = useApp();

  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }, []);

  // Today's tasks
  const todayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate === todayStr),
    [tasks, todayStr]
  );
  const pendingTasks = useMemo(() => todayTasks.filter((t) => !t.completed), [todayTasks]);
  const completedTasks = useMemo(() => todayTasks.filter((t) => t.completed), [todayTasks]);

  // Calendar events for today
  const todayEvents = useMemo(() => {
    return calendarEvents.filter((event) => {
      if (event.start?.date === todayStr) return true;
      if (event.start?.dateTime && event.start.dateTime.startsWith(todayStr)) return true;
      return false;
    });
  }, [calendarEvents, todayStr]);

  // Pinned quick drafts
  const pinnedDrafts = useMemo(
    () => draftNotes.filter((d) => d.isPinned),
    [draftNotes]
  );

  // Formatted date string in Brazilian Portuguese
  const formattedTodayDate = useMemo(() => {
    const now = new Date();
    const weekday = now.toLocaleDateString('pt-BR', { weekday: 'long' });
    const day = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day}`;
  }, []);

  const progressPercent = useMemo(() => {
    if (todayTasks.length === 0) return 0;
    return Math.round((completedTasks.length / todayTasks.length) * 100);
  }, [todayTasks.length, completedTasks.length]);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    hapticImpactLight();
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

  const displayedTasks = useMemo(() => {
    if (filterMode === 'pending') return pendingTasks;
    if (filterMode === 'completed') return completedTasks;
    return todayTasks;
  }, [filterMode, pendingTasks, completedTasks, todayTasks]);

  const displayFirstName = useMemo(() => {
    if (userName.trim()) return userName.trim().split(' ')[0];
    if (user?.displayName) return user.displayName.split(' ')[0];
    return '';
  }, [userName, user?.displayName]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* 1. Header Minimalista */}
      <header className="pt-2 sm:pt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-zinc-200/70 dark:border-zinc-800/80 pb-5">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            {formattedTodayDate}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            {displayFirstName ? `Olá, ${displayFirstName}` : 'Foco do Dia'}
          </h1>
        </div>

        {/* Status discreto de sincronização em texto limpo */}
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <span>
            {user
              ? driveSyncInfo.status === 'syncing'
                ? 'Sincronizando...'
                : 'Nuvem conectada'
              : 'Modo local'}
          </span>
        </div>
      </header>

      {/* 2. Barra de Progresso do Dia */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs mb-2.5">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            Progresso de Hoje
          </span>
          <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
            {completedTasks.length} de {todayTasks.length} concluídas ({progressPercent}%)
          </span>
        </div>

        {/* Barra de progresso */}
        <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </section>

      {/* 3. Eventos da Google Agenda para Hoje (Se houver) */}
      {todayEvents.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <Calendar className="w-3.5 h-3.5 text-violet-500" />
              <span>Compromissos na Agenda ({todayEvents.length})</span>
            </div>
            <button
              onClick={() => setCurrentTab('agenda')}
              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver agenda</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {todayEvents.map((evt) => {
              const timeStr = evt.start?.dateTime
                ? new Date(evt.start.dateTime).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Dia todo';

              return (
                <div
                  key={evt.id}
                  onClick={() => setCurrentTab('agenda')}
                  className="p-3.5 rounded-2xl bg-violet-50/70 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-800/40 flex items-center justify-between gap-3 cursor-pointer hover:border-violet-300 dark:hover:border-violet-700 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="px-2 py-1 rounded-lg bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 font-mono text-[11px] font-bold shrink-0">
                      {timeStr}
                    </span>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {evt.summary || 'Compromisso'}
                    </span>
                  </div>
                  {evt.location && (
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[120px] hidden sm:inline">
                      {evt.location}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Lista do Foco do Dia (Tarefas de Hoje) */}
      <section className="space-y-3">
        {/* Cabeçalho da Lista & Filtros Rápidos */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5">
          <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Tarefas de Hoje
          </h2>

          <div className="grid grid-cols-3 sm:inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/70 p-1 rounded-xl text-[11px] font-medium">
            <button
              onClick={() => {
                hapticSelection();
                setFilterMode('all');
              }}
              className={`pressable h-8 sm:h-7 px-2.5 rounded-lg cursor-pointer whitespace-nowrap flex items-center justify-center ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              Todas ({todayTasks.length})
            </button>
            <button
              onClick={() => {
                hapticSelection();
                setFilterMode('pending');
              }}
              className={`pressable h-8 sm:h-7 px-2.5 rounded-lg cursor-pointer whitespace-nowrap flex items-center justify-center ${
                filterMode === 'pending'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              Pendentes ({pendingTasks.length})
            </button>
            <button
              onClick={() => {
                hapticSelection();
                setFilterMode('completed');
              }}
              className={`pressable h-8 sm:h-7 px-2.5 rounded-lg cursor-pointer whitespace-nowrap flex items-center justify-center ${
                filterMode === 'completed'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              Concluídas
            </button>
          </div>
        </div>

        {/* Input Rápido em Linha Única */}
        <form onSubmit={handleQuickAdd} className="relative">
          <input
            type="text"
            value={quickTaskTitle}
            onChange={(e) => setQuickTaskTitle(e.target.value)}
            placeholder="Adicionar tarefa rápida para hoje..."
            className="w-full h-11 pl-4 pr-12 text-xs sm:text-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 shadow-xs transition-all"
          />
          <button
            type="submit"
            disabled={!quickTaskTitle.trim()}
            className="pressable absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center disabled:opacity-30 disabled:hover:bg-indigo-600 cursor-pointer shadow-xs"
            title="Adicionar"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>

        {/* Lista de Tarefas */}
        {displayedTasks.length === 0 ? (
          <div className="py-12 text-center bg-white dark:bg-zinc-900/50 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-2">
            <CheckCircle2 className="w-9 h-9 mx-auto text-emerald-500/70" />
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {filterMode === 'completed'
                ? 'Nenhuma tarefa concluída hoje.'
                : 'Tudo pronto por aqui!'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
              {filterMode === 'completed'
                ? 'Conclua suas tarefas pendentes para vê-las aqui.'
                : 'Aproveite seu tempo ou adicione uma nova prioridade acima.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTaskCompletion(task.id)}
                className={`pressable p-3.5 rounded-2xl border flex items-center justify-between gap-2.5 cursor-pointer select-none ${
                  task.completed
                    ? 'bg-zinc-50/70 dark:bg-zinc-900/40 border-zinc-100 dark:border-zinc-850 opacity-65'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200/70 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    aria-label={task.completed ? 'Desmarcar tarefa' : 'Concluir tarefa'}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                      task.completed
                        ? 'bg-emerald-600 text-white animate-check-pop'
                        : 'border-2 border-zinc-300 dark:border-zinc-600 hover:border-indigo-500'
                    }`}
                  >
                    {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                  <div className="min-w-0">
                    <span
                      className={`text-xs sm:text-sm font-medium block truncate transition-colors ${
                        task.completed
                          ? 'line-through text-zinc-400 dark:text-zinc-500'
                          : 'text-zinc-800 dark:text-zinc-100'
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.category && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 block mt-0.5">
                        {task.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {task.dueTime && (
                    <span className="text-[11px] font-mono tabular-nums text-zinc-400 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      {task.dueTime}
                    </span>
                  )}
                  {!task.completed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        snoozeTaskToTomorrow(task.id);
                      }}
                      title="Adiar tarefa para amanhã"
                      aria-label={`Adiar ${task.title} para amanhã`}
                      className="pressable h-8 px-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-zinc-600 dark:text-zinc-300 hover:text-indigo-700 dark:hover:text-indigo-300 border border-zinc-200/70 dark:border-zinc-700/70 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                      <span>Amanhã</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Rascunhos Fixados (Discreto — apenas quando existir) */}
      {pinnedDrafts.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <StickyNote className="w-3.5 h-3.5 text-amber-500" />
              <span>Rascunhos Fixados ({pinnedDrafts.length})</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {pinnedDrafts.map((draft) => (
              <div
                key={draft.id}
                className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 flex items-start justify-between gap-2.5"
              >
                <div className="min-w-0 space-y-1">
                  <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {draft.title}
                  </h3>
                  {draft.content && draft.content !== draft.title && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {draft.content}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      hapticSelection();
                      togglePinDraft(draft.id);
                    }}
                    title="Desafixar da tela inicial"
                    aria-label={`Desafixar ${draft.title}`}
                    className="pressable w-8 h-8 rounded-xl text-amber-700/80 dark:text-amber-300/80 hover:bg-amber-100 dark:hover:bg-amber-900/50 flex items-center justify-center cursor-pointer"
                  >
                    <PinOff className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      hapticSelection();
                      deleteDraftNote(draft.id);
                    }}
                    title="Excluir rascunho"
                    aria-label={`Excluir ${draft.title}`}
                    className="pressable w-8 h-8 rounded-xl text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Acessos Rápidos Discretos no Rodapé */}
      <footer className="pt-4 border-t border-zinc-100 dark:border-zinc-850 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => {
            hapticSelection();
            setCurrentTab('agenda');
          }}
          className="pressable h-10 px-3.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center"
        >
          Agenda e tarefas →
        </button>
        <button
          onClick={() => {
            hapticSelection();
            setCurrentTab('financas');
          }}
          className="pressable h-10 px-3.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center"
        >
          Controle financeiro →
        </button>
      </footer>
    </div>
  );
};
