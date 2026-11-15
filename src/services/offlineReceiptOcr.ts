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
  const priorityLineGroups: RegExp[][] = [
    [
      /valor\s*a\s*pagar/i,
      /total\s*a\s*pagar/i,
      /vlr\.?\s*a\s*pagar/i,
      /total\s*l[ií]quido/i,
      /valor\s*l[ií]quido/i,
      /total\s*da\s*nota/i,
      /valor\s*total/i,
      /vlr\.?\s*total/i,
    ],
    [/\btotal\b/i],
    [
      /\bcart[aã]o\b/i,
      /\bcr[eé]dito\b/i,
      /\bd[eé]bito\b/i,
      /\bpix\b/i,
      /\bvalor\s*pago\b/i,
    ],
    [/subtotal/i],
  ];

  const ignoreLinePattern =
    /\btroco\b|\bdesconto\b|\bacr[eé]scimo\b|\btributo|\bimposto|\blei\s*12\.?741|\bval\.?\s*aprox|\bicms\b|\bcofins\b|\bpis\b|\bcnpj\b|\bcpf\b|\bchave\b|\bcep\b|\bfone\b|\btel\b|\bvl\.?\s*unit|\bunit[aá]rio/i;
  const amountRegex = /(?:R\$\s*)?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})(?!\d)/g;

  // Pass 1: Look at lines with explicit Total / Payment labels (or the immediate next line)
  for (const group of priorityLineGroups) {
    for (const pattern of group) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (ignoreLinePattern.test(line)) continue;
        if (/subtotal/i.test(line) && !pattern.source.includes('subtotal')) continue;
        if (!pattern.test(line)) continue;

        const sameLineMatches = [...line.matchAll(amountRegex)];
        if (sameLineMatches.length > 0) {
          const parsed = parseOcrCurrency(sameLineMatches[sameLineMatches.length - 1][1]);
          if (parsed !== null) return parsed;
        }

        const nextLine = lines[i + 1] || '';
        if (!ignoreLinePattern.test(nextLine)) {
          const nextLineMatches = [...nextLine.matchAll(amountRegex)];
          if (nextLineMatches.length > 0) {
            const parsed = parseOcrCurrency(nextLineMatches[nextLineMatches.length - 1][1]);
            if (parsed !== null) return parsed;
          }
        }
      }
    }
  }

  // Pass 2: Look for explicit R$ values anywhere (preferring the largest valid total)
  const rDollarAmounts: number[] = [];
  for (const line of lines) {
    if (ignoreLinePattern.test(line)) continue;
    const matches = [...line.matchAll(/R\$\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})(?!\d)/gi)];
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
  // Check DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD/MM/YY first
  const brMatches = [...text.matchAll(/\b(\d{2})[\/\-.](\d{2})[\/\-.](\d{2,4})\b/g)];
  for (const match of brMatches) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2020 && year <= 2035) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Also check ISO YYYY-MM-DD
  const isoMatch = text.match(/\b(202\d|203[0-5])-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
  }

  return new Date().toISOString().split('T')[0];
}

function extractStoreTitle(lines: string[]): string {
  const skipLine =
    /\b(?:danfe|nfc-?e|cupom\s*fiscal|documento\s*auxiliar|extrato|sat|cnpj|cpf|insc|ie\s*:|im\s*:|rua\b|r\.\s|av\.?\b|avenida\b|alameda\b|rodovia\b|rod\.?\b|estrada\b|bairro\b|cep\b|fone\b|tel\b|sac\b|www\.|http|consumidor|sem\s+valor\s+fiscal|qr\s*code|chave\s*de\s*acesso|caixa\b|pdv\b|operador|item\s+c[oó]d|qtd|tributos|lei\s*12)/i;

  for (const line of lines.slice(0, 10)) {
    const cleaned = line
      .replace(/^[^A-Za-zÀ-ÖØ-öø-ÿ0-9]+|[^A-Za-zÀ-ÖØ-öø-ÿ0-9]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length < 3 || cleaned.length > 60) continue;
    if (/^[\d\W]+$/.test(cleaned)) continue;
    if (/^(?:brasil|sao paulo|sp|rj|mg|rs|pr|sc|ba|ce|df|go|pe)$/i.test(cleaned)) continue;
    if (skipLine.test(cleaned)) continue;
    return cleaned;
  }

  return 'Compra Nota Fiscal';
}

