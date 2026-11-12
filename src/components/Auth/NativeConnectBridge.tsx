import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { googleSignIn } from '../../services/firebase';
import { CheckCircle2, Smartphone, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

export const NativeConnectBridge: React.FC = () => {
  const { user, accessToken } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        // Redireciona imediatamente para o app nativo
        const deepLink = `com.vidaorganizada.app://oauth#access_token=${res.accessToken}`;
        window.location.href = deepLink;
      }
    } catch (err: any) {
      console.error('Erro na autenticação:', err);
      setErrorMsg('Não foi possível autenticar com o Google. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnToApp = () => {
    if (accessToken) {
      window.location.href = `com.vidaorganizada.app://oauth#access_token=${accessToken}`;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
        {/* Ícone */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
          <Smartphone className="w-8 h-8" />
        </div>

        {/* Título & Descrição */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Conectar VidaOrganizada
          </h1>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            Faça login com sua Conta Google para sincronizar suas tarefas, finanças e Google Agenda no aplicativo Android.
          </p>
        </div>

        {/* Status de Autenticação */}
        {accessToken && user ? (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 space-y-3">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Autenticado com Sucesso!</span>
            </div>
            <p className="text-xs text-zinc-400">
              Conectado como <strong>{user.email || user.displayName}</strong>
            </p>
            <button
              onClick={handleReturnToApp}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <span>Voltar para o Aplicativo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-900 font-semibold text-sm flex items-center justify-center gap-3 shadow-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Entrar com a Conta Google</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Garantia de Privacidade */}
        <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-center gap-2 text-xs text-zinc-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Autenticação segura via Google Workspace</span>
        </div>
      </div>
    </div>
  );
};
