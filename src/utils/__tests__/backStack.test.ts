import { describe, expect, it, vi } from 'vitest';
import { createBackStack } from '../backStack';

describe('createBackStack (pilha LIFO do botão Voltar)', () => {
  it('retorna false quando não há nenhuma camada aberta', () => {
    const stack = createBackStack();
    expect(stack.size()).toBe(0);
    expect(stack.popAndInvoke()).toBe(false);
  });

  it('fecha sempre o modal aberto mais recentemente (ordem LIFO)', () => {
    const stack = createBackStack();
    const order: string[] = [];

    stack.register('drive-sync', () => {
      order.push('drive-sync');
    });
    stack.register('confirm-restore', () => {
      order.push('confirm-restore');
    });

    expect(stack.size()).toBe(2);
    expect(stack.peekId()).toBe('confirm-restore');

    expect(stack.popAndInvoke()).toBe(true);
    expect(order).toEqual(['confirm-restore']);
    expect(stack.size()).toBe(1);
    expect(stack.peekId()).toBe('drive-sync');

    expect(stack.popAndInvoke()).toBe(true);
    expect(order).toEqual(['confirm-restore', 'drive-sync']);
    expect(stack.size()).toBe(0);
  });

  it('mantém a camada na pilha e consome o evento quando o handler retorna false (ex.: leitura em curso)', () => {
    const stack = createBackStack();
    let isScanning = true;
    const closeMock = vi.fn(() => {
      if (isScanning) return false;
      return true;
    });

    stack.register('receipt-scanner', closeMock);

    // Enquanto escaneia, não fecha mas consome o botão Voltar para não sair do app
    expect(stack.popAndInvoke()).toBe(true);
    expect(stack.size()).toBe(1);
    expect(closeMock).toHaveBeenCalledTimes(1);

    // Após finalizar, o próximo Voltar fecha normalmente
    isScanning = false;
    expect(stack.popAndInvoke()).toBe(true);
    expect(stack.size()).toBe(0);
    expect(closeMock).toHaveBeenCalledTimes(2);
  });

  it('permite remover uma camada intermediária sem perder as demais', () => {
    const stack = createBackStack();
    const unregisterFirst = stack.register('fab-menu', () => {});
    stack.register('quick-note', () => {});

    unregisterFirst();
    expect(stack.size()).toBe(1);
    expect(stack.peekId()).toBe('quick-note');

    // Chamar unregister duas vezes não deve quebrar ou remover outra camada
    unregisterFirst();
    expect(stack.size()).toBe(1);
  });

  it('move o mesmo ID para o topo sem duplicar entradas ao reabrir', () => {
    const stack = createBackStack();
    stack.register('modal-a', () => {});
    stack.register('modal-b', () => {});
    stack.register('modal-a', () => {});

    expect(stack.size()).toBe(2);
    expect(stack.peekId()).toBe('modal-a');
  });
});
