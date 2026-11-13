import { Capacitor } from '@capacitor/core';
import { FinanceCategory, Transaction } from '../types';
import { extractReceiptTextOffline, parseReceiptOcrText } from './offlineReceiptOcr';

export interface ParsedReceiptData {
  title: string;
  amount: number;
  date: string;
  category: FinanceCategory;
  paymentMethod?: Transaction['paymentMethod'];
  notes?: string;
}

export interface ReceiptScanDiagnostics {
  timestamp: string;
  platform: string;
  endpoint: string;
  httpStatus?: number;
  errorCode?: string;
  serverResponseSnippet?: string;
  serverErrorSummary: string;
  offlineAttempted: boolean;
  offlineEngine?: 'android-mlkit' | 'web-tesseract';
  offlineStatus: 'not_needed' | 'success' | 'no_data' | 'failed';
  offlineDetail?: string;
}

export interface ReceiptScanResult {
  data: ParsedReceiptData;
  source: 'ai' | 'offline_ocr';
  diagnostics: ReceiptScanDiagnostics;
}

export class ReceiptScanError extends Error {
  diagnostics: ReceiptScanDiagnostics;

  constructor(message: string, diagnostics: ReceiptScanDiagnostics) {
    super(message);
    this.name = 'ReceiptScanError';
    this.diagnostics = diagnostics;
  }
}

const DEFAULT_HOSTED_URL =
  'https://ais-pre-3wiiypdjeboooeth4s5qlf-202698123569.us-east1.run.app';
const SERVER_TIMEOUT_MS = 22000;

function sanitizeSnippet(raw: string): string {
  const withoutHtml = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return withoutHtml.slice(0, 240);
}

function getPlatformLabel(): string {
  if (Capacitor.isNativePlatform()) {
    return `App Nativo (${Capacitor.getPlatform()})`;
  }
  return typeof window !== 'undefined' ? `Web (${window.location.origin})` : 'Web';
}

