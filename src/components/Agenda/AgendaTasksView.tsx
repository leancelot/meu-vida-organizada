import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  MapPin,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GoogleCalendarEvent, TaskItem } from '../../types';
import { hapticImpactLight, hapticSelection } from '../../services/hapticsService';

interface AgendaTasksViewProps {
  quickOpenModal?: 'task' | 'event' | null;
  onConsumeQuickOpen?: () => void;
}

const toLocalDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (dateStr: string, offset: number): string => {
  const base = new Date(`${dateStr}T12:00:00`);
  base.setDate(base.getDate() + offset);
  return toLocalDateStr(base);
};

const getWeekDays = (anchorDateStr: string): string[] => {
  const base = new Date(`${anchorDateStr}T12:00:00`);
  const dayOfWeek = base.getDay(); // 0 = Domingo
  const sunday = new Date(base);
  sunday.setDate(base.getDate() - dayOfWeek);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return toLocalDateStr(d);
  });
};

const getEventDateStr = (ev: GoogleCalendarEvent): string => {
  if (ev.start?.date) return ev.start.date;
  if (ev.start?.dateTime) return toLocalDateStr(new Date(ev.start.dateTime));
  return '';
};

const getEventTimeStr = (ev: GoogleCalendarEvent): string => {
  if (ev.start?.dateTime) {
    return new Date(ev.start.dateTime).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return 'Dia todo';
};

const getEventSortTime = (ev: GoogleCalendarEvent): string => {
  if (!ev.start?.dateTime) return '00:00';
  const d = new Date(ev.start.dateTime);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const CATEGORY_LABELS: Record<string, string> = {
  trabalho: 'Trabalho',
  pessoal: 'Pessoal',
  saude: 'Saúde',
  estudos: 'Estudos',
  financas: 'Finanças',
  outros: 'Outros',
};

const PRIORITY_LABELS: Record<TaskItem['priority'], string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

type TimelineEntry =
  | { kind: 'event'; sortTime: string; hasTime: boolean; event: GoogleCalendarEvent }
  | { kind: 'task'; sortTime: string; hasTime: boolean; task: TaskItem };

export const AgendaTasksView: React.FC<AgendaTasksViewProps> = ({
  quickOpenModal,
  onConsumeQuickOpen,
}) => {
  const {
    user,
    signInWithGoogle,
    calendarEvents,
    isLoadingCalendar,
    refreshCalendar,
    addEventToGoogleCalendar,
    removeGoogleCalendarEvent,
    tasks,
    addTask,
    updateTask,
    toggleTaskCompletion,
    deleteTask,
    toggleSubtask,
    scheduleTaskInCalendar,
    notificationPermission,
    enableNotifications,
  } = useApp();

  const todayStr = toLocalDateStr(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [typeFilter, setTypeFilter] = useState<'all' | 'events' | 'tasks'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quickTaskTitle, setQuickTaskTitle] = useState<string>('');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  // Create Task state (no fictitious examples)
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState(todayStr);
  const [newDueTime, setNewDueTime] = useState('');
  const [newPriority, setNewPriority] = useState<TaskItem['priority']>('medium');
  const [newCategory, setNewCategory] = useState<TaskItem['category']>('pessoal');
  const [subtasksList, setSubtasksList] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');

  // Edit Task state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueTime, setEditDueTime] = useState('');
  const [editPriority, setEditPriority] = useState<TaskItem['priority']>('medium');
  const [editCategory, setEditCategory] = useState<TaskItem['category']>('pessoal');
  const [editSubtasks, setEditSubtasks] = useState<
    { id: string; title: string; completed: boolean }[]
  >([]);
  const [editSubtaskInput, setEditSubtaskInput] = useState('');

  // Create Calendar Event state (no fictitious examples)
  const [eventSummary, setEventSummary] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDate, setEventDate] = useState(todayStr);
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventAllDay, setEventAllDay] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

  // Focus Timer (Pomodoro 25m)
  const [focusTask, setFocusTask] = useState<TaskItem | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    if (!quickOpenModal) return;
    if (quickOpenModal === 'task') {
      setNewDueDate(selectedDateStr);
      setIsTaskModalOpen(true);
    } else if (quickOpenModal === 'event') {
      setEventDate(selectedDateStr);
      setIsEventModalOpen(true);
    }
    onConsumeQuickOpen?.();
  }, [quickOpenModal, selectedDateStr, onConsumeQuickOpen]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const weekDays = useMemo(() => getWeekDays(selectedDateStr), [selectedDateStr]);

  const buildTimelineForDate = (dateStr: string): TimelineEntry[] => {
    const q = searchQuery.trim().toLowerCase();
    const entries: TimelineEntry[] = [];

    if (typeFilter !== 'tasks') {
      calendarEvents.forEach((ev) => {
        if (getEventDateStr(ev) !== dateStr) return;
        if (q) {
          const match =
            (ev.summary || '').toLowerCase().includes(q) ||
            (ev.description || '').toLowerCase().includes(q) ||
            (ev.location || '').toLowerCase().includes(q);
          if (!match) return;
        }
        entries.push({
          kind: 'event',
          sortTime: getEventSortTime(ev),
          hasTime: Boolean(ev.start?.dateTime),
          event: ev,
        });
      });
    }

    if (typeFilter !== 'events') {
      tasks.forEach((task) => {
        if (task.dueDate !== dateStr) return;
        if (!showCompleted && task.completed) return;
        if (selectedCategory !== 'all' && task.category !== selectedCategory) return;
        if (q) {
          const match =
            task.title.toLowerCase().includes(q) ||
            (task.description || '').toLowerCase().includes(q);
          if (!match) return;
        }
        entries.push({
          kind: 'task',
          sortTime: task.dueTime || '99:99',
          hasTime: Boolean(task.dueTime),
          task,
        });
      });
    }

    // Ordenação: dia inteiro primeiro, depois com horário em ordem crescente, depois tarefas sem horário
    return entries.sort((a, b) => {
      const rank = (entry: TimelineEntry) => {
        if (entry.kind === 'event' && !entry.hasTime) return 0;
        if (entry.hasTime) return 1;
        return 2;
      };
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return a.sortTime.localeCompare(b.sortTime);
    });
  };

  const dayTimeline = useMemo(
    () => buildTimelineForDate(selectedDateStr),
    [selectedDateStr, tasks, calendarEvents, typeFilter, selectedCategory, showCompleted, searchQuery]
  );

  // Tarefas pendentes de datas anteriores ao dia de hoje (para não perder metas/prazos)
  const overdueTasks = useMemo(() => {
    if (viewMode !== 'day' || selectedDateStr !== todayStr || typeFilter === 'events') return [];
    const q = searchQuery.trim().toLowerCase();
    return tasks
      .filter((t) => {
        if (t.completed || t.dueDate >= todayStr) return false;
        if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
        if (q) {
          return (
            t.title.toLowerCase().includes(q) ||
            (t.description || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [viewMode, selectedDateStr, todayStr, tasks, typeFilter, selectedCategory, searchQuery]);

  const activeDayTitle = useMemo(() => {
    if (viewMode === 'day') {
      const formatted = new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date(`${selectedDateStr}T12:00:00`));
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    const start = new Date(`${weekDays[0]}T12:00:00`);
    const end = new Date(`${weekDays[6]}T12:00:00`);
    const startFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(start);
    const endFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(end);
    return `${startFmt} – ${endFmt}`;
  }, [viewMode, selectedDateStr, weekDays]);

  const totalPendingCount = useMemo(
    () => tasks.filter((t) => !t.completed).length,
    [tasks]
  );

  const navigateStep = (direction: -1 | 1) => {
    hapticSelection();
    const offset = viewMode === 'day' ? direction : direction * 7;
    setSelectedDateStr((prev) => addDays(prev, offset));
  };

  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    addTask({
      title: quickTaskTitle.trim(),
      dueDate: selectedDateStr,
      priority: 'medium',
      category: 'pessoal',
      completed: false,
      subtasks: [],
    });
    setQuickTaskTitle('');
  };

  const handleAddSubtask = () => {
    if (subtaskInput.trim()) {
      setSubtasksList([...subtasksList, subtaskInput.trim()]);
      setSubtaskInput('');
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addTask({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      dueDate: newDueDate,
      dueTime: newDueTime || undefined,
      priority: newPriority,
      category: newCategory,
      completed: false,
      subtasks: subtasksList.map((st, i) => ({
        id: `st-${Date.now()}-${i}`,
        title: st,
        completed: false,
      })),
    });

    setNewTitle('');
    setNewDescription('');
    setNewDueTime('');
    setSubtasksList([]);
    setIsTaskModalOpen(false);
  };

  const openEditModal = (task: TaskItem) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditDueDate(task.dueDate);
    setEditDueTime(task.dueTime || '');
    setEditPriority(task.priority);
    setEditCategory(task.category);
    setEditSubtasks(task.subtasks ? [...task.subtasks] : []);
  };

  const handleAddEditSubtask = () => {
    if (editSubtaskInput.trim()) {
      setEditSubtasks([
        ...editSubtasks,
        {
          id: `st-edit-${Date.now()}`,
          title: editSubtaskInput.trim(),
          completed: false,
        },
      ]);
      setEditSubtaskInput('');
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    updateTask(editingTask.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      dueDate: editDueDate,
      dueTime: editDueTime || undefined,
      priority: editPriority,
      category: editCategory,
      subtasks: editSubtasks,
    });
    setEditingTask(null);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventSummary.trim()) return;

    setIsSubmittingEvent(true);
    try {
      if (eventAllDay) {
        await addEventToGoogleCalendar({
          summary: eventSummary.trim(),
          description: eventDescription.trim() || undefined,
          location: eventLocation.trim() || undefined,
          allDay: true,
          date: eventDate,
          startDateTime: `${eventDate}T00:00:00Z`,
          endDateTime: `${eventDate}T23:59:59Z`,
        });
      } else {
        if (!eventStartTime || !eventEndTime) return;
        const startIso = new Date(`${eventDate}T${eventStartTime}:00`).toISOString();
        const endIso = new Date(`${eventDate}T${eventEndTime}:00`).toISOString();
        await addEventToGoogleCalendar({
          summary: eventSummary.trim(),
          description: eventDescription.trim() || undefined,
          location: eventLocation.trim() || undefined,
          startDateTime: startIso,
          endDateTime: endIso,
        });
      }

      setEventSummary('');
      setEventDescription('');
      setEventLocation('');
      setEventStartTime('');
      setEventEndTime('');
      setIsEventModalOpen(false);
    } catch (err) {
      console.error('Erro ao criar evento:', err);
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  const renderTaskRow = (task: TaskItem, compact = false) => {
    const completedSubtasks = task.subtasks.filter((st) => st.completed).length;

    return (
      <div
        key={`task-${task.id}`}
        className={`bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl ${
          compact ? 'p-3' : 'p-4'
        } transition-opacity ${task.completed ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => toggleTaskCompletion(task.id)}
            aria-label={task.completed ? 'Desmarcar tarefa' : 'Concluir tarefa'}
            className={`mt-0.5 min-w-[24px] min-h-[24px] w-6 h-6 rounded-lg flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
              task.completed
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 text-transparent'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p
                className={`text-sm font-semibold leading-snug ${
                  task.completed
                    ? 'line-through text-zinc-400 dark:text-zinc-500'
                    : 'text-zinc-900 dark:text-zinc-100'
                }`}
              >
                {task.title}
              </p>

              {task.dueTime && (
                <span className="text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400 shrink-0">
                  {task.dueTime}
                </span>
              )}
            </div>

            {/* Clean unboxed metadata */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              <span>{CATEGORY_LABELS[task.category] || task.category}</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  task.priority === 'high'
                    ? 'text-rose-600 dark:text-rose-400 font-medium'
                    : task.priority === 'medium'
                    ? 'text-amber-600 dark:text-amber-400 font-medium'
                    : ''
                }
              >
                Prioridade {PRIORITY_LABELS[task.priority]}
              </span>
              {task.googleCalendarEventId && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Na Google Agenda
                  </span>
                </>
              )}
            </div>

            {task.description && !compact && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                {task.description}
              </p>
            )}

            {/* Subtasks / Metas em passos */}
            {task.subtasks.length > 0 && !compact && (
              <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono tabular-nums">
                  <span className="font-sans">Etapas</span>
                  <span>
                    {completedSubtasks}/{task.subtasks.length}
                  </span>
                </div>
                {task.subtasks.map((st) => (
                  <label
                    key={st.id}
                    className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer select-none min-h-[28px]"
                  >
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => {
                        hapticSelection();
                        toggleSubtask(task.id, st.id);
                      }}
                      className="w-3.5 h-3.5 rounded-sm text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span className={st.completed ? 'line-through text-zinc-400' : ''}>
                      {st.title}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Action row */}
            <div className="flex flex-wrap items-center gap-3 mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
              {!task.googleCalendarEventId && (
                <button
                  type="button"
                  onClick={() => scheduleTaskInCalendar(task)}
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Agendar</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  hapticImpactLight();
                  setFocusTask(task);
                  setTimerSeconds(25 * 60);
                  setIsTimerRunning(true);
                }}
                className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium cursor-pointer"
              >
                <Play className="w-3 h-3" />
                <span>Foco</span>
              </button>
              <button
                type="button"
                onClick={() => openEditModal(task)}
                className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>Editar</span>
              </button>
              <button
                type="button"
                onClick={() => deleteTask(task.id)}
                aria-label="Excluir tarefa"
                className="ml-auto inline-flex items-center gap-1 text-zinc-400 hover:text-rose-500 cursor-pointer p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEventRow = (ev: GoogleCalendarEvent, compact = false) => {
    const timeStr = getEventTimeStr(ev);

    return (
      <div
        key={`event-${ev.id}`}
        className={`bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/50 rounded-2xl ${
          compact ? 'p-3' : 'p-4'
        } flex items-start justify-between gap-3`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Calendar className="w-3.5 h-3.5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                {ev.summary || 'Compromisso'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              <span className="font-mono tabular-nums text-indigo-700 dark:text-indigo-300 font-medium">
                {timeStr}
              </span>
              <span aria-hidden="true">·</span>
              <span>Google Agenda</span>
              {ev.location && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {ev.location}
                  </span>
                </>
              )}
            </div>

            {ev.description && !compact && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                {ev.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {ev.htmlLink && (
            <a
              href={ev.htmlLink}
              target="_blank"
              rel="noreferrer"
              title="Abrir no Google Calendar"
              className="p-2 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            type="button"
            onClick={() => removeGoogleCalendarEvent(ev.id)}
            title="Excluir evento"
            className="p-2 rounded-lg text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Cabeçalho Unificado */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Agenda & Tarefas
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              <span>{totalPendingCount} pendente(s)</span>
              <span aria-hidden="true">·</span>
              <span>{calendarEvents.length} compromisso(s)</span>
              {user ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Google Agenda ativa
                  </span>
                </>
              ) : (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={signInWithGoogle}
                    className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer"
                  >
                    Conectar Google Agenda
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Segmented Dia / Semana + Ações de Criação */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  hapticSelection();
                  setViewMode('day');
                }}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  viewMode === 'day'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Dia
              </button>
              <button
                type="button"
                onClick={() => {
                  hapticSelection();
                  setViewMode('week');
                }}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  viewMode === 'week'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Semana
              </button>
            </div>

            {user && (
              <button
                type="button"
                onClick={() => refreshCalendar()}
                disabled={isLoadingCalendar}
                title="Atualizar Google Agenda"
                className="min-h-[40px] min-w-[40px] p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingCalendar ? 'animate-spin' : ''}`} />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setNewDueDate(selectedDateStr);
                setIsTaskModalOpen(true);
              }}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Tarefa</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEventDate(selectedDateStr);
                setIsEventModalOpen(true);
              }}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <CalendarPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Novo Evento</span>
            </button>
          </div>
        </div>

        {/* Navegação de Data + Faixa Horizontal dos 7 Dias */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              {activeDayTitle}
            </h2>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => navigateStep(-1)}
                aria-label="Período anterior"
                className="min-h-[36px] min-w-[36px] p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  hapticSelection();
                  setSelectedDateStr(todayStr);
                }}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  selectedDateStr === todayStr
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => navigateStep(1)}
                aria-label="Próximo período"
                className="min-h-[36px] min-w-[36px] p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Seletor rápido de dias da semana */}
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((dStr) => {
              const dateObj = new Date(`${dStr}T12:00:00`);
              const weekday = dateObj
                .toLocaleDateString('pt-BR', { weekday: 'short' })
                .replace('.', '');
              const dayNum = dateObj.getDate();
              const isSelected = dStr === selectedDateStr;
              const isToday = dStr === todayStr;
              const hasItems =
                tasks.some((t) => t.dueDate === dStr && !t.completed) ||
                calendarEvents.some((ev) => getEventDateStr(ev) === dStr);

              return (
                <button
                  key={dStr}
                  type="button"
                  onClick={() => {
                    hapticSelection();
                    setSelectedDateStr(dStr);
                    if (viewMode === 'week') setViewMode('day');
                  }}
                  className={`min-h-[54px] py-2 px-1 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : isToday
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900'
                      : 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="text-[10px] uppercase font-semibold opacity-80">{weekday}</span>
                  <span className="text-sm font-bold font-mono tabular-nums">{dayNum}</span>
                  <span
                    className={`w-1 h-1 rounded-full ${
                      hasItems
                        ? isSelected
                          ? 'bg-white'
                          : 'bg-indigo-500'
                        : 'bg-transparent'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Banner discreto para ativar notificações caso desativadas */}
      {notificationPermission !== 'granted' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-300">
            <Bell className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Ative os alertas visuais silenciosos para horários de tarefas e eventos.</span>
          </div>
          <button
            type="button"
            onClick={enableNotifications}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer shrink-0"
          >
            Ativar Alertas
          </button>
        </div>
      )}

      {/* Barra de Modo Foco (Pomodoro) */}
      {focusTask && (
        <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="px-3 py-2 rounded-xl bg-indigo-600 text-white font-mono tabular-nums font-bold text-sm shrink-0">
              {formatTimer(timerSeconds)}
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                Modo Foco
              </span>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {focusTask.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 flex items-center gap-1.5 cursor-pointer"
            >
              {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isTimerRunning ? 'Pausar' : 'Iniciar'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds(25 * 60);
              }}
              aria-label="Reiniciar cronômetro"
              className="min-h-[38px] min-w-[38px] p-1.5 rounded-xl bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setFocusTask(null)}
              aria-label="Fechar modo foco"
              className="min-h-[38px] min-w-[38px] p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filtros & Busca */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl text-xs font-medium">
            {(['all', 'events', 'tasks'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  hapticSelection();
                  setTypeFilter(t);
                }}
                className={`min-h-[34px] px-3 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  typeFilter === t
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {t === 'all' ? 'Tudo' : t === 'events' ? 'Compromissos' : 'Tarefas'}
              </button>
            ))}
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filtrar categoria"
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="all">Todas categorias</option>
            <option value="trabalho">Trabalho</option>
            <option value="pessoal">Pessoal</option>
            <option value="saude">Saúde</option>
            <option value="estudos">Estudos</option>
            <option value="financas">Finanças</option>
            <option value="outros">Outros</option>
          </select>

          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showCompleted
                ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                : 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900'
            }`}
          >
            {showCompleted ? 'Ocultar concluídas' : 'Mostrando pendentes'}
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar na agenda e tarefas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[40px] pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
      </div>

      {/* Entrada rápida na Visão Dia */}
      {viewMode === 'day' && (
        <form onSubmit={handleQuickAddTask} className="relative">
          <input
            type="text"
            value={quickTaskTitle}
            onChange={(e) => setQuickTaskTitle(e.target.value)}
            placeholder={
              selectedDateStr === todayStr
                ? 'Adicionar tarefa rápida para hoje...'
                : 'Adicionar tarefa rápida para este dia...'
            }
            className="w-full min-h-[46px] pl-4 pr-12 py-3 text-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <button
            type="submit"
            disabled={!quickTaskTitle.trim()}
            aria-label="Adicionar tarefa rápida"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Conteúdo Principal: Dia ou Semana */}
      {viewMode === 'day' ? (
        <div className="space-y-6">
          {/* Tarefas de dias anteriores ainda pendentes */}
          {overdueTasks.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pendentes anteriores ({overdueTasks.length})</span>
                </h3>
              </div>
              <div className="space-y-2.5">{overdueTasks.map((t) => renderTaskRow(t))}</div>
            </section>
          )}

          {/* Linha do tempo unificada do dia selecionado */}
          {dayTimeline.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-10 text-center space-y-3">
              <CheckCircle2 className="w-9 h-9 mx-auto text-zinc-300 dark:text-zinc-700" />
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Nada agendado para este dia
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                Adicione uma tarefa acima ou registre um evento para organizar seus horários.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setNewDueDate(selectedDateStr);
                    setIsTaskModalOpen(true);
                  }}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Nova Tarefa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEventDate(selectedDateStr);
                    setIsEventModalOpen(true);
                  }}
                  className="min-h-[40px] px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  Novo Evento
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dayTimeline.map((entry) =>
                entry.kind === 'event'
                  ? renderEventRow(entry.event)
                  : renderTaskRow(entry.task)
              )}
            </div>
          )}
        </div>
      ) : (
        /* Visão Semanal Unificada */
        <div className="space-y-4">
          {weekDays.map((dStr) => {
            const entries = buildTimelineForDate(dStr);
            const isToday = dStr === todayStr;
            const formattedDay = new Intl.DateTimeFormat('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            }).format(new Date(`${dStr}T12:00:00`));

            return (
              <section
                key={dStr}
                className={`bg-white dark:bg-zinc-900 border rounded-2xl p-4 space-y-3 ${
                  isToday
                    ? 'border-indigo-500/70 dark:border-indigo-500/50'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      hapticSelection();
                      setSelectedDateStr(dStr);
                      setViewMode('day');
                    }}
                    className="flex items-center gap-2 text-left cursor-pointer group"
                  >
                    <span
                      className={`text-sm font-bold capitalize ${
                        isToday
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-zinc-900 dark:text-zinc-100'
                      } group-hover:underline`}
                    >
                      {formattedDay}
                    </span>
                    {isToday && (
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        · Hoje
                      </span>
                    )}
                    <span className="text-xs text-zinc-400 tabular-nums">
                      ({entries.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewDueDate(dStr);
                      setIsTaskModalOpen(true);
                    }}
                    title="Adicionar tarefa neste dia"
                    className="min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tarefa</span>
                  </button>
                </div>

                {entries.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-1">Sem registros para este dia.</p>
                ) : (
                  <div className="space-y-2">
                    {entries.map((entry) =>
                      entry.kind === 'event'
                        ? renderEventRow(entry.event, true)
                        : renderTaskRow(entry.task, true)
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Modal: Nova Tarefa */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Nova Tarefa</h3>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Título da tarefa"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Descrição (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Anotações ou detalhes"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Horário (Opcional)
                  </label>
                  <input
                    type="time"
                    value={newDueTime}
                    onChange={(e) => setNewDueTime(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskItem['priority'])}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as TaskItem['category'])}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  >
                    <option value="trabalho">Trabalho</option>
                    <option value="pessoal">Pessoal</option>
                    <option value="saude">Saúde</option>
                    <option value="estudos">Estudos</option>
                    <option value="financas">Finanças</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Etapas / Subtarefas
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Adicionar etapa"
                    value={subtaskInput}
                    onChange={(e) => setSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="px-3 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
                {subtasksList.length > 0 && (
                  <div className="space-y-1">
                    {subtasksList.map((st, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300"
                      >
                        <span>{st}</span>
                        <button
                          type="button"
                          onClick={() => setSubtasksList(subtasksList.filter((_, idx) => idx !== i))}
                          className="text-zinc-400 hover:text-rose-500 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                >
                  Salvar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Tarefa */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Editar Tarefa</h3>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={editDueTime}
                    onChange={(e) => setEditDueTime(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskItem['priority'])}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as TaskItem['category'])}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  >
                    <option value="trabalho">Trabalho</option>
                    <option value="pessoal">Pessoal</option>
                    <option value="saude">Saúde</option>
                    <option value="estudos">Estudos</option>
                    <option value="financas">Finanças</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Etapas
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Adicionar etapa"
                    value={editSubtaskInput}
                    onChange={(e) => setEditSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEditSubtask();
                      }
                    }}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddEditSubtask}
                    className="px-3 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
                {editSubtasks.length > 0 && (
                  <div className="space-y-1">
                    {editSubtasks.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300"
                      >
                        <span className={st.completed ? 'line-through text-zinc-400' : ''}>
                          {st.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditSubtasks(editSubtasks.filter((s) => s.id !== st.id))}
                          className="text-zinc-400 hover:text-rose-500 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Evento no Google Calendar */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Novo Evento na Google Agenda
              </h3>
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!user ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  Conecte sua conta Google para criar e sincronizar eventos diretamente na sua agenda.
                </p>
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Conectar conta Google
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateEvent} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Título do Evento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Título do evento"
                    value={eventSummary}
                    onChange={(e) => setEventSummary(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Descrição
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalhes do evento"
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Localização ou Link
                  </label>
                  <input
                    type="text"
                    placeholder="Local ou link"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="unifiedAllDayCheckbox"
                    checked={eventAllDay}
                    onChange={(e) => setEventAllDay(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                  <label
                    htmlFor="unifiedAllDayCheckbox"
                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    Evento de dia inteiro
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className={eventAllDay ? 'sm:col-span-3' : 'sm:col-span-1'}>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Data *
                    </label>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                  </div>

                  {!eventAllDay && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          Início *
                        </label>
                        <input
                          type="time"
                          required
                          value={eventStartTime}
                          onChange={(e) => setEventStartTime(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          Fim *
                        </label>
                        <input
                          type="time"
                          required
                          value={eventEndTime}
                          onChange={(e) => setEventEndTime(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsEventModalOpen(false)}
                    className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEvent}
                    className="min-h-[40px] px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
                  >
                    {isSubmittingEvent ? 'Salvando...' : 'Salvar Evento'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
