import React, { useState } from 'react';
import {
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  MapPin,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GoogleCalendarEvent } from '../../types';

export const AgendaView: React.FC = () => {
  const {
    user,
    accessToken,
    signInWithGoogle,
    calendarEvents,
    isLoadingCalendar,
    refreshCalendar,
    addEventToGoogleCalendar,
    removeGoogleCalendarEvent,
    tasks,
    scheduleTaskInCalendar,
  } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'day' | 'agenda'>('agenda');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New event form state
  const [eventSummary, setEventSummary] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventStartTime, setEventStartTime] = useState('14:00');
  const [eventEndTime, setEventEndTime] = useState('15:00');
  const [eventAllDay, setEventAllDay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to extract event start date
  const getEventDateStr = (ev: GoogleCalendarEvent) => {
    if (ev.start?.date) return ev.start.date;
    if (ev.start?.dateTime) return ev.start.dateTime.split('T')[0];
    return '';
  };

  const getEventTimeStr = (ev: GoogleCalendarEvent) => {
    if (ev.start?.dateTime) {
      const dt = new Date(ev.start.dateTime);
      return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return 'Dia todo';
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventSummary.trim()) return;

    setIsSubmitting(true);
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
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Erro ao criar evento:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unscheduled tasks for today or tomorrow that can be added to calendar
  const unscheduledTasks = tasks.filter(
    (t) => !t.completed && !t.googleCalendarEventId
  );

  // Group events by date
  const eventsByDate: Record<string, GoogleCalendarEvent[]> = {};
  calendarEvents.forEach((ev) => {
    const d = getEventDateStr(ev);
    if (d) {
      if (!eventsByDate[d]) eventsByDate[d] = [];
      eventsByDate[d].push(ev);
    }
  });

  // Sorted dates for agenda view
  const sortedDates = Object.keys(eventsByDate).sort();

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Agenda Integrada
              </h2>
              {user && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Google Calendar Ativo
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Sincronização em tempo real de compromissos e tarefas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={() => refreshCalendar()}
              disabled={isLoadingCalendar}
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Atualizar Google Agenda"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingCalendar ? 'animate-spin' : ''}`} />
            </button>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="text-xs font-semibold px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              Conectar Google Agenda
            </button>
          )}

          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'agenda'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Mês
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Evento</span>
          </button>
        </div>
      </div>

      {/* Quick Task to Calendar Convert Row */}
      {unscheduledTasks.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50 dark:from-indigo-950/30 dark:via-violet-950/20 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Tarefas prontas para agendar na sua Google Agenda
              </span>
            </div>
            <span className="text-[11px] text-zinc-500">1 clique para sincronizar</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {unscheduledTasks.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="shrink-0 bg-white dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-750 rounded-xl p-2.5 text-xs flex items-center gap-2 max-w-xs shadow-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {t.title}
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {t.dueDate} {t.dueTime ? `às ${t.dueTime}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => scheduleTaskInCalendar(t)}
                  title="Adicionar à Google Agenda"
                  className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[11px] shrink-0 transition-colors cursor-pointer"
                >
                  Agendar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main View Area */}
      {viewMode === 'agenda' ? (
        <div className="space-y-4">
          {!user ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-10 text-center space-y-3">
              <CalendarCheck className="w-10 h-10 mx-auto text-indigo-500" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Conecte seu Google Calendar
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                Visualize seus compromissos oficiais da Google Agenda diretamente aqui, crie novos eventos e sincronize suas tarefas diárias com seus horários.
              </p>
              <button
                onClick={signInWithGoogle}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <CalendarPlus className="w-4 h-4" />
                Conectar com Google
              </button>
            </div>
          ) : calendarEvents.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center text-zinc-400 space-y-2">
              <Calendar className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Nenhum evento encontrado no período
              </p>
              <p className="text-xs">Clique no botão "Novo Evento" acima para agendar compromissos.</p>
            </div>
          ) : (
            sortedDates.map((dateStr) => {
              const dayEvents = eventsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const formattedDate = new Intl.DateTimeFormat('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              }).format(new Date(dateStr + 'T00:00:00'));

              return (
                <div
                  key={dateStr}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider capitalize ${
                        isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500'
                      }`}
                    >
                      {formattedDate} {isToday ? '(Hoje)' : ''}
                    </span>
                    <span className="text-xs text-zinc-400">({dayEvents.length} eventos)</span>
                  </div>

                  <div className="space-y-2">
                    {dayEvents.map((ev) => {
                      const timeStr = getEventTimeStr(ev);

                      return (
                        <div
                          key={ev.id}
                          className="flex items-center justify-between gap-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors group"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-16 text-center shrink-0">
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
                                {timeStr}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                {ev.summary || '(Sem título)'}
                              </p>

                              {ev.description && (
                                <p className="text-xs text-zinc-500 truncate max-w-md mt-0.5">
                                  {ev.description}
                                </p>
                              )}

                              {ev.location && (
                                <div className="flex items-center gap-1 text-[11px] text-zinc-400 mt-1">
                                  <MapPin className="w-3 h-3" />
                                  <span className="truncate">{ev.location}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {ev.htmlLink && (
                              <a
                                href={ev.htmlLink}
                                target="_blank"
                                rel="noreferrer"
                                title="Abrir no Google Calendar"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() => removeGoogleCalendarEvent(ev.id)}
                              title="Excluir evento da Google Agenda"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Month Grid View */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 capitalize">
              {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
                currentDate
              )}
            </h3>
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-zinc-400 pb-2">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          {/* Simple Month Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => {
              const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
              const firstDayIndex = startOfMonth.getDay();
              const dayNum = i - firstDayIndex + 1;
              const daysInMonth = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() + 1,
                0
              ).getDate();

              if (dayNum < 1 || dayNum > daysInMonth) {
                return (
                  <div
                    key={i}
                    className="min-h-[70px] rounded-xl bg-zinc-50/40 dark:bg-zinc-850/30 p-1 opacity-30"
                  />
                );
              }

              const thisDateStr = `${currentDate.getFullYear()}-${String(
                currentDate.getMonth() + 1
              ).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

              const dayEvents = eventsByDate[thisDateStr] || [];
              const dayTasks = tasks.filter((t) => t.dueDate === thisDateStr);
              const isToday = thisDateStr === todayStr;

              return (
                <div
                  key={i}
                  className={`min-h-[70px] rounded-xl border p-1 text-left flex flex-col justify-between transition-colors ${
                    isToday
                      ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                      : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-indigo-600 text-white' : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {(dayEvents.length > 0 || dayTasks.length > 0) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    )}
                  </div>

                  <div className="space-y-0.5 mt-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-[10px] truncate px-1 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium"
                      >
                        {ev.summary}
                      </div>
                    ))}
                    {dayTasks.slice(0, 1).map((t) => (
                      <div
                        key={t.id}
                        className="text-[10px] truncate px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-medium"
                      >
                        ✓ {t.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Google Calendar Event Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Criar Evento no Google Calendar
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Título do Evento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Reunião de Alinhamento, Consulta Médica"
                  value={eventSummary}
                  onChange={(e) => setEventSummary(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Descrição / Pauta
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalhes ou link da reunião..."
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Localização / Link
                </label>
                <input
                  type="text"
                  placeholder="Ex: Google Meet, Sala 4, Av. Paulista"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allDayCheckbox"
                  checked={eventAllDay}
                  onChange={(e) => setEventAllDay(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <label
                  htmlFor="allDayCheckbox"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  Evento de dia inteiro
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={eventAllDay ? 'sm:col-span-3' : 'sm:col-span-1'}>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Data
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
                        Início
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
                        Fim
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
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? 'Salvando no Google...' : 'Salvar no Google Agenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
