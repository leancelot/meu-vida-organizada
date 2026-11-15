import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/Common/ErrorBoundary.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = typeof reason?.message === 'string' ? reason.message : String(reason || '');
    const stack = typeof reason?.stack === 'string' ? reason.stack : '';

    // Ignora erros transitórios de WebSocket do Vite/HMR quando o ambiente de preview desativa HMR
    if (
      message.includes('WebSocket closed without opened') ||
      stack.includes('@vite/client')
    ) {
      event.preventDefault();
      return;
    }

    console.error('Promessa assíncrona não tratada:', reason);
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