export function formatDiagnosticsReport(diag: ReceiptScanDiagnostics): string {
  const lines = [
    '=== Relatório de Leitura de Nota Fiscal ===',
    `Data/Hora: ${new Date(diag.timestamp).toLocaleString('pt-BR')}`,
    `Plataforma: ${diag.platform}`,
    `Endpoint: ${diag.endpoint}`,
    `Status HTTP: ${diag.httpStatus !== undefined ? String(diag.httpStatus) : 'Sem resposta HTTP'}`,
    diag.errorCode ? `Código: ${diag.errorCode}` : null,
    `Motivo (Servidor): ${diag.serverErrorSummary}`,
    diag.serverResponseSnippet ? `Trecho da resposta: ${diag.serverResponseSnippet}` : null,
    `OCR Offline acionado: ${diag.offlineAttempted ? 'Sim' : 'Não'}`,
    diag.offlineEngine ? `Motor OCR Offline: ${diag.offlineEngine}` : null,
    `Resultado OCR Offline: ${diag.offlineStatus}`,
    diag.offlineDetail ? `Detalhe OCR Offline: ${diag.offlineDetail}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

function sanitizeParsedReceiptData(data: Partial<ParsedReceiptData>): ParsedReceiptData {
  const amount =
    typeof data.amount === 'number'
      ? data.amount
      : Number.parseFloat(String(data.amount || '0')) || 0;
  const title = (data.title || 'Compra Nota Fiscal').trim();
  const date =
    data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date)
      ? data.date
      : new Date().toISOString().split('T')[0];

  const validCategories: FinanceCategory[] = [
    'moradia',
    'alimentacao',
    'transporte',
    'saude',
    'educacao',
    'lazer',
    'outros',
    'salario',
    'investimentos',
    'freelance',
  ];
  const category: FinanceCategory = validCategories.includes(data.category as FinanceCategory)
    ? (data.category as FinanceCategory)
    : 'alimentacao';

  const validPayments = ['pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'transferencia'];
  const paymentMethod = validPayments.includes(data.paymentMethod || '')
    ? data.paymentMethod
    : 'cartao_credito';

  return {
    title,
    amount,
    date,
    category,
    paymentMethod,
    notes: data.notes || '',
  };
}

/**
 * Sends receipt image to Gemini server endpoint, capturing rich diagnostics and
 * automatically falling back to on-device Offline OCR if the server fails.
 */
export async function scanReceiptWithAI(file: File): Promise<ReceiptScanResult> {
  const base64 = await fileToBase64(file);

  const isLocalOrigin =
    typeof window !== 'undefined' &&
    (window.location.origin.includes('localhost') ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'file:');

  const configuredBaseUrl = (import.meta.env.VITE_APP_URL || '').trim().replace(/\/+$/, '');
  const baseUrl = configuredBaseUrl || (isLocalOrigin ? DEFAULT_HOSTED_URL : '');
  const endpoint = `${baseUrl}/api/gemini/parse-receipt`;
  const resolvedEndpoint =
    endpoint.startsWith('http') || typeof window === 'undefined'
      ? endpoint
      : `${window.location.origin}${endpoint}`;

  const diagnostics: ReceiptScanDiagnostics = {
    timestamp: new Date().toISOString(),
    platform: getPlatformLabel(),
    endpoint: resolvedEndpoint,
    serverErrorSummary: '',
    offlineAttempted: false,
    offlineStatus: 'not_needed',
  };

  let serverFailedMessage = '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: base64,
        mimeType: file.type || 'image/jpeg',
      }),
      signal: controller.signal,
    });

    diagnostics.httpStatus = res.status;
    const rawBody = await res.text().catch(() => '');
    const contentType = res.headers.get('content-type') || '';

    if (res.ok && contentType.includes('application/json')) {
      const jsonData = JSON.parse(rawBody || '{}');
      diagnostics.serverErrorSummary = 'OK';
      return {
        data: sanitizeParsedReceiptData(jsonData),
        source: 'ai',
        diagnostics,
      };
    }

    if (rawBody) {
      diagnostics.serverResponseSnippet = sanitizeSnippet(rawBody);
    }

    let parsedErrorMsg = '';
    if (rawBody.trim().startsWith('{')) {
      try {
        const parsedErr = JSON.parse(rawBody);
        parsedErrorMsg = typeof parsedErr?.error === 'string' ? parsedErr.error : '';
      } catch {
        // ignore JSON parse failure
      }
    }

    if (res.status === 404) {
      diagnostics.errorCode = 'ENDPOINT_NOT_FOUND';
      serverFailedMessage =
        'O servidor de leitura por IA não respondeu neste endereço (HTTP 404).';
    } else if (
      res.status === 302 ||
      res.status === 401 ||
      res.status === 403 ||
      contentType.includes('text/html')
    ) {
      diagnostics.errorCode = 'AUTH_OR_HTML_RESPONSE';
      serverFailedMessage =
        'O servidor exigiu autenticação ou retornou página HTML em vez de JSON.';
    } else if (
      res.status === 503 ||
      parsedErrorMsg.includes('"code":503') ||
      parsedErrorMsg.includes('UNAVAILABLE') ||
      parsedErrorMsg.toLowerCase().includes('high demand')
    ) {
      diagnostics.errorCode = 'MODEL_UNAVAILABLE_503';
      serverFailedMessage =
        'O serviço de leitura por IA está com alta demanda no momento (503).';
    } else if (res.status === 429 || parsedErrorMsg.includes('RESOURCE_EXHAUSTED')) {
      diagnostics.errorCode = 'RATE_LIMIT_429';
      serverFailedMessage = 'Limite temporário de leituras atingido na IA (429).';
    } else if (parsedErrorMsg && !parsedErrorMsg.trim().startsWith('{')) {
      diagnostics.errorCode = `HTTP_${res.status}`;
      serverFailedMessage = parsedErrorMsg;
    } else {
      diagnostics.errorCode = `HTTP_${res.status}`;
      serverFailedMessage = `Falha na resposta do servidor (HTTP ${res.status}).`;
    }
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError';
    diagnostics.errorCode = isAbort ? 'TIMEOUT' : 'NETWORK_ERROR';
    diagnostics.serverResponseSnippet = err?.message ? sanitizeSnippet(String(err.message)) : '';
    serverFailedMessage = isAbort
      ? 'Tempo limite esgotado ao aguardar resposta do servidor de IA.'
      : 'Sem conexão com o servidor de leitura por IA.';
  } finally {
    clearTimeout(timeoutId);
  }

  diagnostics.serverErrorSummary = serverFailedMessage;

  // Contingency Step: Run on-device Offline OCR automatically
  diagnostics.offlineAttempted = true;
  try {
    const ocr = await extractReceiptTextOffline(base64);
    diagnostics.offlineEngine = ocr.engine;

    const parsedOffline = parseReceiptOcrText(ocr.text);
    if (parsedOffline) {
      diagnostics.offlineStatus = 'success';
      diagnostics.offlineDetail = `${ocr.text.length} caracteres extraídos localmente`;
      return {
        data: sanitizeParsedReceiptData(parsedOffline),
        source: 'offline_ocr',
        diagnostics,
      };
    }

    diagnostics.offlineStatus = 'no_data';
    diagnostics.offlineDetail = ocr.text
      ? `Texto insuficiente (${ocr.text.length} caracteres)`
      : 'Nenhum texto legível encontrado na foto';
  } catch (ocrErr: any) {
    diagnostics.offlineStatus = 'failed';
    diagnostics.offlineDetail = ocrErr?.message ? sanitizeSnippet(String(ocrErr.message)) : 'Falha no motor OCR';
  }

  const combinedMessage =
    diagnostics.offlineStatus === 'no_data'
      ? `${serverFailedMessage} O OCR offline também não encontrou texto legível na foto.`
      : `${serverFailedMessage} A leitura offline de contingência não pôde processar esta imagem.`;

  throw new ReceiptScanError(combinedMessage, diagnostics);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = (error) => reject(error);
  });
}
