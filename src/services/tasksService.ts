import { WorkspaceAuthError } from './googleAuthError';

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  updated?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
}

/**
 * Get the default task list or list of task lists
 */
export async function getGoogleTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
  const url = 'https://tasks.googleapis.com/tasks/v1/users/@me/lists';
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) {
    throw new WorkspaceAuthError('Sessão do Google Tasks expirada. Conecte sua conta novamente.');
  }

  if (!res.ok) {
    throw new Error(`Falha ao obter listas de tarefas (${res.status})`);
  }

  const data = await res.json();
  return (data.items || []) as GoogleTaskList[];
}

/**
 * Get tasks from a list
 */
export async function getGoogleTasks(accessToken: string, listId = '@default'): Promise<GoogleTask[]> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=true&showHidden=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) {
    throw new WorkspaceAuthError('Sessão do Google Tasks expirada. Conecte sua conta novamente.');
  }

  if (!res.ok) {
    throw new Error(`Falha ao obter tarefas do Google (${res.status})`);
  }

  const data = await res.json();
  return (data.items || []) as GoogleTask[];
}

/**
 * Create a task in Google Tasks
 */
export async function createGoogleTask(
  accessToken: string,
  task: { title: string; notes?: string; due?: string },
  listId = '@default'
): Promise<GoogleTask> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  });

  if (res.status === 401) {
    throw new WorkspaceAuthError('Sessão do Google Tasks expirada. Conecte sua conta novamente.');
  }

  if (!res.ok) {
    throw new Error(`Falha ao criar tarefa no Google Tasks (${res.status})`);
  }

  return (await res.json()) as GoogleTask;
}

/**
 * Update task status in Google Tasks
 */
export async function updateGoogleTaskStatus(
  accessToken: string,
  taskId: string,
  status: 'needsAction' | 'completed',
  listId = '@default'
): Promise<GoogleTask> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (res.status === 401) {
    throw new WorkspaceAuthError('Sessão do Google Tasks expirada. Conecte sua conta novamente.');
  }

  if (!res.ok) {
    throw new Error(`Falha ao atualizar tarefa no Google Tasks (${res.status})`);
  }

  return (await res.json()) as GoogleTask;
}
