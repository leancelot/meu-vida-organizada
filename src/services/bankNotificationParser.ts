import { FinanceCategory, PendingBankNotification, Transaction, TransactionType } from '../types';

export interface ParseBankNotificationParams {
  rawText: string;
  title?: string;
  bankName?: string;
  timestamp?: number;
  source?: 'android' | 'manual';
  allowAmbiguous?: boolean;
}

const KNOWN_BANKS: Array<{ patterns: RegExp[]; label: string }> = [
  { patterns: [/\bnubank\b/i, /\bnu\s*pagamentos\b/i, /\broxinho\b/i], label: 'Nubank' },
  { patterns: [/\bbanco\s*inter\b/i, /\binter\b/i], label: 'Banco Inter' },
  { patterns: [/\bita[uú]\b/i, /\bpersonnalit[eé]\b/i], label: 'Itaú' },
  { patterns: [/\bbradesco\b/i], label: 'Bradesco' },
  { patterns: [/\bsantander\b/i], label: 'Santander' },
  { patterns: [/\bbanco\s*do\s*brasil\b/i, /\bbb\b/i], label: 'Banco do Brasil' },
  { patterns: [/\bcaixa\s*tem\b/i], label: 'Caixa Tem' },
  { patterns: [/\bcaixa\b/i, /\bcef\b/i], label: 'Caixa' },
  { patterns: [/\bc6\s*bank\b/i, /\bc6\b/i], label: 'C6 Bank' },
  { patterns: [/\bpicpay\b/i], label: 'PicPay' },
  { patterns: [/\bmercado\s*pago\b/i], label: 'Mercado Pago' },
  { patterns: [/\bpagbank\b/i, /\bpagseguro\b/i], label: 'PagBank' },
  { patterns: [/\bbtg\b/i], label: 'BTG Pactual' },
  { patterns: [/\bneon\b/i], label: 'Neon' },
  { patterns: [/\bwill\s*bank\b/i], label: 'Will Bank' },
  { patterns: [/\bnext\b/i], label: 'Next' },
  { patterns: [/\bsicredi\b/i], label: 'Sicredi' },
  { patterns: [/\bsicoob\b/i], label: 'Sicoob' },
  { patterns: [/\bcora\b/i], label: 'Cora' },
  { patterns: [/\bxp\b/i], label: 'XP' },
  { patterns: [/\bstone\b/i], label: 'Stone' },
  { patterns: [/\bton\b/i], label: 'Ton' },
];

const NOISE_BLACKLIST = [
  /c[oó]digo\s*(?:de\s*)?(?:verifica[cç][aã]o|seguran[cç]a|acesso)/i,
  /\btoken\b/i,
  /\bopt-in\b|\botp\b/i,
  /fatura\s*(?:fechada|dispon[ií]vel|aberta|vence|vencimento)/i,
  /limite\s*(?:dispon[ií]vel|alterado|aumentado|aprovado)/i,
  /empr[eé]stimo\s*(?:pr[eé]-aprovado|dispon[ií]vel)/i,
  /aprova[cç][aã]o\s*em\s*2\s*etapas/i,
  /autorize\s*o\s*(?:login|acesso)/i,
  /clique\s*aqui\s*para\s*aproveitar/i,
];

const STRONG_TRANSACTION_VERBS = [
  /compra\s*(?:no\s*(?:cr[eé]dito|d[eé]bito)\s*)?aprovada/i,
  /compra\s*realizada/i,
  /pix\s*(?:recebido|enviado|realizado|transferido)/i,
  /voc[eê]\s*(?:recebeu|pagou|transferiu|enviou|comprou|gastou)/i,
  /transfer[eê]ncia\s*(?:recebida|enviada|realizada)/i,
  /pagamento\s*(?:aprovado|realizado|recebido|efetuado)/i,
  /saque\s*(?:realizado|efetuado)/i,
  /estorno\s*(?:aprovado|realizado|creditado)/i,
  /reembolso\s*(?:recebido|creditado)/i,
];

