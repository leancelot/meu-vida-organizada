import { Capacitor, registerPlugin } from '@capacitor/core';
import { FinanceCategory, Transaction } from '../types';

export interface ParsedReceiptFields {
  title: string;
  amount: number;
  date: string;
  category: FinanceCategory;
  paymentMethod?: Transaction['paymentMethod'];
  notes?: string;
}

export interface OfflineOcrResult {
  text: string;
  engine: 'android-mlkit' | 'web-tesseract';
}

interface OfflineReceiptOcrNativePlugin {
  recognizeText(options: { imageBase64: string }): Promise<{ text: string; blockCount?: number }>;
}

const OfflineReceiptOcrNative = registerPlugin<OfflineReceiptOcrNativePlugin>('OfflineReceiptOcr');

export function isNativeAndroidOcrAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function extractReceiptTextOffline(imageBase64: string): Promise<OfflineOcrResult> {
  if (isNativeAndroidOcrAvailable()) {
    const res = await OfflineReceiptOcrNative.recognizeText({ imageBase64 });
    return {
      text: (res?.text || '').trim(),
      engine: 'android-mlkit',
    };
  }

  // Web contingency: lazy-load tesseract.js only when server AI fails
  const { createWorker } = await import('tesseract.js');
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    try {
      worker = await createWorker('por');
    } catch {
      worker = await createWorker('eng');
    }
    const result = await worker.recognize(imageBase64);
    return {
      text: (result?.data?.text || '').trim(),
      engine: 'web-tesseract',
    };
  } finally {
    if (worker) {
      await worker.terminate().catch(() => {});
    }
  }
}

function parseOcrCurrency(raw: string): number | null {
  const cleaned = raw.replace(/\s+/g, '').trim();
  if (!cleaned) return null;

  let normalized = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // 1.234,56 -> 1234.56
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56 -> 1234.56
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.');
  }

  const val = Number.parseFloat(normalized);
  if (!Number.isFinite(val) || val <= 0 || val > 500000) return null;
  return Math.round(val * 100) / 100;
}

function extractAmountFromReceiptLines(lines: string[]): number {
  const priorityLinePatterns = [
    /valor\s*a\s*pagar/i,
    /total\s*a\s*pagar/i,
    /valor\s*total/i,
    /\btotal\b/i,
    /vlr\.?\s*total/i,
    /subtotal/i,
  ];
  const ignoreLinePattern = /\btroco\b|\bdesconto\b|\bcnpj\b|\bcpf\b|\bchave\b|\bcep\b|\bfone\b|\btel\b/i;
  const amountRegex = /(?:R\$\s*)?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g;

  // Pass 1: Look at lines with explicit Total labels (or the immediate next line)
  for (const pattern of priorityLinePatterns) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (ignoreLinePattern.test(line)) continue;
      if (!pattern.test(line)) continue;

      const candidateText = `${line} ${lines[i + 1] || ''}`;
      const matches = [...candidateText.matchAll(amountRegex)];
      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1][1];
        const parsed = parseOcrCurrency(lastMatch);
        if (parsed !== null) return parsed;
      }
    }
  }

  // Pass 2: Look for explicit R$ values anywhere (preferring the largest valid total)
  const rDollarAmounts: number[] = [];
  for (const line of lines) {
    if (ignoreLinePattern.test(line)) continue;
    const matches = [...line.matchAll(/R\$\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/gi)];
    for (const m of matches) {
      const parsed = parseOcrCurrency(m[1]);
      if (parsed !== null) rDollarAmounts.push(parsed);
    }
  }
  if (rDollarAmounts.length > 0) {
    return Math.max(...rDollarAmounts);
  }

  // Pass 3: Largest decimal currency-shaped number in the lower half of the receipt
  const lowerStart = Math.floor(lines.length / 2);
  const candidates: number[] = [];
  for (let i = lowerStart; i < lines.length; i++) {
    const line = lines[i];
    if (ignoreLinePattern.test(line)) continue;
    const matches = [...line.matchAll(amountRegex)];
    for (const m of matches) {
      const parsed = parseOcrCurrency(m[1]);
      if (parsed !== null) candidates.push(parsed);
    }
  }
  if (candidates.length > 0) {
    return Math.max(...candidates);
  }

  return 0;
}

