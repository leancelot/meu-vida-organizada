import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Cloud,
  CloudCheck,
  Copy,
  Cpu,
  Database,
  Download,
  ExternalLink,
  FileCode,
  FolderGit2,
  GitBranch,
  GitCommit,
  Github,
  HardDrive,
  Info,
  Key,
  Layers,
  Moon,
  Package,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  checkForGitHubUpdates,
  compareVersions,
  CURRENT_APP_VERSION,
  DEFAULT_GITHUB_REPO,
  getStoredGitHubConfig,
  refreshAppCache,
  saveGitHubConfig,
  UpdateCheckResult,
} from '../../services/githubUpdateService';

interface SettingsViewProps {
  openSyncModal: () => void;
  openInstallModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  openSyncModal,
  openInstallModal,
}) => {
  const {
    theme,
    toggleTheme,
    user,
    driveSyncInfo,
    tasks,
    transactions,
    financialGoals,
    draftNotes,
    exportBackupJson,
    importBackupJson,
    notificationPermission,
    enableNotifications,
  } = useApp();

  // GitHub config state
  const [repoInput, setRepoInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [autoCheck, setAutoCheck] = useState(true);
  const [showTokenField, setShowTokenField] = useState(false);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // Update check state
  const [isChecking, setIsChecking] = useState(false);
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [showChangelog, setShowChangelog] = useState(true);
  const [showCommits, setShowCommits] = useState(false);

  // File input for JSON backup import
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load initial settings
  useEffect(() => {
    const config = getStoredGitHubConfig();
    setRepoInput(config.repo);
    setTokenInput(config.token);
    setAutoCheck(config.autoCheck);
    setUpdateResult(config.lastResult);

    // If auto check is enabled and there is no recent result, perform an initial check
    if (config.autoCheck && !config.lastResult) {
      handleCheckUpdates(config.repo, config.token);
    }
  }, []);

  const handleSaveConfig = () => {
    saveGitHubConfig(repoInput, tokenInput, autoCheck);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2500);
  };

  const handleCheckUpdates = async (repoToUse?: string, tokenToUse?: string) => {
    const targetRepo = repoToUse || repoInput || DEFAULT_GITHUB_REPO;
    const targetToken = tokenToUse !== undefined ? tokenToUse : tokenInput;

    setIsChecking(true);
    try {
      const result = await checkForGitHubUpdates(targetRepo, targetToken, CURRENT_APP_VERSION);
      setUpdateResult(result);
    } catch (err: any) {
      console.error('Falha ao verificar atualizações no GitHub:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleHardRefresh = async () => {
    if (confirm('Deseja recarregar o aplicativo e limpar o cache local para puxar a versão mais recente?')) {
      setIsRefreshingCache(true);
      await refreshAppCache();
    }
  };

  // Estimate local storage usage
  const approxStorageBytes = (() => {
    try {
      let total = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += (localStorage[key].length + key.length) * 2;
        }
      }
      return (total / 1024).toFixed(1);
    } catch {
      return '0';
    }
  })();

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <FolderGit2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  Configurações & Atualizações
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900">
                  {CURRENT_APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Gerencie atualizações direto do GitHub, sincronização em nuvem e preferências do sistema
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCheckUpdates()}
              disabled={isChecking}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Verificando GitHub...' : 'Verificar Atualizações'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* GitHub Updates Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Atualizações pelo GitHub
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Puxe novas versões, lançamentos de APK e acompanhe os commits do seu repositório
              </p>
            </div>
          </div>

          {updateResult?.checkedAt && (
            <span className="text-[11px] text-zinc-400 hidden sm:inline-block">
              Última checagem: {new Date(updateResult.checkedAt).toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>

        {/* Update Status Banner */}
        {updateResult && (
          <div>
            {updateResult.hasUpdate ? (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200 dark:border-indigo-800/80 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-bounce" />
                    <span>Nova versão disponível: {updateResult.latestVersion}</span>
                    <span className="text-xs font-normal opacity-80">
                      (Você está na {CURRENT_APP_VERSION})
                    </span>
                  </div>
                  {updateResult.latestRelease && (
                    <span className="text-[11px] text-zinc-500">
                      Publicada em: {new Date(updateResult.latestRelease.published_at).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  Uma nova versão do <strong>VidaOrganizada</strong> foi publicada no GitHub. Você pode baixar o APK compilado ou visualizar os detalhes no repositório.
                </p>

                <div className="flex items-center gap-3 pt-1 flex-wrap">
                  {updateResult.apkAsset ? (
                    <a
                      href={updateResult.apkAsset.browser_download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Baixar APK ({formatFileSize(updateResult.apkAsset.size)})</span>
                    </a>
                  ) : (
                    <a
                      href={updateResult.actionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-colors"
                    >
                      <Package className="w-4 h-4" />
                      <span>Baixar APK no GitHub Actions</span>
                    </a>
                  )}

                  {updateResult.latestRelease?.html_url && (
                    <a
                      href={updateResult.latestRelease.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors"
                    >
                      <span>Ver Release no GitHub</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ) : updateResult.error ? (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    Aviso ao conectar com o GitHub
                  </p>
                  <p className="text-amber-800 dark:text-amber-300">
                    {updateResult.error}
                  </p>
                  <p className="text-amber-700 dark:text-amber-400 text-[11px] pt-1">
                    Dica: Certifique-se de que o repositório foi criado e os commits foram enviados (veja o guia de empacotamento no botão "Instalar App").
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Você está na versão mais recente ({CURRENT_APP_VERSION})
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Não há novas versões publicadas pendentes para o repositório configurado.
                    </p>
                  </div>
                </div>

                <a
                  href={updateResult.actionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline flex items-center gap-1"
                >
                  <span>Ver builds de APK no GitHub Actions</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Repository Settings Form */}
        <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Configuração do Repositório do GitHub</span>
            </h3>

            {isSavedNotice && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Configurações salvas!
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Repositório GitHub (usuario/repositorio)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 text-xs font-mono">
                    github.com/
                  </span>
                  <input
                    type="text"
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    placeholder="souoleandro/meu-vida-organizada"
                    className="w-full pl-24 pr-3 py-2.5 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <button
                  onClick={handleSaveConfig}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Configuração</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Exemplo: se sua conta no GitHub for <code>souoleandro</code> e o repo for <code>vida-organizada</code>, use <code>souoleandro/vida-organizada</code>.
              </p>
            </div>

            {/* Token toggle */}
            <div>
              <button
                onClick={() => setShowTokenField(!showTokenField)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Key className="w-3 h-3" />
                <span>
                  {showTokenField
                    ? 'Ocultar Token de Acesso do GitHub'
                    : 'Repositório privado ou erro de limite? Adicionar Personal Access Token (Opcional)'}
                </span>
                {showTokenField ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showTokenField && (
                <div className="mt-2 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-2 animate-in fade-in">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    GitHub Personal Access Token (classic ou fine-grained)
                  </label>
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-zinc-400">
                    O token fica salvo apenas localmente no seu dispositivo e permite consultar repositórios privados e aumenta o limite de requisições da API.
                  </p>
                </div>
              )}
            </div>

            {/* Auto check checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="autoCheckUpdates"
                checked={autoCheck}
                onChange={(e) => {
                  setAutoCheck(e.target.checked);
                  saveGitHubConfig(repoInput, tokenInput, e.target.checked);
                }}
                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label
                htmlFor="autoCheckUpdates"
                className="text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer select-none"
              >
                Verificar atualizações automaticamente ao abrir o aplicativo
              </label>
            </div>
          </div>
        </div>

        {/* Release Details / Changelog (if available) */}
        {updateResult?.latestRelease && (
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TagBadge tag={updateResult.latestRelease.tag_name} />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {updateResult.latestRelease.name}
                </h4>
              </div>

              <button
                onClick={() => setShowChangelog(!showChangelog)}
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
              >
                <span>{showChangelog ? 'Recolher notas' : 'Ver notas'}</span>
                {showChangelog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showChangelog && (
              <div className="space-y-3 pt-2">
                {updateResult.latestRelease.body ? (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {updateResult.latestRelease.body}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 italic">
                    Sem descrição textual detalhada nesta release.
                  </p>
                )}

                {updateResult.latestRelease.assets.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Arquivos disponíveis para download:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {updateResult.latestRelease.assets.map((asset) => (
                        <a
                          key={asset.id}
                          href={asset.browser_download_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-indigo-500 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Download className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate font-mono">
                              {asset.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400 shrink-0 ml-2">
                            {formatFileSize(asset.size)}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recent GitHub Commits History */}
        {updateResult?.recentCommits && updateResult.recentCommits.length > 0 && (
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Últimas Alterações de Código (Commits)
                </h4>
              </div>

              <button
                onClick={() => setShowCommits(!showCommits)}
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
              >
                <span>{showCommits ? 'Recolher' : `Ver ${updateResult.recentCommits.length} commits`}</span>
                {showCommits ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showCommits && (
              <div className="space-y-2 pt-2">
                {updateResult.recentCommits.map((c) => (
                  <div
                    key={c.sha}
                    className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                        {c.shortSha}
                      </span>
                      <p className="text-xs text-zinc-800 dark:text-zinc-200 truncate">
                        {c.message}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] text-zinc-400 hidden sm:inline">
                        {c.authorName}
                      </span>
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        title="Ver no GitHub"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Browser PWA Cache Refresh Action */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
              <span>Atualização de Cache do Navegador (PWA)</span>
            </span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Caso esteja acessando pelo celular via PWA/Chrome e queira forçar o carregamento imediato das últimas alterações sem esperar o cache expirar.
            </p>
          </div>

          <button
            onClick={handleHardRefresh}
            disabled={isRefreshingCache}
            className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isRefreshingCache ? 'Limpando...' : 'Limpar Cache & Recarregar'}
          </button>
        </div>
      </div>

      {/* Cloud Sync & Storage Management Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Armazenamento & Sincronização Google Drive
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Seus dados sincronizam de forma privada na sua própria nuvem do Google
              </p>
            </div>
          </div>

          <button
            onClick={openSyncModal}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-900"
          >
            Abrir Central de Sincronização
          </button>
        </div>

        {/* Storage Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Tarefas
            </span>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {tasks.length}
            </p>
            <span className="text-[10px] text-zinc-500">
              {tasks.filter((t) => t.completed).length} concluídas
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Finanças
            </span>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {transactions.length}
            </p>
            <span className="text-[10px] text-zinc-500">
              transações registradas
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Rascunhos & Metas
            </span>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {draftNotes.length + financialGoals.length}
            </p>
            <span className="text-[10px] text-zinc-500">
              notas e metas ativas
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Espaço Local
            </span>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              ~{approxStorageBytes} KB
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
              Offline-first rápido
            </span>
          </div>
        </div>

        {/* Backup and restore actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={exportBackupJson}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Fazer Download de Backup Local (JSON)</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>Restaurar Backup de Arquivo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => {
                const content = ev.target?.result as string;
                if (content && importBackupJson(content)) {
                  alert('Backup importado com sucesso!');
                } else {
                  alert('Arquivo de backup inválido.');
                }
              };
              reader.readAsText(file);
              e.target.value = '';
            }}
            className="hidden"
          />
        </div>
      </div>

      {/* System Preferences & App Information Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Preferências do Sistema & Recursos
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Ajustes visuais, notificações e status das integrações
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Theme setting */}
          <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  Aparência do Aplicativo
                </span>
                <span className="text-[11px] text-zinc-500 capitalize">
                  Tema atual: {theme === 'dark' ? 'Escuro' : 'Claro'}
                </span>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Alternar
            </button>
          </div>

          {/* Notifications setting */}
          <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  Notificações Visuais Silenciosas
                </span>
                <span className="text-[11px] text-zinc-500">
                  {notificationPermission === 'granted'
                    ? 'Autorizadas no navegador'
                    : 'Aguardando autorização'}
                </span>
              </div>
            </div>

            <button
              onClick={enableNotifications}
              className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              {notificationPermission === 'granted' ? 'Ativas' : 'Ativar'}
            </button>
          </div>

          {/* AI Gemini Status */}
          <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  IA Leitora de Notas (OCR)
                </span>
                <span className="text-[11px] text-zinc-500">
                  Google Gemini 3.8 Flash
                </span>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
              Operacional
            </span>
          </div>

          {/* Packaging Guide button */}
          <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  Instalação no Celular (.APK / PWA)
                </span>
                <span className="text-[11px] text-zinc-500">
                  Guia do GitHub Actions & Capacitor
                </span>
              </div>
            </div>
            <button
              onClick={openInstallModal}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
            >
              Ver Guia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function TagBadge({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
      <GitBranch className="w-3 h-3" />
      {tag}
    </span>
  );
}
