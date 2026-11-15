import React from 'react';
import { RotateCcw, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { hapticImpactLight, hapticSelection } from '../../services/hapticsService';

export const ToastUndo: React.FC = () => {
  const { undoToast, clearUndoToast } = useApp();

  if (!undoToast) return null;

  return (
    <div className="fixed keyboard-toast-offset left-1/2 -translate-x-1/2 z-50 animate-sheet-up">
      <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 border border-zinc-800 dark:border-zinc-200">
        <span className="text-xs font-medium max-w-[210px] sm:max-w-xs truncate">
          {undoToast.message}
        </span>
        <button
          type="button"
          onClick={() => {
            hapticImpactLight();
            undoToast.onUndo();
            clearUndoToast();
          }}
          className="pressable flex items-center gap-1 px-3 h-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Desfazer</span>
        </button>
        <button
          type="button"
          onClick={() => {
            hapticSelection();
            clearUndoToast();
          }}
          aria-label="Fechar aviso"
          className="pressable text-zinc-400 hover:text-white dark:hover:text-zinc-900 p-1.5 rounded-lg cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
