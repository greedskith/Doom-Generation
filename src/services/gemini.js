import { GoogleGenAI, Type } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
let client = null;

if (apiKey && apiKey !== 'your_gemini_api_key_here') {
  client = new GoogleGenAI({ apiKey });
}

// Convert an image URL or Blob URL to a Base64 string using fetch and FileReader
async function urlToBase64(url) {
  if (url.startsWith('data:')) {
    const parts = url.split(',');
    const mimeType = parts[0].split(':')[1].split(';')[0];
    return { b64: parts[1], mimeType };
  }

  const response = await fetch(url);
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

  // Option 2: Direct Gemini Client (Requires key restricted by HTTP Referrers in Google Cloud Console)
  if (!client) {
    console.warn("No VITE_GEMINI_API_KEY or VITE_GEMINI_PROXY_URL provided. Returning mock analysis.");
    await new Promise(r => setTimeout(r, 1200));
    return MOCK_ANALYSIS;
  }

  try {
    const { b64, mimeType } = await urlToBase64(photoUrl);

    const promptText = `Analyze the photographic composition of this image.
You must choose EXACTLY ONE of the following rules that best fits the image:
"Rule of Thirds", "Golden Ratio", "Golden Triangle", "Geometric Triangles", "Half and Half", "Quarter Frame", "Leading Lines", "Diagonals", "C and S Curves", "Converging Lines", "Frame Within a Frame".

Return a JSON object containing:
1. "rule": the exact string of the chosen rule.
2. "focalPoints": array of objects [{"x": number 0-100, "y": number 0-100}] for primary anchor points.
3. "lines": (optional) array of objects [{"x1": number, "y1": number, "x2": number, "y2": number, "label": string}] representing structural lines.

The x and y coordinates MUST be numbers between 0 and 100, representing percentage coordinates from the top-left (0,0).`;

    const response = await client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: promptText },
            { inlineData: { data: b64, mimeType } }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
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
        }
      }
    });

    const rawOutput = typeof response.text === 'function' ? response.text() : response.text;
    const json = typeof rawOutput === 'string' ? JSON.parse(rawOutput) : rawOutput;
    return json;
  } catch (err) {
    console.error("Gemini Analysis Failed:", err);
    throw new Error(err.message || "Failed to analyze composition. API Quota exceeded or network error.");
  }
}
