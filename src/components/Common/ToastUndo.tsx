import React from 'react';
import { RotateCcw, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ToastUndo: React.FC = () => {
  const { undoToast, clearUndoToast } = useApp();

  if (!undoToast) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-zinc-800 dark:border-zinc-200">
        <span className="text-xs font-medium max-w-xs truncate">
          {undoToast.message}
        </span>
        <button
          onClick={() => {
            undoToast.onUndo();
            clearUndoToast();
          }}
          className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Desfazer</span>
        </button>
        <button
          onClick={clearUndoToast}
          className="text-zinc-400 hover:text-white dark:hover:text-zinc-900 p-1 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
