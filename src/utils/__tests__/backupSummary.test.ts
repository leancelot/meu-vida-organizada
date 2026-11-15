import { describe, expect, it } from 'vitest';
import { hasMeaningfulLocalData, summarizePayloadCounts } from '../backupSummary';

describe('backupSummary utilities', () => {
  it('resume corretamente payloads vazios', () => {
    const summary = summarizePayloadCounts({});
    expect(summary).toEqual({
      tasksCount: 0,
      transactionsCount: 0,
      goalsCount: 0,
      notesCount: 0,
      pendingBankCount: 0,
      totalItems: 0,
      lastUpdated: null,
      userName: '',
    });
  });

  it('resume contagens reais e normaliza o nome do usuário', () => {
    const summary = summarizePayloadCounts({
      userName: '  Maria Clara  ',
      lastUpdated: '2026-11-15T10:00:00.000Z',
      tasks: [
        {
          id: 't1',
          title: 'Revisar contas',
          dueDate: '2026-11-16',
          priority: 'high',
          category: 'financas',
          completed: false,
          subtasks: [],
        },
      ],
      transactions: [
        {
          id: 'tx1',
          type: 'despesa',
          title: 'Mercado',
          amount: 120,
          category: 'alimentacao',
          date: '2026-11-15',
          paymentMethod: 'pix',
        },
        {
          id: 'tx2',
          type: 'receita',
          title: 'Salário',
          amount: 5000,
          category: 'salario',
          date: '2026-11-10',
          paymentMethod: 'transferencia',
        },
      ],
      financialGoals: [],
      draftNotes: [
        {
          id: 'd1',
          title: 'Lista',
          content: 'Itens',
          updatedAt: '2026-11-15T09:00:00.000Z',
          color: 'sand',
          isPinned: false,
        },
      ],
    });

    expect(summary.tasksCount).toBe(1);
    expect(summary.transactionsCount).toBe(2);
    expect(summary.goalsCount).toBe(0);
    expect(summary.notesCount).toBe(1);
    expect(summary.totalItems).toBe(4);
    expect(summary.userName).toBe('Maria Clara');
    expect(summary.lastUpdated).toBe('2026-11-15T10:00:00.000Z');
  });

  it('detecta presença de dados locais apenas quando existem registros', () => {
    expect(
      hasMeaningfulLocalData({
        tasks: [],
        transactions: [],
        financialGoals: [],
        draftNotes: [],
        pendingBankNotifications: [],
      })
    ).toBe(false);

    expect(
      hasMeaningfulLocalData({
        tasks: [
          {
            id: 't1',
            title: 'Tarefa',
            dueDate: '2026-11-15',
            priority: 'medium',
            category: 'pessoal',
            completed: false,
            subtasks: [],
          },
        ],
        transactions: [],
        financialGoals: [],
        draftNotes: [],
      })
    ).toBe(true);

    expect(
      hasMeaningfulLocalData({
        tasks: [],
        transactions: [],
        financialGoals: [],
        draftNotes: [],
        pendingBankNotifications: [
          {
            id: 'b1',
            rawText: 'Compra aprovada R$ 20,00',
            bankName: 'Nubank',
            title: 'Compra',
            amount: 20,
            type: 'despesa',
            category: 'outros',
            paymentMethod: 'cartao_credito',
            date: '2026-11-15',
            receivedAt: '2026-11-15T10:00:00.000Z',
            source: 'android',
            signature: 'sig-1',
          },
        ],
      })
    ).toBe(true);
  });
});
