export type BackHandlerFn = () => boolean | void;

export interface BackStackEntry {
  id: string;
  handler: BackHandlerFn;
}

export interface BackStackManager {
  register: (id: string, handler: BackHandlerFn) => () => void;
  popAndInvoke: () => boolean;
  size: () => number;
  peekId: () => string | null;
  clear: () => void;
}

/**
 * Pilha LIFO para camadas/modais ativos.
 * Garante que o botão Voltar (Android) ou Escape (Desktop) feche sempre a camada mais recente.
 */
export function createBackStack(): BackStackManager {
  let stack: BackStackEntry[] = [];

  const unregister = (target: BackStackEntry) => {
    stack = stack.filter((entry) => entry !== target);
  };

  const register = (id: string, handler: BackHandlerFn): (() => void) => {
    // Evita duplicatas mantendo ordem limpa caso o mesmo ID re-registre
    stack = stack.filter((entry) => entry.id !== id);
    const entry: BackStackEntry = { id, handler };
    stack = [...stack, entry];

    return () => {
      unregister(entry);
    };
  };

  const popAndInvoke = (): boolean => {
    if (stack.length === 0) {
      return false;
    }

    const top = stack[stack.length - 1];
    const result = top.handler();

    // Quando handler retorna `false`, o modal bloqueou o fechamento (ex.: upload/scan em curso),
    // mas o pressionar do botão Voltar foi consumido para não sair da tela por engano.
    if (result !== false) {
      unregister(top);
    }

    return true;
  };

  const size = (): number => stack.length;

  const peekId = (): string | null => {
    if (stack.length === 0) return null;
    return stack[stack.length - 1].id;
  };

  const clear = () => {
    stack = [];
  };

  return {
    register,
    popAndInvoke,
    size,
    peekId,
    clear,
  };
}
