import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Loader2,
  Receipt,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { scanReceiptWithAI, ParsedReceiptData } from '../../services/receiptScannerService';
import { useApp } from '../../context/AppContext';
import { FinanceCategory } from '../../types';
import confetti from 'canvas-confetti';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addTransaction } = useApp();

  const [step, setStep] = useState<'upload' | 'scanning' | 'review'>('upload');
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parsed Form fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<FinanceCategory>('alimentacao');
  const [paymentMethod, setPaymentMethod] = useState<any>('cartao_credito');
  const [notes, setNotes] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelected = async (file: File) => {
    if (!file) return;

    // Show preview
    const previewUrl = URL.createObjectURL(file);
    setSelectedImagePreview(previewUrl);
    setErrorMsg(null);
    setStep('scanning');

    try {
      const data: ParsedReceiptData = await scanReceiptWithAI(file);

      // Populate review fields
      setTitle(data.title);
      setAmount(data.amount.toFixed(2));
      setDate(data.date);
      setCategory(data.category);
      setPaymentMethod(data.paymentMethod || 'cartao_credito');
      setNotes(data.notes || '');

      setStep('review');
    } catch (err: any) {
      console.error('Falha ao escanear recibo:', err);
      setErrorMsg(
        err.message || 'Não foi possível ler a nota fiscal. Tente uma foto mais nítida ou bem iluminada.'
      );
      setStep('upload');
    }
  };

  const handleConfirmAndSave = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount.replace(',', '.'));
    if (!title.trim() || isNaN(amountNum) || amountNum <= 0) return;

    addTransaction({
      type: 'despesa',
      title: title.trim(),
      amount: amountNum,
      category,
      date: date || new Date().toISOString().split('T')[0],
      paymentMethod,
      notes: notes.trim() || 'Lançado automaticamente via leitura de Nota Fiscal por IA',
      recurring: false,
    });

    confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
    onClose();
  };

  const resetAll = () => {
    setStep('upload');
    setSelectedImagePreview(null);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Leitor de Nota Fiscal com IA
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Gemini OCR
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Fotografe ou envie o comprovante para lançar automaticamente sua despesa
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">
              <span className="font-semibold block">Erro na leitura:</span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* STEP 1: Upload or Snap Photo */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-850/50 flex flex-col items-center justify-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  Clique ou arraste a imagem da Nota Fiscal
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Suporta fotos de cupons (NFC-e, SAT), DANFE, recibos em PNG, JPG ou WEBP
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Camera Button (for smartphones) */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Tirar Foto Agora</span>
              </button>

              {/* Upload file button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-zinc-500" />
                <span>Escolher da Galeria</span>
              </button>
            </div>

            {/* Hidden Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
            />
          </div>
        )}

        {/* STEP 2: Scanning in Progress */}
        {step === 'scanning' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center animate-pulse">
                <Sparkles className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            </div>
            <div>
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                A IA está analisando sua Nota Fiscal...
              </h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                Lendo estabelecimento, identificando valor total pago, data de emissão e categorizando sua despesa.
              </p>
            </div>
            {selectedImagePreview && (
              <div className="w-32 h-32 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-xs opacity-60">
                <img
                  src={selectedImagePreview}
                  alt="Prévia da nota"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Review & Confirm */}
        {step === 'review' && (
          <form onSubmit={handleConfirmAndSave} className="space-y-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Nota fiscal lida com sucesso! Confira e ajuste os dados abaixo se necessário:
              </span>
            </div>

            <div className="flex gap-4">
              {/* Thumbnail of receipt */}
              {selectedImagePreview && (
                <div className="w-24 h-24 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0">
                  <img
                    src={selectedImagePreview}
                    alt="Nota Fiscal"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Title / Establishment */}
              <div className="flex-1">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Estabelecimento / Loja *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Valor Total Pago (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 text-base rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-rose-600 dark:text-rose-400 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Data da Compra *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Categoria Sugerida
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none capitalize"
                >
                  <option value="alimentacao">Alimentação</option>
                  <option value="transporte">Transporte</option>
                  <option value="moradia">Moradia & Contas</option>
                  <option value="saude">Saúde</option>
                  <option value="educacao">Educação</option>
                  <option value="lazer">Lazer</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Forma de Pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="pix">Pix</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="transferencia">Transferência</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Itens Identificados na Nota
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Arroz, feijão, café..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none"
              />
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={resetAll}
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                Ler outra foto
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar e Lançar Despesa</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
