import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
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

/**
 * Endpoint for AI Receipt / Nota Fiscal OCR & Financial extraction
 */
app.post('/api/gemini/parse-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem de nota fiscal fornecida.' });
    }

    // Clean potential base64 prefix if passed
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

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
3. date: Data da emissão da compra no formato YYYY-MM-DD. Se o ano não constar, use o ano de 2026. Se ilegível, use a data atual.
4. category: Uma das seguintes categorias de despesa: "alimentacao", "moradia", "transporte", "saude", "educacao", "lazer", "outros".
5. paymentMethod: Forma de pagamento identificada na nota: "pix", "cartao_credito", "cartao_debito", "dinheiro" ou "transferencia".
6. notes: Resumo breve dos principais itens ou produtos adquiridos (ex: "Compras: arroz, leite, café e sabão" ou "Gasolina aditivada 30L").`,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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

    const jsonText = response.text || '{}';
    const parsedData = JSON.parse(jsonText);
    return res.json(parsedData);
  } catch (err: any) {
    console.error('Erro ao ler nota fiscal com IA Gemini:', err);
    return res.status(500).json({
      error: err.message || 'Erro ao processar a nota fiscal com inteligência artificial.',
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
