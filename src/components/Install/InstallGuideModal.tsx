import React, { useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Copy,
  Database,
  Download,
  Github,
  Globe,
  Layers,
  Smartphone,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'apk' | 'pwa' | 'status'>('apk');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const gitCommands = `# 1. Inicialize o repositório git no seu projeto
git init
git add .
git commit -m "Primeiro commit - VidaOrganizada"

# 2. Conecte ao seu repositório no GitHub e envie
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/meu-vida-organizada.git
git push -u origin main`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Instalação no Celular & Empacotamento
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Transforme seu gerenciador em um aplicativo instalado no seu smartphone
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('apk')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'apk'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Github className="w-4 h-4" />
            <span>Gerar APK via GitHub Actions</span>
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'pwa'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Instalar Direto (PWA)</span>
          </button>

          <button
            onClick={() => setActiveTab('status')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'status'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Checklist IA & Banco</span>
          </button>
        </div>

        {/* Tab Content 1: APK via GitHub Actions */}
        {activeTab === 'apk' && (
          <div className="space-y-4 text-xs text-zinc-600 dark:text-zinc-300">
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50">
              <h4 className="font-bold text-indigo-950 dark:text-indigo-200 text-sm mb-1 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Seu projeto já está 100% configurado para o GitHub Actions!
              </h4>
              <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Criamos os arquivos <code className="font-mono bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.5 rounded text-[11px]">.github/workflows/build-apk.yml</code> e <code className="font-mono bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.5 rounded text-[11px]">capacitor.config.ts</code>. Quando você subir esse código no GitHub, a nuvem do GitHub compilará o APK do Android automaticamente sem você precisar instalar o Android Studio no seu computador.
              </p>
            </div>

            <h5 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs uppercase tracking-wider pt-2">
              Passo a Passo para Gerar e Baixar o APK:
            </h5>

            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </span>
                <div>
                  <strong className="text-zinc-900 dark:text-zinc-100">Crie um repositório no GitHub:</strong>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    Acesse <a href="https://github.com/new" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 underline font-medium">github.com/new</a> e crie um repositório novo (ex: <code>meu-vida-organizada</code>).
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <div className="flex-1">
                  <strong className="text-zinc-900 dark:text-zinc-100">Envie os arquivos para o GitHub:</strong>
                  <p className="text-zinc-500 dark:text-zinc-400 mb-2">
                    Execute estes comandos no terminal da pasta do seu projeto:
                  </p>
                  <div className="relative">
                    <pre className="p-3 bg-zinc-950 text-zinc-200 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed border border-zinc-800">
                      {gitCommands}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(gitCommands, 'git')}
                      className="absolute top-2 right-2 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCode === 'git' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </span>
                <div>
                  <strong className="text-zinc-900 dark:text-zinc-100">A esteira do GitHub Actions roda sozinha:</strong>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    No GitHub, clique na aba <strong>Actions</strong> no topo do repositório. Você verá o processo chamado <span className="font-semibold text-zinc-700 dark:text-zinc-300">"Compilar APK Android"</span> rodando. Leva cerca de 2 a 3 minutos.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  4
                </span>
                <div>
                  <strong className="text-zinc-900 dark:text-zinc-100">Baixe o APK para o celular:</strong>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    Quando o workflow concluir com sinal verde (✓), role até a seção <span className="font-semibold text-zinc-700 dark:text-zinc-300">Artifacts</span> e clique em <span className="font-semibold text-indigo-600 dark:text-indigo-400">VidaOrganizada-APK</span> para baixar o arquivo compactado com o <code>app-debug.apk</code>.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  5
                </span>
                <div>
                  <strong className="text-zinc-900 dark:text-zinc-100">Instalar no celular Android:</strong>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    Abra o arquivo baixado no celular e confirme a instalação (se solicitado, autorize instalar aplicativos de fontes desconhecidas para este arquivo de depuração pessoal).
                  </p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* Tab Content 2: PWA Instant Install */}
        {activeTab === 'pwa' && (
          <div className="space-y-4 text-xs text-zinc-600 dark:text-zinc-300">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
              <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Instalação Instantânea em 1 Clique (PWA)
              </h4>
              <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Você nem precisa compilar APK se não quiser! Como este aplicativo é uma Progressive Web App (PWA) completa com manifesto, ícone e tela cheia, você pode instalá-lo diretamente no navegador do seu smartphone em menos de 10 segundos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-2">
                <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <span>No Android (Google Chrome)</span>
                </div>
                <ol className="space-y-2 text-zinc-600 dark:text-zinc-400 pl-4 list-decimal">
                  <li>Abra o link do seu app no Google Chrome.</li>
                  <li>Toque nos <strong>três pontinhos (⋮)</strong> no canto superior direito.</li>
                  <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
                  <li>O ícone aparecerá junto aos seus outros aplicativos como um app nativo, abrindo sem a barra de navegação do navegador.</li>
                </ol>
              </div>

              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-2">
                <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  <Smartphone className="w-4 h-4 text-purple-600" />
                  <span>No iPhone / iPad (Safari)</span>
                </div>
                <ol className="space-y-2 text-zinc-600 dark:text-zinc-400 pl-4 list-decimal">
                  <li>Abra o link do app no navegador Safari.</li>
                  <li>Toque no botão <strong>Compartilhar</strong> (quadrado com seta para cima na barra inferior).</li>
                  <li>Role e selecione <strong>"Adicionar à Tela de Início"</strong>.</li>
                  <li>Toque em "Adicionar". O app funcionará em modo tela cheia independente.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 3: Status da IA & Banco de Dados */}
        {activeTab === 'status' && (
          <div className="space-y-4 text-xs text-zinc-600 dark:text-zinc-300">
            <div className="grid grid-cols-1 gap-3">
              {/* IA status */}
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      Inteligência Artificial (Google Gemini)
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Preparada & Ativa
                  </span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Backend com <strong>Gemini 3.8 Flash</strong> configurado no servidor em <code className="font-mono bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-[11px]">POST /api/gemini/parse-receipt</code> com suporte a CORS para o app instalado, extraindo automaticamente loja, valor total, data de emissão, categoria e forma de pagamento de fotos de notas fiscais.
                </p>
              </div>

              {/* Database status */}
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Database className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      Banco de Dados & Sincronização
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Offline-First + Google Drive
                  </span>
                </div>
                <div className="space-y-2 text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  <p>
                    <strong>Como funciona:</strong> Seus dados são salvos instantaneamente no armazenamento local do dispositivo (funciona 100% offline). Ao conectar com sua conta Google, ele sincroniza automaticamente com o arquivo seguro <code className="font-mono bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-[11px]">VidaOrganizada_Data.json</code> no seu Google Drive.
                  </p>
                  <p>
                    <strong>Vantagens:</strong> Total privacidade (os dados são seus, na sua conta Google), custo zero de servidores e sincronização entre celular e computador. Você também pode exportar e importar arquivos de backup em formato JSON quando desejar.
                  </p>
                </div>
              </div>

              {/* Agenda & Tasks */}
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Globe className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      Google Calendar & Google Tasks
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    OAuth 2.0 Habilitado
                  </span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Credenciais OAuth configuradas para os escopos de Drive, Calendar e Tasks, permitindo salvar eventos na agenda real do seu celular/computador.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">
            Capacitor 8 + GitHub Actions CI/CD configurados
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-md transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
