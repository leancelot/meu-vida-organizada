import { AppDataPayload } from '../types';

const BACKUP_FILE_NAME = 'VidaOrganizada_Data.json';

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

/**
 * Searches for the existing backup file created by this app in Google Drive
 */
export async function findDriveBackupFile(accessToken: string): Promise<DriveFileInfo | null> {
  const query = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size)&spaces=drive`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Erro ao buscar arquivo no Drive:', errorText);
    throw new Error(`Falha ao acessar Google Drive (${res.status})`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0];
  }
  return null;
}

/**
 * Reads content of a file from Google Drive
 */
export async function readDriveFile(accessToken: string, fileId: string): Promise<AppDataPayload> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Erro ao baixar arquivo do Drive (${res.status})`);
  }

  const content = await res.json();
  return content as AppDataPayload;
}

/**
 * Creates or updates the backup file in Google Drive
 */
export async function saveToDrive(
  accessToken: string,
  payload: AppDataPayload,
  existingFileId?: string | null
): Promise<DriveFileInfo> {
  const fileContent = JSON.stringify(payload, null, 2);

  // If we already know the file ID, let's verify if it exists and update it
  let targetFileId = existingFileId;
  if (!targetFileId) {
    const existing = await findDriveBackupFile(accessToken);
    if (existing) {
      targetFileId = existing.id;
    }
  }

  if (targetFileId) {
    // Update existing file content
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${targetFileId}?uploadType=media`;
    const res = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: fileContent,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Erro ao atualizar arquivo no Drive:', err);
      throw new Error(`Falha ao salvar no Google Drive: ${res.statusText}`);
    }

    const updated = await res.json();
    return {
      id: updated.id,
      name: updated.name || BACKUP_FILE_NAME,
      modifiedTime: new Date().toISOString(),
    };
  } else {
    // Create new file with multipart upload
    const metadata = {
      name: BACKUP_FILE_NAME,
      mimeType: 'application/json',
      description: 'Backup de sincronização do VidaOrganizada (Tarefas, Finanças e Agenda)',
    };

    const boundary = '-------VidaOrganizadaBoundary7MA4YWxkTrZu0gW';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      fileContent +
      closeDelimiter;

    const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Erro ao criar arquivo no Drive:', err);
      throw new Error(`Falha ao criar backup no Google Drive: ${res.statusText}`);
    }

    const created = await res.json();
    return {
      id: created.id,
      name: created.name || BACKUP_FILE_NAME,
      modifiedTime: new Date().toISOString(),
    };
  }
}

/**
 * Deletes backup file from Drive with confirmation
 */
export async function deleteDriveFile(accessToken: string, fileId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Erro ao excluir arquivo no Drive: ${res.statusText}`);
  }
}
