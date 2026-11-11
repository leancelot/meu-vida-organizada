import { FinanceCategory, Transaction } from '../types';

export interface ParsedReceiptData {
  title: string;
  amount: number;
  date: string;
  category: FinanceCategory;
  paymentMethod?: Transaction['paymentMethod'];
  notes?: string;
}

/**
 * Converts a file (image/photo) into a base64 string and sends to Gemini API backend
 */
export async function scanReceiptWithAI(file: File): Promise<ParsedReceiptData> {
  const base64 = await fileToBase64(file);

  // If running inside native mobile wrapper (Capacitor/Cordova), use hosted backend URL
  const defaultHostedUrl = 'https://ais-pre-3wiiypdjeboooeth4s5qlf-202698123569.us-east1.run.app';
  const isLocalOrigin = typeof window !== 'undefined' && (window.location.origin.includes('localhost') || window.location.protocol === 'capacitor:');
  const baseUrl = import.meta.env.VITE_APP_URL || (isLocalOrigin ? defaultHostedUrl : '');
  const endpoint = `${baseUrl}/api/gemini/parse-receipt`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType: file.type || 'image/jpeg',
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro ${res.status}: Não foi possível ler a nota fiscal.`);
  }

  const data = await res.json();

  // Validate and sanitize data
  const amount = typeof data.amount === 'number' ? data.amount : parseFloat(data.amount) || 0;
  const title = (data.title || 'Compra Nota Fiscal').trim();
  const date = data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : new Date().toISOString().split('T')[0];
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
  const category: FinanceCategory = validCategories.includes(data.category) ? data.category : 'alimentacao';

  const validPayments = ['pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'transferencia'];
  const paymentMethod = validPayments.includes(data.paymentMethod) ? data.paymentMethod : 'cartao_credito';

  return {
    title,
    amount,
    date,
    category,
    paymentMethod: paymentMethod as any,
    notes: data.notes || '',
  };
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
