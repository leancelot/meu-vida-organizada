export interface GitHubReleaseAsset {
  id: number;
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
  content_type: string;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  prerelease: boolean;
  assets: GitHubReleaseAsset[];
}

export interface GitHubCommit {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorAvatar?: string;
  date: string;
  url: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion?: string;
  latestRelease?: GitHubRelease;
  apkAsset?: GitHubReleaseAsset;
  recentCommits: GitHubCommit[];
  repoUrl: string;
  actionsUrl: string;
  releasesUrl: string;
  checkedAt: string;
  error?: string;
}

export const CURRENT_APP_VERSION = 'v1.1.0';
export const DEFAULT_GITHUB_REPO = 'souoleandro/meu-vida-organizada';

const STORAGE_KEYS = {
  REPO: 'vo_github_repo',
  TOKEN: 'vo_github_token',
  AUTO_CHECK: 'vo_github_auto_check',
  LAST_RESULT: 'vo_github_last_result',
};

export function getStoredGitHubConfig() {
  return {
    repo: localStorage.getItem(STORAGE_KEYS.REPO) || DEFAULT_GITHUB_REPO,
    token: localStorage.getItem(STORAGE_KEYS.TOKEN) || '',
    autoCheck: localStorage.getItem(STORAGE_KEYS.AUTO_CHECK) !== 'false',
    lastResult: loadLastResult(),
  };
}

export function saveGitHubConfig(repo: string, token: string, autoCheck: boolean) {
  localStorage.setItem(STORAGE_KEYS.REPO, repo.trim());
  localStorage.setItem(STORAGE_KEYS.TOKEN, token.trim());
  localStorage.setItem(STORAGE_KEYS.AUTO_CHECK, String(autoCheck));
}

function loadLastResult(): UpdateCheckResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_RESULT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLastResult(result: UpdateCheckResult) {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_RESULT, JSON.stringify(result));
  } catch (err) {
    console.warn('Erro ao salvar resultado da verificação de atualização:', err);
  }
}

/**
 * Normalizes version strings (e.g. "v1.2.0" -> [1, 2, 0])
 */
export function parseSemVer(version: string): number[] {
  const clean = version.replace(/^v/i, '').trim();
  const parts = clean.split('.').map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3);
}

/**
 * Compare two semver strings
 * Returns: 1 if vA > vB, -1 if vA < vB, 0 if equal
 */
export function compareVersions(vA: string, vB: string): number {
  const [majA, minA, patchA] = parseSemVer(vA);
  const [majB, minB, patchB] = parseSemVer(vB);

  if (majA !== majB) return majA > majB ? 1 : -1;
  if (minA !== minB) return minA > minB ? 1 : -1;
  if (patchA !== patchB) return patchA > patchB ? 1 : -1;
  return 0;
}

/**
 * Queries the public GitHub REST API for latest releases and recent commits
 */
export async function checkForGitHubUpdates(
  repoPath: string,
  token?: string,
  currentVersion: string = CURRENT_APP_VERSION
): Promise<UpdateCheckResult> {
  const cleanRepo = repoPath.replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '').trim();

  const repoUrl = `https://github.com/${cleanRepo}`;
  const actionsUrl = `https://github.com/${cleanRepo}/actions`;
  const releasesUrl = `https://github.com/${cleanRepo}/releases`;
  const now = new Date().toISOString();

  if (!cleanRepo || !cleanRepo.includes('/')) {
    const invalidResult: UpdateCheckResult = {
      hasUpdate: false,
      currentVersion,
      recentCommits: [],
      repoUrl,
      actionsUrl,
      releasesUrl,
      checkedAt: now,
      error: 'Formato de repositório inválido. Use "usuario/nome-do-repositorio" (ex: souoleandro/meu-vida-organizada).',
    };
    saveLastResult(invalidResult);
    return invalidResult;
  }

  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let latestRelease: GitHubRelease | undefined;
  let apkAsset: GitHubReleaseAsset | undefined;
  let hasUpdate = false;
  let errorMsg: string | undefined;
  const recentCommits: GitHubCommit[] = [];

  // 1. Fetch latest release from GitHub
  try {
    const releaseRes = await fetch(`https://api.github.com/repos/${cleanRepo}/releases/latest`, {
      headers,
    });

    if (releaseRes.ok) {
      const data = await releaseRes.json();
      latestRelease = {
        id: data.id,
        tag_name: data.tag_name || '',
        name: data.name || data.tag_name || 'Atualização',
        body: data.body || '',
        published_at: data.published_at || '',
        html_url: data.html_url || `${releasesUrl}/tag/${data.tag_name}`,
        prerelease: Boolean(data.prerelease),
        assets: Array.isArray(data.assets)
          ? data.assets.map((a: any) => ({
              id: a.id,
              name: a.name,
              size: a.size,
              download_count: a.download_count,
              browser_download_url: a.browser_download_url,
              content_type: a.content_type,
            }))
          : [],
      };

      // Check for APK asset in release
      apkAsset = latestRelease.assets.find((a) => a.name.toLowerCase().endsWith('.apk'));

      // Compare versions
      if (latestRelease.tag_name) {
        hasUpdate = compareVersions(latestRelease.tag_name, currentVersion) > 0;
      }
    } else if (releaseRes.status === 404) {
      // No official releases published yet; we will fall back to recent commits
    } else if (releaseRes.status === 403) {
      errorMsg = 'Limite de requisições da API pública do GitHub atingido temporariamente. Se desejar, adicione um Personal Access Token.';
    } else {
      errorMsg = `Erro na API do GitHub (${releaseRes.status}): Repositório não encontrado ou inacessível.`;
    }
  } catch (err: any) {
    console.warn('Erro ao consultar Releases do GitHub:', err);
    errorMsg = 'Não foi possível conectar à API do GitHub. Verifique sua conexão com a internet.';
  }

  // 2. Fetch recent commits to give full visibility of project changes
  try {
    const commitsRes = await fetch(`https://api.github.com/repos/${cleanRepo}/commits?per_page=6`, {
      headers,
    });

    if (commitsRes.ok) {
      const data = await commitsRes.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          recentCommits.push({
            sha: item.sha,
            shortSha: item.sha.substring(0, 7),
            message: item.commit?.message?.split('\n')[0] || 'Atualização de código',
            authorName: item.commit?.author?.name || item.author?.login || 'Autor',
            authorAvatar: item.author?.avatar_url,
            date: item.commit?.author?.date || '',
            url: item.html_url,
          });
        }
      }
    }
  } catch (err) {
    console.warn('Erro ao carregar commits do GitHub:', err);
  }

  const result: UpdateCheckResult = {
    hasUpdate,
    currentVersion,
    latestVersion: latestRelease?.tag_name,
    latestRelease,
    apkAsset,
    recentCommits,
    repoUrl,
    actionsUrl,
    releasesUrl,
    checkedAt: now,
    error: errorMsg,
  };

  saveLastResult(result);
  return result;
}

/**
 * Forces clear of PWA Service Worker caches and hard reloads the application
 */
export async function refreshAppCache(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
    }
  } catch (err) {
    console.warn('Erro ao limpar cache:', err);
  } finally {
    window.location.reload();
  }
}