const INCOME_KEYWORDS = [
  /\brecebeu\b/i,
  /\brecebido\b/i,
  /\brecebida\b/i,
  /cr[eé]dito\s*em\s*conta/i,
  /\bestorno\b/i,
  /\breembolso\b/i,
  /\brendimento\b/i,
  /\bdividendo\b/i,
  /\bsal[aá]rio\b/i,
  /dep[oó]sito\s*(?:recebido|compensado|creditado|realizado)/i,
  /\bentrada\b/i,
  /ted\s*recebid/i,
  /doc\s*recebid/i,
  /pix\s*recebid/i,
  /transfer[eê]ncia\s*recebid/i,
];

const EXPENSE_KEYWORDS = [
  /\bcompra\b/i,
  /\bgasto\b/i,
  /\benviado\b/i,
  /\benviada\b/i,
  /\benviou\b/i,
  /\bpagou\b/i,
  /\bpagamento\b/i,
  /\bpago\b/i,
  /\btransferiu\b/i,
  /\bsaque\b/i,
  /\btarifa\b/i,
  /\banuidade\b/i,
  /\bassintatura\b|\bassinatura\b/i,
  /d[eé]bito\s*em\s*conta/i,
  /\bboleto\b/i,
  /cobran[cç]a/i,
  /pix\s*enviad/i,
  /transfer[eê]ncia\s*enviad/i,
];

function stripNoiseBeforeParsing(text: string): string {
  // Remove masked card numbers and trailing 4-digit card suffixes so they aren't mistaken for amounts
  return text
    .replace(/\b(?:cart[aã]o\s*)?(?:final|terminado\s*em)\s*\*?\d{4}\b/gi, ' ')
    .replace(/\*{2,}\s*\d{4}\b/g, ' ')
    .replace(/\b\d{2}:\d{2}\b/g, ' ')
    .replace(/\b\d{2}\/\d{2}(?:\/\d{2,4})?\b/g, ' ');
}

export function extractBRLAmount(rawText: string): number | null {
  const sanitized = stripNoiseBeforeParsing(rawText);

  // 1. Explicit R$ pattern (strongest signal)
  const rDollarMatch = sanitized.match(
    /R\$\s*(\d{1,3}(?:\.\d{3})+,\d{2}|\d+(?:,\d{1,2})?|\d+(?:\.\d{2}))/i
  );
  if (rDollarMatch?.[1]) {
    const num = parseBrazilianNumber(rDollarMatch[1]);
    if (num !== null && num > 0) return num;
  }

  // 2. "valor de 123,45" or decimal with comma/dot
  const valorDeMatch = sanitized.match(
    /\bvalor\s*(?:de|:)?\s*(\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{1,2}|\d+\.\d{2})\b/i
  );
  if (valorDeMatch?.[1]) {
    const num = parseBrazilianNumber(valorDeMatch[1]);
    if (num !== null && num > 0) return num;
  }

  // 3. Any clear Brazilian decimal like 1.250,00 or 45,90
  const decimalCommaMatch = sanitized.match(/\b(\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2})\b/);
  if (decimalCommaMatch?.[1]) {
    const num = parseBrazilianNumber(decimalCommaMatch[1]);
    if (num !== null && num > 0) return num;
  }

  // 4. Dot decimal like 45.90
  const decimalDotMatch = sanitized.match(/\b(\d+\.\d{2})\b/);
  if (decimalDotMatch?.[1]) {
    const num = parseBrazilianNumber(decimalDotMatch[1]);
    if (num !== null && num > 0) return num;
  }

  return null;
}

