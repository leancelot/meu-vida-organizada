import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
} from 'react';
import { BackHandlerFn, createBackStack } from '../utils/backStack';
import { hapticSelection } from '../services/hapticsService';

interface BackNavigationContextValue {
  registerBackHandler: (id: string, handler: BackHandlerFn) => () => void;
  handleTopBackPress: () => boolean;
}

const BackNavigationContext = createContext<BackNavigationContextValue | null>(null);

export const BackNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const stackRef = useRef(createBackStack());

  const registerBackHandler = useCallback((id: string, handler: BackHandlerFn) => {
    return stackRef.current.register(id, handler);
  }, []);

  const handleTopBackPress = useCallback((): boolean => {
    const handled = stackRef.current.popAndInvoke();
    if (handled) {
      hapticSelection();
    }
    return handled;
  }, []);

  // Suporte também à tecla Escape em desktop / teclados físicos conectados ao Android
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (stackRef.current.size() === 0) return;

      const handled = handleTopBackPress();
      if (handled) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [handleTopBackPress]);

  return (
    <BackNavigationContext.Provider value={{ registerBackHandler, handleTopBackPress }}>
      {children}
    </BackNavigationContext.Provider>
  );
};

export const useBackNavigation = () => {
  return useContext(BackNavigationContext);
};

/**
 * Registra uma camada aberta (modal, bottom sheet, menu) na pilha global de retorno.
 * Enquanto `isActive` for `true`, o botão Voltar do Android (ou Escape) fecha esta camada antes de navegar ou sair.
 */
export function useBackHandler(isActive: boolean, onBack: BackHandlerFn): void {
  const ctx = useContext(BackNavigationContext);
  const id = useId();
  const callbackRef = useRef<BackHandlerFn>(onBack);

  useEffect(() => {
    callbackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!ctx || !isActive) return;

    const unregister = ctx.registerBackHandler(id, () => callbackRef.current());
    return unregister;
  }, [ctx, id, isActive]);
}
