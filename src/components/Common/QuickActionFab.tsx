import React, { useState } from 'react';
import {
  CalendarPlus,
  Camera,
  CheckSquare,
  CircleDollarSign,
  Plus,
  Sparkles,
  StickyNote,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ReceiptScannerModal } from '../Finance/ReceiptScannerModal';

interface QuickActionFabProps {
  setCurrentTab: (tab: string) => void;
  onTriggerAgendaModal?: (mode: 'task' | 'event') => void;
}

export const QuickActionFab: React.FC<QuickActionFabProps> = ({
  setCurrentTab,
  onTriggerAgendaModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { addDraftNote } = useApp();
  const [isQuickNoteModal, setIsQuickNoteModal] = useState(false);
  const [isReceiptModal, setIsReceiptModal] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');

  const handleAction = (tab: string) => {
    setCurrentTab(tab);
    setIsOpen(false);
  };

  const handleSaveQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteText.trim()) return;

    addDraftNote({
      title: quickNoteText.trim().split('\n')[0].slice(0, 40) || 'Rascunho Rápido',
      content: quickNoteText.trim(),
      color: '#fef08a',
    });

    setQuickNoteText('');
    setIsQuickNoteModal(false);
    setIsOpen(false);
  };

  return (
    <>
      {/* Backdrop overlay to dismiss speed dial when tapping outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className="fixed bottom-20 md:bottom-8 right-4 sm:right-6 z-40 flex flex-col items-end gap-2">
        {/* Speed Dial Options */}
        {isOpen && (
          <div className="flex flex-col items-end gap-2 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Scan Receipt with AI */}
            <button
              onClick={() => {
                setIsReceiptModal(true);
                setIsOpen(false);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-indigo-900 to-purple-900 text-white shadow-xl border border-indigo-500/30 hover:scale-105 transition-all cursor-pointer text-xs font-semibold group"
            >
              <span>Ler Nota com IA</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-amber-300 flex items-center justify-center group-hover:rotate-12 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
            </button>

            {/* Quick Draft */}
            <button
              onClick={() => {
                setIsQuickNoteModal(true);
                setIsOpen(false);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-all cursor-pointer text-xs font-semibold group"
            >
              <span>Novo Rascunho</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <StickyNote className="w-4 h-4" />
              </div>
            </button>

            {/* Agenda Event */}
            <button
              onClick={() => {
                if (onTriggerAgendaModal) {
                  onTriggerAgendaModal('event');
                  setIsOpen(false);
                } else {
                  handleAction('agenda');
                }
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-all cursor-pointer text-xs font-semibold group"
            >
              <span>Novo Evento na Agenda</span>
              <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CalendarPlus className="w-4 h-4" />
              </div>
            </button>

            {/* Transaction */}
            <button
              onClick={() => handleAction('financas')}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-all cursor-pointer text-xs font-semibold group"
            >
              <span>Nova Transação</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CircleDollarSign className="w-4 h-4" />
              </div>
            </button>

            {/* Task */}
            <button
              onClick={() => {
                if (onTriggerAgendaModal) {
                  onTriggerAgendaModal('task');
                  setIsOpen(false);
                } else {
                  handleAction('agenda');
                }
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-all cursor-pointer text-xs font-semibold group"
            >
              <span>Nova Tarefa</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckSquare className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}

        {/* Main Floating Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          title="Ação Rápida (+)"
          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all cursor-pointer ${
            isOpen
              ? 'bg-zinc-800 dark:bg-zinc-700 rotate-45 scale-95'
              : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30 hover:scale-105'
          }`}
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      </div>

      {/* Quick Note Modal from FAB */}
      {isQuickNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Rascunho Rápido
                </h3>
              </div>
              <button
                onClick={() => setIsQuickNoteModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickNote} className="mt-4 space-y-3">
              <textarea
                rows={4}
                required
                autoFocus
                placeholder="Escreva sua ideia, telefone, lembrete ou pensamento rápido..."
                value={quickNoteText}
                onChange={(e) => setQuickNoteText(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none"
              />

              <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsQuickNoteModal(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                >
                  Salvar Rascunho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Receipt Scanner Modal from FAB */}
      <ReceiptScannerModal
        isOpen={isReceiptModal}
        onClose={() => setIsReceiptModal(false)}
      />
    </>
  );
};
