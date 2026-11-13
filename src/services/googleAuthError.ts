export class WorkspaceAuthError extends Error {
  readonly status = 401;

  constructor(message = 'Sessão Google expirada. Conecte sua conta novamente.') {
    super(message);
    this.name = 'WorkspaceAuthError';
  }
}

export function isWorkspaceAuthError(err: unknown): err is WorkspaceAuthError {
  if (err instanceof WorkspaceAuthError) return true;
  if (err && typeof err === 'object') {
    const anyErr = err as { status?: number; message?: string };
    if (anyErr.status === 401) return true;
    if (typeof anyErr.message === 'string' && anyErr.message.includes('(401)')) return true;
  }
  return false;
}
