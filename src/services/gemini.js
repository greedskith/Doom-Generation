import { GoogleGenAI, Type } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
let client = null;

if (apiKey && apiKey !== 'your_gemini_api_key_here') {
  client = new GoogleGenAI({ apiKey });
}

// Quality-ranked fallback chain. All verified as free-tier capable.
// The waterfall tries each model in order, falling through only on
// retryable errors (429 quota exhausted, 503 demand spike).
const FALLBACK_MODELS = [
  'gemini-3.8-flash',     // 1. Highest Flash quality (20 req/day free)
  'gemini-3.7-flash',     // 2. High-precision fallback
  'gemini-3.6-flash',     // 3. Stable workhorse
  'gemini-3.5-flash',     // 4. Broad-quota backup
  'gemini-3.5-flash-lite' // 5. Ultra-fast safety net
];

// In-memory cooldown timestamp for models that returned 429 quota exhaustion.
// Prevents wasting 1-2s roundtrips on known-exhausted models on subsequent requests.
const modelCooldowns = new Map();

// HTTP status codes that should trigger the next model in the chain.
// 429 = rate/quota limit; 503 = transient demand spike.
const RETRYABLE_STATUS_CODES = new Set([429, 503]);

// Shared response schema definition
const COMPOSITION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    rule: { type: Type.STRING },
    focalPoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          x: { type: Type.NUMBER },
          y: { type: Type.NUMBER }
        },
        required: ['x', 'y']
      }
    },
    lines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          x1: { type: Type.NUMBER },
          y1: { type: Type.NUMBER },
          x2: { type: Type.NUMBER },
          y2: { type: Type.NUMBER },
          label: { type: Type.STRING }
        },
        required: ['x1', 'y1', 'x2', 'y2']
      }
    }
  },
  required: ['rule', 'focalPoints']
};

const PROMPT_TEXT = `Analyze the photographic composition of this image.
You must choose EXACTLY ONE of the following rules that best fits the image:
"Rule of Thirds", "Golden Ratio", "Golden Triangle", "Geometric Triangles", "Half and Half", "Quarter Frame", "Leading Lines", "Diagonals", "C and S Curves", "Converging Lines", "Frame Within a Frame".

Return a JSON object containing:
1. "rule": the exact string of the chosen rule.
2. "focalPoints": array of objects [{"x": number 0-100, "y": number 0-100}] for primary anchor points.
3. "lines": (optional) array of objects [{"x1": number, "y1": number, "x2": number, "y2": number, "label": string}] representing structural lines.

The x and y coordinates MUST be numbers between 0 and 100, representing percentage coordinates from the top-left (0,0).`;

// Optimize image URL for Gemini Vision (compress & cap dimensions to 1024px to prevent multi-megabyte payloads)
function getAnalysisImageUrl(url) {
  if (!url) return url;
  if (url.includes('res.cloudinary.com')) {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      return `${parts[0]}/upload/f_jpg,q_auto:good,w_1024,c_limit/${parts[1]}`;
    }
  }
  return url;
}

// Convert an image URL or Blob URL to a Base64 string using fetch and FileReader
async function urlToBase64(url) {
  if (url.startsWith('data:')) {
    const parts = url.split(',');
    const mimeType = parts[0].split(':')[1].split(';')[0];
    return { b64: parts[1], mimeType };
  }

  const optimizedUrl = getAnalysisImageUrl(url);
  const response = await fetch(optimizedUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image for analysis (${response.status} ${response.statusText})`);
  }
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result.split(',')[1];
      resolve({ b64, mimeType: blob.type || 'image/jpeg' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Extract a numeric HTTP status code from a Gemini SDK error object
function getErrorStatus(err) {
  if (!err) return null;
  if (typeof err.status === 'number') return err.status;
  if (typeof err.statusCode === 'number') return err.statusCode;
  if (err.status && !isNaN(Number(err.status))) return Number(err.status);
  try {
    const parsed = typeof err.message === 'string' ? JSON.parse(err.message) : null;
    if (parsed?.error?.code) return parsed.error.code;
  } catch {}
  const msg = String(err.message || '');
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) return 429;
  if (msg.includes('503') || msg.includes('UNAVAILABLE')) return 503;
  return null;
}

// Fallback mock data in case API key is missing or network fails
const MOCK_ANALYSIS = {
  rule: "Rule of Thirds",
  focalPoints: [{ x: 66.66, y: 33.33 }]
};

export async function analyzeComposition(photoUrl) {
  // Option 1: Secure Backend Proxy endpoint (if configured)
  if (proxyUrl) {
    try {
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl })
      });
      if (!res.ok) throw new Error(`Proxy error: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      console.warn("Backend proxy failed, attempting client fallback:", err);
    }
  }

  // Option 2: Direct Gemini Client with waterfall model fallback
  if (!client) {
    console.warn("No VITE_GEMINI_API_KEY or VITE_GEMINI_PROXY_URL provided. Returning mock analysis.");
    await new Promise(r => setTimeout(r, 1200));
    return MOCK_ANALYSIS;
  }

  const { b64, mimeType } = await urlToBase64(photoUrl);

  const contents = [
    {
      role: 'user',
      parts: [
        { text: PROMPT_TEXT },
        { inlineData: { data: b64, mimeType } }
      ]
    }
  ];

  let lastError = null;
  const now = Date.now();
  // Filter models that are not in an active cooldown window
  const activeModels = FALLBACK_MODELS.filter(m => (modelCooldowns.get(m) || 0) <= now);
  const modelsToTry = activeModels.length > 0 ? activeModels : FALLBACK_MODELS;

  for (const model of modelsToTry) {
    try {
      const response = await client.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: COMPOSITION_SCHEMA
        }
      });

      const rawOutput = typeof response.text === 'function' ? response.text() : response.text;
      const json = typeof rawOutput === 'string' ? JSON.parse(rawOutput) : rawOutput;

      if (model !== FALLBACK_MODELS[0]) {
        console.info(`[Gemini] Served by fallback model: ${model}`);
      }

      return json;
    } catch (err) {
      const status = getErrorStatus(err);

      if (RETRYABLE_STATUS_CODES.has(status)) {
        // Quota or demand spike — mark 10-minute cooldown and try next model
        console.warn(`[Gemini] ${model} returned ${status}, setting cooldown and falling back...`);
        modelCooldowns.set(model, Date.now() + 10 * 60 * 1000);
        lastError = err;
        continue;
      }

      // Non-retryable error (auth, bad request, network, etc.) — fail fast
      console.error(`[Gemini] Non-retryable error from ${model}:`, err);
      throw new Error(err.message || "Failed to analyze composition.");
    }
  }

  // All models exhausted — surface the last error to the UI
  console.error("[Gemini] All models in fallback chain exhausted.");
  throw new Error(
    lastError?.message ||
    "Composition analysis unavailable — all models are currently over quota. Please try again later."
  );
}
