import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Allow large image uploads for high-resolution receipt photos
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Shared server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// OCR Receipt Scanner Endpoint
app.post('/api/scan-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 data' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not set on the server. Please check your environment variables.',
      });
    }

    if (!ai) {
      ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }

    // Strip data URI header if included (e.g. "data:image/jpeg;base64,")
    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
    const detectedMime = mimeType || 'image/jpeg';
    const currentYear = new Date().getFullYear();

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: detectedMime,
              data: cleanBase64,
            },
          },
          {
            text: `You are an expert OCR receipt parser. Carefully inspect this photo of a receipt or invoice.
Extract the following information:
1. "amount": The grand total charged (as a positive number, e.g. 24.50). Exclude tips or subtotal unless total is unavailable.
2. "description": The merchant name, store, restaurant, vendor, or service (e.g., "Starbucks Coffee", "Uber Ride", "Carrefour Express", "Hotel Tokyo").
3. "date": The transaction date in standard YYYY-MM-DD format. If only month and day are present, assume year ${currentYear}. If the date cannot be deciphered, use today's date ${new Date().toISOString().split('T')[0]}.
4. "category": Choose the single most accurate category from: "Food", "Transport", "Lodging", "Activities", "Shopping", "Misc".
5. "notes": A concise 1-sentence summary of items purchased or payment method (e.g. "2x Flat White, 1x Croissant - Paid via Visa").
6. "confidence": A float from 0 to 1 indicating your confidence in the OCR extraction.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: {
              type: Type.NUMBER,
              description: 'The final total charge on the receipt as a positive number.',
            },
            description: {
              type: Type.STRING,
              description: 'The merchant, restaurant, or business name.',
            },
            date: {
              type: Type.STRING,
              description: 'Receipt transaction date formatted strictly as YYYY-MM-DD.',
            },
            category: {
              type: Type.STRING,
              description: 'One of: Food, Transport, Lodging, Activities, Shopping, Misc',
            },
            notes: {
              type: Type.STRING,
              description: 'Brief summary of itemized charges or tax/tip details.',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence level between 0 and 1.',
            },
          },
          required: ['amount', 'description', 'date', 'category'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      return res.status(500).json({ error: 'No output generated from OCR model' });
    }

    const parsedData = JSON.parse(text);
    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: unknown) {
    console.error('Receipt OCR error:', error);
    const message = error instanceof Error ? error.message : 'Failed to scan receipt';
    return res.status(500).json({ error: message });
  }
});

// Setup Vite in development or serve static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
