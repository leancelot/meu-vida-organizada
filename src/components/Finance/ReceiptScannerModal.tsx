import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Receipt,
  RefreshCw,
  Send,
  Sparkles,
  Upload,
  WifiOff,
  X,
} from 'lucide-react';
import {
  formatDiagnosticsReport,
  ReceiptScanDiagnostics,
  ReceiptScanError,
  scanReceiptWithAI,
} from '../../services/receiptScannerService';
import { useApp } from '../../context/AppContext';
import { FinanceCategory, Transaction } from '../../types';
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
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<ReceiptScanDiagnostics | null>(null);
  const [scanSource, setScanSource] = useState<'ai' | 'offline_ocr'>('ai');
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const [copiedLog, setCopiedLog] = useState(false);

  // Parsed Form fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<FinanceCategory>('alimentacao');
  const [paymentMethod, setPaymentMethod] = useState<Transaction['paymentMethod']>('cartao_credito');
  const [notes, setNotes] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelected = async (file: File) => {
    if (!file) return;

    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedImagePreview(previewUrl);
    setLastFile(file);
    setErrorMsg(null);
    setDiagnostics(null);
    setIsLogExpanded(false);
    setCopiedLog(false);
    setStep('scanning');

    try {
      const result = await scanReceiptWithAI(file);
      const { data, source, diagnostics: scanDiag } = result;

      setTitle(data.title);
      setAmount(data.amount > 0 ? data.amount.toFixed(2) : '');
      setDate(data.date);
      setCategory(data.category);
      setPaymentMethod(data.paymentMethod || 'cartao_credito');
      setNotes(data.notes || '');
      setScanSource(source);
      setDiagnostics(scanDiag);

      setStep('review');
    } catch (err: any) {
      console.error('Falha ao escanear recibo:', err);
      if (err instanceof ReceiptScanError) {
        setDiagnostics(err.diagnostics);
      } else {
        setDiagnostics({
          timestamp: new Date().toISOString(),
          platform: typeof window !== 'undefined' ? window.location.origin : 'App',
          endpoint: '/api/gemini/parse-receipt',
          serverErrorSummary: err?.message || 'Erro desconhecido ao ler imagem',
          offlineAttempted: false,
          offlineStatus: 'failed',
        });
      }
      setErrorMsg(
        err?.message || 'Não foi possível ler a nota fiscal. Tente novamente ou preencha manualmente.'
      );
      setStep('upload');
    }
  };

  const handleRetryScan = () => {
    if (!lastFile) return;
    handleFileSelected(lastFile);
  };

  const handleManualFallback = () => {
    setErrorMsg(null);
    setTitle('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('alimentacao');
    setPaymentMethod('cartao_credito');
    setNotes('');
    setScanSource('offline_ocr');
    setStep('review');
  };

  const handleCopyLog = async () => {
    if (!diagnostics) return;
    const report = formatDiagnosticsReport(diagnostics);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(report);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = report;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedLog(true);
      setTimeout(() => setCopiedLog(false), 2500);
    } catch (e) {
      console.warn('Não foi possível copiar o log:', e);
    }
  };

  const handleReportLog = async () => {
    if (!diagnostics) return;
    const report = formatDiagnosticsReport(diagnostics);

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Log de Leitura de Nota Fiscal - VidaOrganizada',
          text: report,
        });
        return;
      } catch {
        // User cancelled or share unsupported for text -> fallback to mailto link below
      }
    }

    const subject = encodeURIComponent(
      `Relatório de Leitura NF (${diagnostics.errorCode || diagnostics.httpStatus || 'Erro'})`
    );
    const body = encodeURIComponent(report);
    const link = document.createElement('a');
    link.href = `mailto:?subject=${subject}&body=${body}`;
    link.click();
  };

  const resetAll = () => {
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }
    setStep('upload');
    setSelectedImagePreview(null);
    setLastFile(null);
    setErrorMsg(null);
    setDiagnostics(null);
    setIsLogExpanded(false);
    setCopiedLog(false);
  };

  const handleClose = () => {
    resetAll();
    onClose();
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
      notes:
        notes.trim() ||
        (scanSource === 'offline_ocr'
          ? 'Lançado via leitura offline de Nota Fiscal'
          : 'Lançado automaticamente via leitura de Nota Fiscal por IA'),
      recurring: false,
    });

    confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
    resetAll();
    onClose();
  };

  const renderExpandableDiagnostics = (variant: 'error' | 'warning') => {
    if (!diagnostics) return null;

    const borderClass =
      variant === 'error'
        ? 'border-rose-200 dark:border-rose-800/70'
        : 'border-amber-200 dark:border-amber-800/70';

    return (
      <div className={`pt-2 border-t ${borderClass} space-y-2.5`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsLogExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold underline cursor-pointer"
          >
            {isLogExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            <span>{isLogExpanded ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos (Log)'}</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyLog}
              className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] rounded-lg border border-current/25 bg-white/80 dark:bg-zinc-900/70 text-[11px] font-semibold cursor-pointer hover:bg-white dark:hover:bg-zinc-900 transition-colors"
            >
              {copiedLog ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedLog ? 'Copiado!' : 'Copiar log'}</span>
            </button>

            <button
              type="button"
              onClick={handleReportLog}
              className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] rounded-lg border border-current/25 bg-white/80 dark:bg-zinc-900/70 text-[11px] font-semibold cursor-pointer hover:bg-white dark:hover:bg-zinc-900 transition-colors"
            >
              <Send className="w-3 h-3" />
              <span>Reportar</span>
            </button>
          </div>
        </div>

        {isLogExpanded && (
          <div className="p-3 rounded-xl bg-white/90 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 font-mono text-[11px] text-zinc-700 dark:text-zinc-300 space-y-1 break-all tabular-nums">
            <div>
              <strong>Plataforma:</strong> {diagnostics.platform}
            </div>
            <div>
              <strong>URL:</strong> {diagnostics.endpoint}
            </div>
            <div>
              <strong>HTTP / Código:</strong>{' '}
              {diagnostics.httpStatus !== undefined ? diagnostics.httpStatus : 'Sem resposta'}{' '}
              {diagnostics.errorCode ? `(${diagnostics.errorCode})` : ''}
            </div>
            <div>
              <strong>Servidor:</strong> {diagnostics.serverErrorSummary}
            </div>
            {diagnostics.serverResponseSnippet && (
              <div>
                <strong>Resposta:</strong> {diagnostics.serverResponseSnippet}
              </div>
            )}
            <div>
              <strong>OCR Offline:</strong> {diagnostics.offlineStatus}
              {diagnostics.offlineEngine ? ` (${diagnostics.offlineEngine})` : ''}
              {diagnostics.offlineDetail ? ` — ${diagnostics.offlineDetail}` : ''}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto relative">
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Leitor de Nota Fiscal com IA
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Gemini + Offline OCR
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Fotografe ou envie o comprovante para lançar automaticamente sua despesa
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-3 text-xs text-rose-800 dark:text-rose-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div className="flex-1">
                <span className="font-semibold block">Erro na leitura</span>
                <span>{errorMsg}</span>
              </div>
            </div>

            {step === 'upload' && (
              <div className="flex items-center gap-2 flex-wrap pl-6">
                {lastFile && (
                  <button
                    type="button"
                    onClick={handleRetryScan}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Tentar novamente</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleManualFallback}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-zinc-900 text-rose-700 dark:text-rose-300 hover:bg-rose-100/60 dark:hover:bg-rose-950/50 font-semibold cursor-pointer transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Preencher manualmente</span>
                </button>
              </div>
            )}

            {renderExpandableDiagnostics('error')}
          </div>
        )}

        {/* STEP 1: Upload or Snap Photo */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-800/40 flex flex-col items-center justify-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  Clique ou arraste a imagem da Nota Fiscal
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Suporta fotos de cupons (NFC-e, SAT), DANFE e recibos em PNG, JPG ou WEBP
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-3 px-4 min-h-[44px] rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Tirar Foto Agora</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-3 px-4 min-h-[44px] rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-zinc-500" />
                <span>Escolher da Galeria</span>
              </button>
            </div>

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
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
            <div>
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Analisando sua Nota Fiscal...
              </h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                Extraindo estabelecimento, valor total, data de emissão e categoria da despesa.
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
            {scanSource === 'offline_ocr' && diagnostics ? (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2 text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-start gap-2 font-medium">
                  <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Servidor de IA indisponível — dados extraídos pelo leitor offline do aparelho. Confira os valores antes de salvar.
                  </span>
                </div>
                {renderExpandableDiagnostics('warning')}
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Nota fiscal lida com sucesso! Confira e ajuste os dados abaixo se necessário:
                </span>
              </div>
            )}

            <div className="flex gap-4">
              {selectedImagePreview && (
                <div className="w-24 h-24 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0">
                  <img
                    src={selectedImagePreview}
                    alt="Nota Fiscal"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex-1">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Estabelecimento / Loja *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nome do estabelecimento"
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
                  placeholder="Valor"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 text-base rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-rose-600 dark:text-rose-400 font-bold tabular-nums focus:outline-none"
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
                  onChange={(e) => setCategory(e.target.value as FinanceCategory)}
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
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as Transaction['paymentMethod'])
                  }
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
                placeholder="Itens ou observações do comprovante"
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
                  onClick={handleClose}
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