function extractReceiptDate(text: string): string {
  const match = text.match(/\b(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})\b/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2020 && year <= 2035) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return new Date().toISOString().split('T')[0];
}

function extractStoreTitle(lines: string[]): string {
  const skipLine =
    /\b(?:danfe|nfc-?e|cupom\s*fiscal|documento\s*auxiliar|extrato|sat|cnpj|cpf|insc|ie:|im:|rua\b|av\.?\b|avenida\b|rodovia\b|cep\b|fone\b|tel\b|www\.|http|consumidor|qr\s*code|chave\s*de\s*acesso)\b/i;

  for (const line of lines.slice(0, 8)) {
    const cleaned = line.replace(/\s+/g, ' ').trim();
    if (cleaned.length < 3 || cleaned.length > 60) continue;
    if (/^[\d\W]+$/.test(cleaned)) continue;
    if (skipLine.test(cleaned)) continue;
    return cleaned;
  }

  return 'Compra Nota Fiscal';
}

function inferReceiptPaymentMethod(text: string): Transaction['paymentMethod'] {
  if (/\bpix\b/i.test(text)) return 'pix';
  if (/\bd[eé]bito\b/i.test(text)) return 'cartao_debito';
  if (/\bcr[eé]dito\b|\bvisa\b|\bmaster(?:card)?\b|\belo\b|\bamex\b|\bparcel/i.test(text)) {
    return 'cartao_credito';
  }
  if (/\bdinheiro\b|\besp[eé]cie\b/i.test(text)) return 'dinheiro';
  if (/\btransfer[eê]ncia\b|\bted\b|\bdoc\b/i.test(text)) return 'transferencia';
  return 'cartao_credito';
}

function inferReceiptCategory(text: string): FinanceCategory {
  if (
    /\b(?:supermercado|mercado|atacad|padaria|a[cç]ougue|hortifruti|restaurante|lanchonete|caf[eé]|pizza|burger|p[aã]o|leite|arroz|feij[aã]o|aliment|bebida|refrigerante)\b/i.test(
      text
    )
  ) {
    return 'alimentacao';
  }
  if (
    /\b(?:posto|combust[ií]vel|gasolina|etanol|diesel|estacionamento|ped[aá]gio|uber|auto\s*posto)\b/i.test(
      text
    )
  ) {
    return 'transporte';
  }
  if (
    /\b(?:farm[aá]cia|drogaria|droga\s*raia|drogasil|medicamento|rem[eé]dio|cl[ií]nica|laborat[oó]rio|hospital|consulta)\b/i.test(
      text
    )
  ) {
    return 'saude';
  }
  if (
    /\b(?:energia|enel|cemig|copel|light|[aá]gua|sabesp|internet|aluguel|condom[ií]nio|ferragem|constru[cç][aã]o)\b/i.test(
      text
    )
  ) {
    return 'moradia';
  }
  if (/\b(?:livraria|papelaria|livro|escola|faculdade|curso)\b/i.test(text)) {
    return 'educacao';
  }
  if (/\b(?:cinema|ingresso|teatro|show|bar\b|hotel|lazer)\b/i.test(text)) {
    return 'lazer';
  }
  return 'outros';
}

export function parseReceiptOcrText(rawText: string): ParsedReceiptFields | null {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return null;

  const fullText = lines.join('\n');
  const amount = extractAmountFromReceiptLines(lines);

  if (amount <= 0 && fullText.length < 15) {
    return null;
  }

  const title = extractStoreTitle(lines);
  const date = extractReceiptDate(fullText);
  const paymentMethod = inferReceiptPaymentMethod(fullText);
  const category = inferReceiptCategory(fullText);

  const summaryLines = lines
    .filter((l) => l !== title && l.length >= 4 && l.length <= 55 && !/^[\d\W]+$/.test(l))
    .slice(0, 3);

  return {
    title,
    amount,
    date,
    category,
    paymentMethod,
    notes: summaryLines.length > 0 ? summaryLines.join(' • ') : 'Leitura offline no aparelho',
  };
}
