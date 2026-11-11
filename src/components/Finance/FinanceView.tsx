import React, { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Download,
  Filter,
  PieChart as PieChartIcon,
  PiggyBank,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FinanceCategory, Transaction, TransactionType } from '../../types';
import { ReceiptScannerModal } from './ReceiptScannerModal';

export const FinanceView: React.FC = () => {
  const {
    transactions,
    addTransaction,
    deleteTransaction,
    financialGoals,
    updateGoal,
    addGoal,
    deleteGoal,
    budgetLimits,
    updateBudgetLimit,
  } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterType, setFilterType] = useState<'all' | 'receita' | 'despesa'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedChartCategory, setSelectedChartCategory] = useState<string | null>(null);

  // New Transaction form
  const [txType, setTxType] = useState<TransactionType>('despesa');
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState<FinanceCategory>('alimentacao');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txPaymentMethod, setTxPaymentMethod] = useState<Transaction['paymentMethod']>('pix');
  const [txNotes, setTxNotes] = useState('');
  const [txRecurring, setTxRecurring] = useState(false);

  // New Goal form
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');
  const [goalDate, setGoalDate] = useState('2027-12-31');

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const currentMonthIndex = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const monthName = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(currentDate);

  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Filter transactions by current month and year
  const monthlyTransactions = transactions.filter((tx) => {
    const txDateObj = new Date(tx.date + 'T00:00:00');
    return (
      txDateObj.getMonth() === currentMonthIndex && txDateObj.getFullYear() === currentYear
    );
  });

  // Calculate totals
  const totalIncome = monthlyTransactions
    .filter((tx) => tx.type === 'receita')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpense = monthlyTransactions
    .filter((tx) => tx.type === 'despesa')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const balance = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0
      ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100))
      : 0;

  // Recurring (fixas) vs Variáveis
  const fixedExpenses = monthlyTransactions
    .filter((tx) => tx.type === 'despesa' && tx.recurring)
    .reduce((s, tx) => s + tx.amount, 0);
  const variableExpenses = totalExpense - fixedExpenses;

  // Filtered by type & search
  const visibleTransactions = monthlyTransactions.filter((tx) => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (searchQuery.trim()) {
      const match =
        tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.notes && tx.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!match) return false;
    }
    return true;
  });

  // Category totals for expenses
  const categoryExpenses: Record<string, number> = {};
  monthlyTransactions
    .filter((tx) => tx.type === 'despesa')
    .forEach((tx) => {
      categoryExpenses[tx.category] = (categoryExpenses[tx.category] || 0) + tx.amount;
    });

  const categoryColors: Record<string, string> = {
    moradia: '#6366f1',
    alimentacao: '#f59e0b',
    transporte: '#3b82f6',
    saude: '#10b981',
    lazer: '#ec4899',
    educacao: '#8b5cf6',
    outros: '#94a3b8',
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const getCategoryLabel = (cat: FinanceCategory) => {
    const map: Record<FinanceCategory, string> = {
      salario: 'Salário',
      investimentos: 'Investimentos',
      freelance: 'Freelance',
      moradia: 'Moradia & Contas',
      alimentacao: 'Alimentação',
      transporte: 'Transporte',
      saude: 'Saúde',
      educacao: 'Educação',
      lazer: 'Lazer & Cultura',
      outros: 'Outros',
    };
    return map[cat] || cat;
  };

  // Export CSV
  const exportToCSV = () => {
    if (monthlyTransactions.length === 0) {
      alert('Nenhuma transação encontrada no mês atual para exportar.');
      return;
    }

    const headers = ['Data', 'Tipo', 'Título', 'Categoria', 'Valor (R$)', 'Forma de Pagamento', 'Recorrente', 'Observações'];
    const rows = monthlyTransactions.map((tx) => [
      tx.date,
      tx.type === 'receita' ? 'Receita' : 'Despesa',
      `"${tx.title.replace(/"/g, '""')}"`,
      getCategoryLabel(tx.category),
      tx.amount.toFixed(2).replace('.', ','),
      tx.paymentMethod ? tx.paymentMethod.replace('_', ' ') : '',
      tx.recurring ? 'Sim' : 'Não',
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' + // UTF-8 BOM so Excel opens with correct accents
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Extrato_Financeiro_${currentYear}_${String(currentMonthIndex + 1).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(txAmount.replace(',', '.'));
    if (!txTitle.trim() || isNaN(amountNum) || amountNum <= 0) return;

    addTransaction({
      type: txType,
      title: txTitle.trim(),
      amount: amountNum,
      category: txCategory,
      date: txDate,
      paymentMethod: txPaymentMethod,
      notes: txNotes.trim() || undefined,
      recurring: txRecurring,
    });

    setTxTitle('');
    setTxAmount('');
    setTxNotes('');
    setTxRecurring(false);
    setIsAddModalOpen(false);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseFloat(goalTarget.replace(',', '.'));
    const currentNum = parseFloat(goalCurrent.replace(',', '.') || '0');
    if (!goalTitle.trim() || isNaN(targetNum) || targetNum <= 0) return;

    addGoal({
      title: goalTitle.trim(),
      targetAmount: targetNum,
      currentAmount: currentNum,
      targetDate: goalDate,
      category: 'investimentos',
      color: '#6366f1',
    });

    setGoalTitle('');
    setGoalTarget('');
    setGoalCurrent('');
    setIsGoalModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Month Selector Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Controle Financeiro
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {capitalizedMonth}
              </h2>
            </div>
          </div>

          {/* Month Stepper - Mobile right inline */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 sm:hidden">
            <button
              onClick={prevMonth}
              title="Mês anterior"
              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              title="Próximo mês"
              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Stepper - Desktop */}
          <div className="hidden sm:flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
            <button
              onClick={prevMonth}
              title="Mês anterior"
              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {currentDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
            </span>
            <button
              onClick={nextMonth}
              title="Próximo mês"
              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={exportToCSV}
            title="Exportar extrato em CSV para Excel ou Google Sheets"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            onClick={() => setIsBudgetModalOpen(true)}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Ajustar limites de orçamento"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsScannerOpen(true)}
            title="Escanear Nota Fiscal ou Cupom com Inteligência Artificial"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
            <span>Ler Nota</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Nova</span>
          </button>
        </div>
      </div>

      {/* KPI Cards - 2 cols on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Saldo Atual */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider truncate">Saldo</span>
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                balance >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div
            className={`text-lg sm:text-2xl font-bold tracking-tight truncate tabular-nums ${
              balance >= 0 ? 'text-zinc-900 dark:text-zinc-100' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatBRL(balance)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400">
            {balance >= 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                Superávit
              </span>
            ) : (
              <span className="text-rose-600 font-semibold flex items-center gap-0.5">
                <TrendingDown className="w-3 h-3" />
                Déficit
              </span>
            )}
          </div>
        </div>

        {/* Receitas */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider truncate">Receitas</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 truncate tabular-nums">
            {formatBRL(totalIncome)}
          </div>
          <p className="mt-1 text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400">
            {monthlyTransactions.filter((t) => t.type === 'receita').length} entrada(s)
          </p>
        </div>

        {/* Despesas */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider truncate">Despesas</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 truncate tabular-nums">
            {formatBRL(totalExpense)}
          </div>
          <div className="mt-1 text-[10px] sm:text-[11px] text-zinc-400 flex items-center gap-1.5 truncate">
            <span>Fix: {formatBRL(fixedExpenses)}</span>
            <span>•</span>
            <span>Var: {formatBRL(variableExpenses)}</span>
          </div>
        </div>

        {/* Taxa de Poupança */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider truncate">Poupança</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
              <PiggyBank className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 tabular-nums">
            {savingsRate}%
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, savingsRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Visual Expense Breakdown Chart + Category Budget Limits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Distribution Chart */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Distribuição de Gastos
              </h3>
            </div>
            <span className="text-xs text-zinc-400">{monthlyTransactions.filter(t => t.type === 'despesa').length} saídas</span>
          </div>

          {totalExpense === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400">
              Nenhuma despesa registrada no mês selecionado.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stacked Percentage Bar */}
              <div className="w-full h-4 rounded-xl overflow-hidden flex bg-zinc-100 dark:bg-zinc-800 shadow-inner">
                {Object.entries(categoryExpenses).map(([cat, amount]) => {
                  const pct = (amount / totalExpense) * 100;
                  const color = categoryColors[cat] || '#94a3b8';
                  return (
                    <div
                      key={cat}
                      style={{ width: `${pct}%`, backgroundColor: color }}
                      title={`${getCategoryLabel(cat as any)}: ${formatBRL(amount)} (${pct.toFixed(1)}%)`}
                      className="h-full transition-all hover:opacity-80 cursor-pointer"
                      onClick={() => setSelectedChartCategory(cat === selectedChartCategory ? null : cat)}
                    />
                  );
                })}
              </div>

              {/* Legend List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {Object.entries(categoryExpenses)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amount]) => {
                    const pct = Math.round((amount / totalExpense) * 100);
                    const color = categoryColors[cat] || '#94a3b8';
                    const isSelected = selectedChartCategory === cat;

                    return (
                      <div
                        key={cat}
                        onClick={() => setSelectedChartCategory(isSelected ? null : cat)}
                        className={`flex items-center justify-between text-xs p-2 rounded-xl transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-100 dark:bg-zinc-800 font-bold scale-[1.02]'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-850'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-zinc-800 dark:text-zinc-200">
                            {getCategoryLabel(cat as any)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-medium">
                          <span className="text-zinc-500">{pct}%</span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
                            {formatBRL(amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Category Budget Spending vs Limit */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Limites de Orçamento por Categoria
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Acompanhe e controle gastos antes de ultrapassar o limite planejado
              </p>
            </div>
            <button
              onClick={() => setIsBudgetModalOpen(true)}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
            >
              Ajustar Limites
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {(['moradia', 'alimentacao', 'transporte', 'saude', 'lazer', 'outros'] as FinanceCategory[]).map(
              (cat) => {
                const spent = categoryExpenses[cat] || 0;
                const budgetObj = budgetLimits.find((b) => b.category === cat);
                const limit = budgetObj?.monthlyLimit || 1000;
                const percent = Math.round((spent / limit) * 100);
                const isOver = spent > limit;

                return (
                  <div
                    key={cat}
                    className={`p-3.5 rounded-2xl border transition-colors ${
                      isOver
                        ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
                        : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-850'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {getCategoryLabel(cat)}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          isOver ? 'text-rose-600' : 'text-zinc-600 dark:text-zinc-300'
                        }`}
                      >
                        {percent}%
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-xs text-zinc-500 mb-2">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {formatBRL(spent)}
                      </span>
                      <span>Limite: {formatBRL(limit)}</span>
                    </div>

                    <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver
                            ? 'bg-rose-500'
                            : percent > 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>

                    {isOver && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1.5">
                        ⚠️ Limite excedido em {formatBRL(spent - limit)}
                      </p>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Financial Goals (Metas de Economia) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Metas Financeiras & Sonhos
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Objetivos de médio e longo prazo
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Meta
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {financialGoals.map((goal) => {
            const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));

            return (
              <div
                key={goal.id}
                className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850 relative group"
              >
                <div className="flex items-start justify-between">
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    {goal.title}
                  </h4>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="text-zinc-400 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-3 flex items-baseline justify-between text-xs">
                  <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                    {formatBRL(goal.currentAmount)}
                  </span>
                  <span className="text-zinc-500">Alvo: {formatBRL(goal.targetAmount)}</span>
                </div>

                <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="mt-2.5 flex items-center justify-between text-xs text-zinc-500">
                  <span>{percent}% alcançado</span>
                  <button
                    onClick={() => {
                      const addValue = prompt(`Quanto deseja adicionar à meta "${goal.title}"?`, '500');
                      if (addValue) {
                        const num = parseFloat(addValue.replace(',', '.'));
                        if (!isNaN(num) && num > 0) {
                          updateGoal(goal.id, { currentAmount: goal.currentAmount + num });
                        }
                      }
                    }}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    + Adicionar Valor
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Todas ({monthlyTransactions.length})
            </button>
            <button
              onClick={() => setFilterType('receita')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterType === 'receita'
                  ? 'bg-white dark:bg-zinc-700 text-emerald-600 font-semibold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Receitas
            </button>
            <button
              onClick={() => setFilterType('despesa')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterType === 'despesa'
                  ? 'bg-white dark:bg-zinc-700 text-rose-600 font-semibold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Despesas
            </button>
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar transações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>
        </div>

        {visibleTransactions.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 space-y-2">
            <CreditCard className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-medium">Nenhuma transação encontrada para este mês</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
            >
              Adicionar primeira transação
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {visibleTransactions.map((tx) => {
              const isIncome = tx.type === 'receita';
              const formattedDate = new Intl.DateTimeFormat('pt-BR', {
                day: 'numeric',
                month: 'short',
              }).format(new Date(tx.date + 'T00:00:00'));

              return (
                <div
                  key={tx.id}
                  className="py-3 flex items-center justify-between gap-4 group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowUpRight className="w-5 h-5" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {tx.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        <span className="capitalize">{getCategoryLabel(tx.category)}</span>
                        <span>•</span>
                        <span>{formattedDate}</span>
                        {tx.paymentMethod && (
                          <>
                            <span>•</span>
                            <span className="uppercase text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                              {tx.paymentMethod.replace('_', ' ')}
                            </span>
                          </>
                        )}
                        {tx.recurring && (
                          <>
                            <span>•</span>
                            <span className="text-[10px] font-medium text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                              Fixa
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm sm:text-base font-bold whitespace-nowrap ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {isIncome ? '+' : '-'} {formatBRL(tx.amount)}
                    </span>
                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      className="text-zinc-400 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Nova Transação
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTxType('despesa')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    txType === 'despesa'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  Despesa (Saída)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('receita')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    txType === 'receita'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  Receita (Entrada)
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Descrição da Transação *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Supermercado, Salário, Internet, Combustível"
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0,00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  >
                    <option value="moradia">Moradia & Contas</option>
                    <option value="alimentacao">Alimentação</option>
                    <option value="transporte">Transporte</option>
                    <option value="saude">Saúde</option>
                    <option value="educacao">Educação</option>
                    <option value="lazer">Lazer</option>
                    <option value="salario">Salário</option>
                    <option value="freelance">Freelance</option>
                    <option value="investimentos">Investimentos</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Método de Pagamento
                  </label>
                  <select
                    value={txPaymentMethod}
                    onChange={(e) => setTxPaymentMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  >
                    <option value="pix">Pix</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="transferencia">Transferência</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="txRecurringCheckbox"
                  checked={txRecurring}
                  onChange={(e) => setTxRecurring(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                />
                <label
                  htmlFor="txRecurringCheckbox"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  Despesa / Entrada Fixa Recorrente (todo mês)
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Notas / Observações
                </label>
                <input
                  type="text"
                  placeholder="Ex: Parcelado em 2x, compra no mercado central..."
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
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
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all cursor-pointer ${
                    txType === 'receita'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  Adicionar Transação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Adjust Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Limites de Orçamento Mensal
              </h3>
              <button
                onClick={() => setIsBudgetModalOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {(['moradia', 'alimentacao', 'transporte', 'saude', 'lazer', 'outros'] as FinanceCategory[]).map(
                (cat) => {
                  const currentLimit =
                    budgetLimits.find((b) => b.category === cat)?.monthlyLimit || 1000;
                  return (
                    <div key={cat} className="flex items-center justify-between gap-4">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {getCategoryLabel(cat)}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-400">R$</span>
                        <input
                          type="number"
                          step="50"
                          defaultValue={currentLimit}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= 0) {
                              updateBudgetLimit(cat, val);
                            }
                          }}
                          className="w-24 px-2 py-1 text-xs rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-right font-semibold"
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goal Create Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Nova Meta Financeira
              </h3>
              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Título da Meta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Reserva de Emergência, Carro Novo"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Valor Alvo (R$) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="10000"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Já Guardado (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Data Alvo
                </label>
                <input
                  type="date"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
};