function parseBrazilianNumber(raw: string): number | null {
  const cleaned = raw.trim();
  let normalized: string;
  if (cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = cleaned;
  }
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

export function detectBankNameFromText(text: string): string {
  for (const bank of KNOWN_BANKS) {
    if (bank.patterns.some((p) => p.test(text))) {
      return bank.label;
    }
  }
  return 'Banco / Cartão';
}

function inferPaymentMethod(text: string): Transaction['paymentMethod'] {
  if (/\bpix\b/i.test(text)) return 'pix';
  if (/\bcr[eé]dito\b/i.test(text)) return 'cartao_credito';
  if (/\bd[eé]bito\b/i.test(text)) return 'cartao_debito';
  if (/\bted\b|\bdoc\b|\btransfer[eê]ncia\b|\bboleto\b/i.test(text)) return 'transferencia';
  if (/\bcompra\b|\bcart[aã]o\b/i.test(text)) return 'cartao_credito';
  return 'transferencia';
}

function inferCategory(text: string, type: TransactionType): FinanceCategory {
  if (type === 'receita') {
    if (/\bsal[aá]rio\b|\bholerite\b|\bfolha\b/i.test(text)) return 'salario';
    if (/\bdividendo\b|\brendimento\b|\btesouro\b|\bcdb\b|\bfii\b|\bjcp\b/i.test(text)) {
      return 'investimentos';
    }
    if (/\bfreelance\b|\bservi[cç]o\b/i.test(text)) return 'freelance';
    return 'outros';
  }

  if (
    /\b(?:ifood|rappi|z[eé]\s*delivery|supermercado|mercado|atacad[aã]o|padaria|restaurante|lanchonete|caf[eé]|a[cç]ougue|hortifruti|mc\s?donald|burger\s?king|pizza|sushi|carrefour|assai|p[aã]o\s*de\s*a[cç][uú]car|extra)\b/i.test(
      text
    )
  ) {
    return 'alimentacao';
  }

  if (
    /\b(?:uber|99|99app|indrive|posto|combust[ií]vel|gasolina|etanol|ipiranga|shell|petrobras|estacionamento|ped[aá]gio|sem\s*parar|veloe|metr[oô]|[oô]nibus|passagem)\b/i.test(
      text
    )
  ) {
    return 'transporte';
  }

  if (
    /\b(?:farm[aá]cia|drogaria|droga\s*raia|drogasil|pague\s*menos|panvel|hospital|cl[ií]nica|laborat[oó]rio|m[eé]dico|dentista|academia|smart\s*fit|bluefit)\b/i.test(
      text
    )
  ) {
    return 'saude';
  }

  if (
    /\b(?:aluguel|condom[ií]nio|energia|enel|cemig|copel|celesc|light|equatorial|[aá]gua|sabesp|sanepar|internet|vivo|claro|tim|oi|g[aá]s|iptu)\b/i.test(
      text
    )
  ) {
    return 'moradia';
  }

  if (/\b(?:faculdade|escola|curso|livraria|livro|udemy|alura|est[aá]cio|unip)\b/i.test(text)) {
    return 'educacao';
  }

  if (
    /\b(?:netflix|spotify|amazon\s*prime|disney|hbo|max|cinema|cinemark|ingresso|steam|playstation|xbox|nintendo|show|teatro|hotel|airbnb)\b/i.test(
      text
    )
  ) {
    return 'lazer';
  }

  return 'outros';
}

function cleanMerchantSegment(segment: string): string {
  return segment
    .replace(/\b(?:no|na)\s*valor\s*de.*$/i, '')
    .replace(/\b(?:com|no|pelo|via)\s*(?:seu\s*)?cart[aã]o.*$/i, '')
    .replace(/\bem\s*\d{2}\/\d{2}.*$/i, '')
    .replace(/\b(?:às|as)\s*\d{2}[:h]\d{2}.*$/i, '')
    .replace(/\bR\$\s*[\d.,]+.*$/i, '')
    .replace(/[.\-–—:;!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(
  combined: string,
  titleHint: string | undefined,
  bankName: string,
  type: TransactionType,
  paymentMethod: Transaction['paymentMethod']
): string {
  // Pattern: "... em <Estabelecimento>" (avoid "em conta", "em 2x", "em 12/05")
  const emMatch = combined.match(
    /\bem\s+(?!conta\b)(?!\d+[xX]\b)(?!\d{2}\/\d{2})([A-Za-zÀ-ÿ0-9*&'._/\- ]{2,45})/i
  );
  if (emMatch?.[1]) {
    const cleaned = cleanMerchantSegment(emMatch[1]);
    if (cleaned.length >= 2) {
      return cleaned;
    }
  }

  // Pattern: "para <Destinatário>" or "de <Remetente>" (ignoring "de R$", "de compra", "de pagamento")
  const partyMatch = combined.match(
    /\b(?:para|de)\s+(?!R\$)(?!compra\b)(?!pagamento\b)(?!transfer[eê]ncia\b)(?!pix\b)(?!valor\b)([A-Za-zÀ-ÿ0-9*&'._/\- ]{3,45})/i
  );
  if (partyMatch?.[1]) {
    const cleaned = cleanMerchantSegment(partyMatch[1]);
    if (cleaned.length >= 2) {
      return `${type === 'receita' ? 'Recebido de' : 'Pagamento para'} ${cleaned}`;
    }
  }

  // Fallback to notification title if concise and not just the bank name
  if (titleHint) {
    const trimmedHint = titleHint.trim();
    if (
      trimmedHint.length >= 3 &&
      trimmedHint.length <= 48 &&
      trimmedHint.toLowerCase() !== bankName.toLowerCase() &&
      !/^\s*R\$/i.test(trimmedHint)
    ) {
      return trimmedHint;
    }
  }

  const methodLabel =
    paymentMethod === 'pix'
      ? 'Pix'
      : paymentMethod === 'cartao_credito'
      ? 'Cartão de Crédito'
      : paymentMethod === 'cartao_debito'
      ? 'Cartão de Débito'
      : 'Transferência';

  return `${bankName} • ${methodLabel} (${type === 'receita' ? 'Entrada' : 'Saída'})`;
}

function extractDate(text: string, timestamp?: number): string {
  const dateMatch = text.match(/\b(\d{2})\/(\d{2})(?:\/(\d{2,4}))?\b/);
  if (dateMatch) {
    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    let year = dateMatch[3] ? Number(dateMatch[3]) : new Date(timestamp || Date.now()).getFullYear();
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const d = new Date(timestamp || Date.now());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function buildNotificationSignature(params: {
  bankName: string;
  type: TransactionType;
  amount: number;
  date: string;
  title: string;
}): string {
  const normBank = params.bankName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normTitle = params.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 24);
  return `${normBank}|${params.type}|${params.amount.toFixed(2)}|${params.date}|${normTitle}`;
}

export function parseBankNotificationText(
  params: ParseBankNotificationParams
): Omit<PendingBankNotification, 'id'> | null {
  const titlePart = (params.title || '').trim();
  const bodyPart = (params.rawText || '').trim();
  const combined = [titlePart, bodyPart].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

  if (!combined) return null;

  const hasStrongVerb = STRONG_TRANSACTION_VERBS.some((p) => p.test(combined));
  const isBlacklisted = NOISE_BLACKLIST.some((p) => p.test(combined));

  if (isBlacklisted && !hasStrongVerb) {
    return null;
  }

  const amount = extractBRLAmount(combined);
  if (amount === null || amount <= 0) {
    return null;
  }

  const isIncome = INCOME_KEYWORDS.some((p) => p.test(combined));
  const isExpense = EXPENSE_KEYWORDS.some((p) => p.test(combined));

  if (!isIncome && !isExpense && !params.allowAmbiguous) {
    return null;
  }

  // Prioritize income when explicitly stated (e.g., "compra estornada" -> receita)
  const type: TransactionType = isIncome ? 'receita' : 'despesa';
  const bankName =
    params.bankName && params.bankName.trim()
      ? params.bankName.trim()
      : detectBankNameFromText(combined);
  const paymentMethod = inferPaymentMethod(combined);
  const category = inferCategory(combined, type);
  const title = extractTitle(combined, params.title, bankName, type, paymentMethod);
  const date = extractDate(combined, params.timestamp);
  const receivedAt = new Date(params.timestamp || Date.now()).toISOString();

  const signature = buildNotificationSignature({
    bankName,
    type,
    amount,
    date,
    title,
  });

  return {
    signature,
    bankName,
    rawText: combined,
    title,
    amount,
    type,
    category,
    paymentMethod,
    date,
    receivedAt,
    source: params.source || 'android',
  };
}
