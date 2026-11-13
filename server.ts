import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for mobile app wrappers (Capacitor/Cordova/PWA)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Increase body limit to support base64 photos/receipts
app.use(express.json({ limit: '25mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const RECEIPT_PRIMARY_MODEL = 'gemini-4-hydrogen';
const RECEIPT_FALLBACK_MODEL = 'gemini-3.1-flash-lite';
const RETRY_DELAYS_MS = [800, 1800];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractErrorInfo(err: unknown): { code: number; status: string; message: string } {
  const anyErr = err as any;
  const rawMsg = typeof anyErr?.message === 'string' ? anyErr.message : String(err || '');
  let code = Number(anyErr?.status || anyErr?.code || 0);
  let status = typeof anyErr?.statusText === 'string' ? anyErr.statusText : '';
  let message = rawMsg;

  if (rawMsg.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rawMsg);
      const inner = parsed?.error || parsed;
      if (inner?.code) code = Number(inner.code);
      if (inner?.status) status = String(inner.status);
      if (inner?.message) message = String(inner.message);
    } catch {
      // keep raw message
    }
  }

  return { code, status, message };
}

function isTransientGeminiError(info: { code: number; status: string; message: string }): boolean {
  const msg = info.message.toLowerCase();
  const st = info.status.toUpperCase();
  return (
    info.code === 503 ||
    info.code === 429 ||
    info.code === 500 ||
    st === 'UNAVAILABLE' ||
    st === 'RESOURCE_EXHAUSTED' ||
    msg.includes('high demand') ||
    msg.includes('unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('temporarily')
  );
}

function mapReceiptErrorToPortuguese(info: { code: number; status: string; message: string }): {
  httpStatus: number;
  userMessage: string;
} {
  const st = info.status.toUpperCase();
  if (info.code === 503 || st === 'UNAVAILABLE') {
    return {
      httpStatus: 503,
      userMessage:
        'O serviço de leitura por IA está com alta demanda no momento. Tente novamente em alguns segundos.',
    };
  }
  if (info.code === 429 || st === 'RESOURCE_EXHAUSTED') {
    return {
      httpStatus: 429,
      userMessage:
        'Limite temporário de leituras atingido. Aguarde alguns instantes e tente novamente.',
    };
  }
  if (info.code === 403 || info.code === 401 || st === 'PERMISSION_DENIED') {
    return {
      httpStatus: 403,
      userMessage:
        'Não foi possível validar o acesso ao serviço de leitura automática no servidor.',
    };
  }
  if (info.code === 400 || st === 'INVALID_ARGUMENT') {
    return {
      httpStatus: 400,
      userMessage:
        'Não foi possível processar esta imagem. Tente enviar outra foto mais nítida da nota fiscal.',
    };
  }
  return {
    httpStatus: 500,
    userMessage: 'Não foi possível ler a nota fiscal agora. Tente novamente ou preencha manualmente.',
  };
}

/**
 * Endpoint for AI Receipt / Nota Fiscal OCR & Financial extraction
 */
app.post('/api/gemini/parse-receipt', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Serviço de leitura por IA não configurado no servidor.',
      });
    }

    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem de nota fiscal fornecida.' });
    }

    // Clean potential base64 prefix if passed
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
    const currentYear = new Date().getFullYear();

    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: cleanBase64,
      },
    };

    const textPart = {
      text: `Analise cuidadosamente esta imagem de nota fiscal, cupom fiscal (NFC-e, SAT, DANFE) ou recibo comercial.
Extraia com a máxima precisão os dados financeiros para lançamento de despesa no sistema de finanças:
1. title: Nome fantasia ou razão social do estabelecimento ou loja (ex: "Supermercado Pão de Açúcar", "Posto Ipiranga", "Farmácia Droga Raia", "Restaurante Bom Sabor").
2. amount: Valor TOTAL da nota fiscal em número decimal (ex: 149.90). Certifique-se de pegar o Total a Pagar, não o troco ou subtotais parciais.
3. date: Data da emissão da compra no formato YYYY-MM-DD. Se o ano não constar, use o ano de ${currentYear}. Se ilegível, use a data atual.
4. category: Uma das seguintes categorias de despesa: "alimentacao", "moradia", "transporte", "saude", "educacao", "lazer", "outros".
5. paymentMethod: Forma de pagamento identificada na nota: "pix", "cartao_credito", "cartao_debito", "dinheiro" ou "transferencia".
6. notes: Resumo breve dos principais itens ou produtos adquiridos.`,
    };

    const callReceiptModel = async (model: string) =>
      ai.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] },
        config: {
          systemInstruction:
            'Você é um assistente especialista em leitura de documentos fiscais e extração de recibos financeiros brasileiros e internacionais. Seja preciso nos valores, datas e estabelecimentos.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Nome fantasia ou estabelecimento da nota fiscal',
              },
              amount: {
                type: Type.NUMBER,
                description: 'Valor total pago na nota fiscal em formato decimal',
              },
              date: {
                type: Type.STRING,
                description: 'Data de emissão no formato YYYY-MM-DD',
              },
              category: {
                type: Type.STRING,
                description:
                  'Uma categoria entre: alimentacao, moradia, transporte, saude, educacao, lazer, outros',
              },
              paymentMethod: {
                type: Type.STRING,
                description:
                  'Forma de pagamento: pix, cartao_credito, cartao_debito, dinheiro ou transferencia',
              },
              notes: {
                type: Type.STRING,
                description: 'Resumo dos produtos ou itens comprados',
              },
            },
            required: ['title', 'amount', 'date', 'category'],
          },
        },
      });

    let response;
    let lastError: unknown = null;

    // 1. Primary model with exponential backoff retries on transient errors
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        response = await callReceiptModel(RECEIPT_PRIMARY_MODEL);
        break;
      } catch (err) {
        lastError = err;
        const info = extractErrorInfo(err);
        if (!isTransientGeminiError(info) || attempt === RETRY_DELAYS_MS.length) {
          break;
        }
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }

    // 2. Fallback model if primary model failed due to transient unavailability/rate limit
    if (!response && lastError) {
      const info = extractErrorInfo(lastError);
      if (isTransientGeminiError(info)) {
        try {
          response = await callReceiptModel(RECEIPT_FALLBACK_MODEL);
          lastError = null;
        } catch (fallbackErr) {
          lastError = fallbackErr;
        }
      }
    }

    if (!response) {
      throw lastError || new Error('Falha ao obter resposta da leitura automática.');
    }

    const jsonText = response.text || '{}';
    const parsedData = JSON.parse(jsonText);
    return res.json(parsedData);
  } catch (err: unknown) {
    const info = extractErrorInfo(err);
    console.error('Erro ao ler nota fiscal com IA Gemini:', info);
    const mapped = mapReceiptErrorToPortuguese(info);
    return res.status(mapped.httpStatus).json({
      error: mapped.userMessage,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        const htmlPath = path.resolve(__dirname, 'index.html');
        if (fs.existsSync(htmlPath)) {
          let template = fs.readFileSync(htmlPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          return;
        }
        next();
      } catch (e) {
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
