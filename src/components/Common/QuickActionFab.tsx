import React, { useState } from 'react';
import {
  CalendarPlus,
  CheckSquare,
  CircleDollarSign,
  Plus,
  Sparkles,
  StickyNote,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../context/BackNavigationContext';
import { hapticImpactLight, hapticSelection } from '../../services/hapticsService';
import { ReceiptScannerModal } from '../Finance/ReceiptScannerModal';

interface QuickActionFabProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  setCurrentTab: (tab: string) => void;
  onTriggerAgendaModal?: (mode: 'task' | 'event') => void;
}

export const QuickActionFab: React.FC<QuickActionFabProps> = ({
  isOpen: controlledIsOpen,
  onOpenChange,
  setCurrentTab,
  onTriggerAgendaModal,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setOpen = (next: boolean) => {
    if (onOpenChange) {
      onOpenChange(next);
    } else {
      setInternalIsOpen(next);
    }
  };

  const { addDraftNote } = useApp();
  const [isQuickNoteModal, setIsQuickNoteModal] = useState(false);
  const [isReceiptModal, setIsReceiptModal] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [pinOnHome, setPinOnHome] = useState(true);

  useBackHandler(isOpen, () => {
    setOpen(false);
    return true;
  });

  useBackHandler(isQuickNoteModal, () => {
    setIsQuickNoteModal(false);
    return true;
  });

  const handleAction = (tab: string) => {
    setCurrentTab(tab);
    setOpen(false);
  };

  const handleSaveQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteText.trim()) return;

    hapticImpactLight();
    addDraftNote({
      title: quickNoteText.trim().split('\n')[0].slice(0, 40) || 'Rascunho Rápido',
      content: quickNoteText.trim(),
      color: '#FCE8DF',
      isPinned: pinOnHome,
    });

    setQuickNoteText('');
    setPinOnHome(true);
    setIsQuickNoteModal(false);
    setOpen(false);
  };

  return (
    <>
      {/* Backdrop overlay to dismiss speed dial when tapping outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/45 backdrop-blur-xs animate-backdrop-in"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Speed Dial Options: Centered above floating Nav Bar on mobile, anchored bottom-right on desktop */}
      {isOpen && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:bottom-26 md:right-8 z-40 w-[min(calc(100vw-2rem),310px)] md:w-auto flex flex-col items-stretch md:items-end gap-2">
          {/* Scan Receipt with AI */}
          <button
            type="button"
            onClick={() => {
              hapticSelection();
              setIsReceiptModal(true);
              setOpen(false);
            }}
            style={{ animationDelay: '80ms' }}
            className="animate-sheet-up pressable flex items-center justify-between md:justify-end gap-3 px-4 py-2.5 min-h-[46px] rounded-2xl bg-gradient-to-r from-[#C8634A] to-[#B45769] dark:from-[#F09D82] dark:to-[#E292A1] text-white dark:text-[#24120E] shadow-xl border border-white/15 hover:scale-[1.02] cursor-pointer text-xs font-semibold group"
          >
            <span>Ler Nota com IA</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 dark:bg-black/15 flex items-center justify-center group-hover:rotate-12 transition-transform shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
          </button>

          {/* Quick Draft */}
          <button
            type="button"
            onClick={() => {
              hapticSelection();
              setIsQuickNoteModal(true);
              setOpen(false);
            }}
            style={{ animationDelay: '60ms' }}
            className="animate-sheet-up pressable flex items-center justify-between md:justify-end gap-3 px-4 py-2.5 min-h-[46px] rounded-2xl bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 shadow-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer text-xs font-semibold group"
          >
            <span>Novo Rascunho</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <StickyNote className="w-4 h-4" />
            </div>
          </button>

          {/* Agenda Event */}
          <button
            type="button"
            onClick={() => {
              hapticSelection();
              if (onTriggerAgendaModal) {
                onTriggerAgendaModal('event');
                setOpen(false);
              } else {
                handleAction('agenda');
              }
            }}
            style={{ animationDelay: '40ms' }}
            className="animate-sheet-up pressable flex items-center justify-between md:justify-end gap-3 px-4 py-2.5 min-h-[46px] rounded-2xl bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 shadow-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer text-xs font-semibold group"
          >
            <span>Novo Evento na Agenda</span>
            <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <CalendarPlus className="w-4 h-4" />
            </div>
          </button>

          {/* Transaction */}
          <button
            type="button"
            onClick={() => {
              hapticSelection();
              handleAction('financas');
            }}
            style={{ animationDelay: '20ms' }}
            className="animate-sheet-up pressable flex items-center justify-between md:justify-end gap-3 px-4 py-2.5 min-h-[46px] rounded-2xl bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 shadow-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer text-xs font-semibold group"
          >
            <span>Nova Transação</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <CircleDollarSign className="w-4 h-4" />
            </div>
          </button>

          {/* Task */}
          <button
            type="button"
            onClick={() => {
              hapticSelection();
              if (onTriggerAgendaModal) {
                onTriggerAgendaModal('task');
                setOpen(false);
              } else {
                handleAction('agenda');
              }
            }}
            style={{ animationDelay: '0ms' }}
            className="animate-sheet-up pressable flex items-center justify-between md:justify-end gap-3 px-4 py-2.5 min-h-[46px] rounded-2xl bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 shadow-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer text-xs font-semibold group"
          >
            <span>Nova Tarefa</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Desktop-only Floating Trigger Button (mobile uses center + button in MobileNav) */}
      <div className="hidden md:flex fixed bottom-8 right-8 z-40">
        <button
          type="button"
          onClick={() => {
            hapticImpactLight();
            setOpen(!isOpen);
          }}
          title="Ação Rápida (+)"
          className={`pressable w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-transform duration-150 cursor-pointer ${
            isOpen
              ? 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-950 rotate-45 scale-95'
              : 'bg-gradient-to-br from-[#DC7B62] to-[#BE6272] dark:from-[#F2A68E] dark:to-[#E69BA7] text-white dark:text-[#24120E] shadow-indigo-600/25 hover:scale-105'
          }`}
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      </div>

      {/* Quick Note Modal from FAB */}
      {isQuickNoteModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              hapticSelection();
              setIsQuickNoteModal(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-backdrop-in keyboard-modal-backdrop"
        >
          <div className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:pb-6 keyboard-modal-sheet overflow-y-auto animate-bottom-sheet">
            <div className="sm:hidden w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mb-3 shrink-0" />
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Rascunho Rápido
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickNoteModal(false)}
                className="pressable p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 cursor-pointer"
                aria-label="Fechar"
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
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none"
              />

              <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={pinOnHome}
                  onChange={(e) => {
                    hapticSelection();
                    setPinOnHome(e.target.checked);
                  }}
                  className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                />
                <span>Fixar na tela inicial</span>
              </label>

              <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    hapticSelection();
                    setIsQuickNoteModal(false);
                  }}
                  className="pressable min-h-[40px] px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="pressable min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
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
