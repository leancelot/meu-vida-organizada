import React from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Download, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  componentStack: string;
  showDetails: boolean;
  backupStatus: string | null;
}

const LOCAL_DATA_KEY = 'vidaorganizada_local_data_v2';

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      componentStack: '',
      showDetails: false,
      backupStatus: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error?.message || 'Erro inesperado na interface',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary capturou falha na interface:', error, errorInfo);
    this.setState({
      componentStack: errorInfo?.componentStack?.trim() || '',
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      errorMessage: '',
      componentStack: '',
      showDetails: false,
      backupStatus: null,
    });
  };

  handleDownloadLocalBackup = () => {
    try {
      const raw = localStorage.getItem(LOCAL_DATA_KEY);
      if (!raw) {
        this.setState({
          backupStatus: 'Nenhum registro local encontrado para exportar ainda.',
        });
        return;
      }

      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `VidaOrganizada_Resgate_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      this.setState({
        backupStatus: 'Arquivo de backup salvo com sucesso.',
      });
    } catch {
      this.setState({
        backupStatus: 'Não foi possível gerar o arquivo agora, mas seus dados continuam salvos no aparelho.',
      });
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-4 pt-[max(1.5rem,env(safe-area-inset-top,0px))] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] font-sans">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Algo inesperado aconteceu
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Ocorreu uma falha temporária ao exibir esta tela. Seus dados locais continuam salvos com segurança no aparelho.
            </p>
          </div>

          {this.state.backupStatus && (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3.5 py-2.5">
              {this.state.backupStatus}
            </p>
          )}

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={this.handleReset}
              className="pressable w-full min-h-[46px] px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tentar novamente</span>
            </button>

            <button
              type="button"
              onClick={this.handleDownloadLocalBackup}
              className="pressable w-full min-h-[44px] px-4 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar backup dos dados locais</span>
            </button>
          </div>

          {(this.state.errorMessage || this.state.componentStack) && (
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                {this.state.showDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>{this.state.showDetails ? 'Ocultar detalhes técnicos' : 'Detalhes técnicos'}</span>
              </button>

              {this.state.showDetails && (
                <div className="mt-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1.5 max-h-40 overflow-y-auto break-words">
                  <div>{this.state.errorMessage}</div>
                  {this.state.componentStack && (
                    <pre className="whitespace-pre-wrap text-[10px] opacity-80">
                      {this.state.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}
