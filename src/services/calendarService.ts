import { GoogleCalendarEvent } from '../types';
import { WorkspaceAuthError } from './googleAuthError';

/**
 * List events from primary Google Calendar for a date range
 */
export async function listCalendarEvents(
  accessToken: string,
  timeMin?: string,
  timeMax?: string
): Promise<GoogleCalendarEvent[]> {
  const min = timeMin || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const max = timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    min
  )}&timeMax=${encodeURIComponent(max)}&singleEvents=true&orderBy=startTime&maxResults=100`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new WorkspaceAuthError('Sessão da Google Agenda expirada. Conecte sua conta novamente.');
  }

  if (!res.ok) {
    const errorText = await res.text();
    console.warn('Falha ao listar eventos do Google Agenda:', res.status, errorText);
    throw new Error(`Falha ao carregar eventos da Google Agenda (${res.status})`);
  }

  const data = await res.json();
  return (data.items || []) as GoogleCalendarEvent[];
}

/**
 * Creates an event in user's primary Google Calendar
 */
export async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string; // ISO String or YYYY-MM-DDTHH:mm:00
    endDateTime: string; // ISO String or YYYY-MM-DDTHH:mm:00
    allDay?: boolean;
    date?: string; // YYYY-MM-DD if all day
  }
): Promise<GoogleCalendarEvent> {
  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

  const body: any = {
    summary: event.summary,
    description: event.description || 'Criado via aplicativo VidaOrganizada',
    location: event.location,
  };

  if (event.allDay && event.date) {
    body.start = { date: event.date };
    body.end = { date: event.date };
  } else {
    body.start = { dateTime: event.startDateTime };
    body.end = { dateTime: event.endDateTime };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    throw new WorkspaceAuthError('Sessão da Google Agenda expirada. Conecte sua conta novamente.');
  }

  if (!res.ok) {
    const errorText = await res.text();
    console.warn('Falha ao criar evento na agenda:', res.status, errorText);
    throw new Error(`Falha ao criar evento na Google Agenda (${res.status})`);
  }

  return (await res.json()) as GoogleCalendarEvent;
}

/**
 * Updates an event in Google Calendar
 */
export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: {
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
    allDay?: boolean;
    date?: string;
  }
): Promise<GoogleCalendarEvent> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;

  const body: any = {
    summary: event.summary,
    description: event.description,
    location: event.location,
  };

  if (event.allDay && event.date) {
    body.start = { date: event.date };
    body.end = { date: event.date };
  } else {
    body.start = { dateTime: event.startDateTime };
    body.end = { dateTime: event.endDateTime };
  }

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    throw new WorkspaceAuthError('Sessão da Google Agenda expirada. Conecte sua conta novamente.');
  }

  if (!res.ok) {
    throw new Error(`Falha ao atualizar evento na Google Agenda (${res.status})`);
  }

  return (await res.json()) as GoogleCalendarEvent;
}

/**
 * Deletes an event in Google Calendar (Requires User Confirmation in UI before calling)
 */
export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new WorkspaceAuthError('Sessão da Google Agenda expirada. Conecte sua conta novamente.');
  }

  if (!res.ok && res.status !== 404) {
    throw new Error(`Falha ao excluir evento da Google Agenda (${res.status})`);
  }
}