function inferReceiptPaymentMethod(text: string): Transaction['paymentMethod'] {
  if (/\bpix\b/i.test(text)) return 'pix';
  if (/\bd[eé]bito\b|\bcart[aã]o\s*deb/i.test(text)) return 'cartao_debito';
  if (
    /\bcr[eé]dito\b|\bcart[aã]o\s*cred|\bvisa\b|\bmaster(?:card)?\b|\belo\b|\bamex\b|\bhipercard\b|\bparcel|\bvale\s*aliment|\bvr\b|\balelo\b|\bsodexo\b/i.test(
      text
    )
  ) {
    return 'cartao_credito';
  }
  if (/\bdinheiro\b|\besp[eé]cie\b/i.test(text)) return 'dinheiro';
  if (/\btransfer[eê]ncia\b|\bted\b|\bdoc\b/i.test(text)) return 'transferencia';
  return 'cartao_credito';
}

function inferReceiptCategory(text: string): FinanceCategory {
  if (
    /\b(?:supermercado|mercado|minimercado|atacad[aã]o|assa[ií]|carrefour|p[aã]o\s*de\s*a[cç][uú]car|extra|padaria|panificadora|confeitaria|a[cç]ougue|hortifruti|sacol[aã]o|restaurante|churrascaria|lanchonete|caf[eé]|cafeteria|pizza|pizzaria|burger|hamburgueria|sorveteria|p[aã]o|leite|arroz|feij[aã]o|aliment|bebida|refrigerante|cerveja)\b/i.test(
      text
    )
  ) {
    return 'alimentacao';
  }
  if (
    /\b(?:posto|auto\s*posto|combust[ií]vel|gasolina|etanol|[aá]lcool|diesel|gnv|ipiranga|shell|petrobras|br\s*mania|estacionamento|ped[aá]gio|sem\s*parar|uber|99app|oficina|troca\s*de\s*[oó]leo|pneu)\b/i.test(
      text
    )
  ) {
    return 'transporte';
  }
  if (
    /\b(?:farm[aá]cia|drogaria|droga\s*raia|drogasil|pague\s*menos|panvel|ultrafarma|medicamento|rem[eé]dio|cl[ií]nica|consult[oó]rio|laborat[oó]rio|hospital|odonto|dentista|[oó]tica|consulta)\b/i.test(
      text
    )
  ) {
    return 'saude';
  }
  if (
    /\b(?:energia|enel|cemig|copel|cpfl|celesc|equatorial|light|[aá]gua|sabesp|sanepar|copasa|comg[aá]s|internet|aluguel|condom[ií]nio|leroy|telhanorte|ferragem|constru[cç][aã]o)\b/i.test(
      text
    )
  ) {
    return 'moradia';
  }
  if (/\b(?:livraria|papelaria|kalunga|livro|caderno|escola|col[eé]gio|faculdade|curso)\b/i.test(text)) {
    return 'educacao';
  }
  if (/\b(?:cinema|cinemark|kinoplex|ingresso|teatro|show|bar\b|pub\b|hotel|pousada|lazer|petz|cobasi)\b/i.test(text)) {
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

  const noiseNotePattern =
    /\b(?:cnpj|cpf|ie\s*:|im\s*:|cep\b|danfe|nfc-?e|sat\b|cupom|documento\s*auxiliar|chave\s*de\s*acesso|qr\s*code|tributos|lei\s*12|troco|subtotal|valor\s*a\s*pagar|protocolo|autoriza[cç][aã]o)\b|\d{12,}/i;

  const summaryLines = lines
    .filter(
      (l) =>
        l !== title &&
        l.length >= 4 &&
        l.length <= 55 &&
        !/^[\d\W.,/:;-]+$/.test(l) &&
        !noiseNotePattern.test(l)
    )
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
