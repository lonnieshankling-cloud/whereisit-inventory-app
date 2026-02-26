import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { getAuthData } from "~encore/auth";
import { createHash } from "node:crypto";

const geminiApiKey = secret("GeminiApiKey");

interface AnalyzedItem {
  name: string;
  description: string;
  brand: string | null;
  color: string | null;
  size: string | null;
  quantity: number;
  expirationDate: string | null;
  category: string | null;
  notes: string | null;
}

interface AnalyzeShelfRequest {
  imageUrls: string[]; // These are private storage URLs
}

interface AnalyzeShelfResponse {
  items: AnalyzedItem[];
}

const GOOGLE_MODEL_NAME = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL_NAME}:generateContent`;
const GEMINI_TIMEOUT_MS = 20000;
const GEMINI_RETRIES = 3;

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString('base64');
}

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

async function callGeminiWithRetry(parts: GeminiPart[], apiKey: string): Promise<string> {
  let lastError = "Unknown Gemini error";

  for (let attempt = 1; attempt <= GEMINI_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
      const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      });

      const rawBody = await response.text();

      if (!response.ok) {
        lastError = `Gemini HTTP ${response.status}: ${rawBody.slice(0, 400)}`;
        throw new Error(lastError);
      }

      const payload = JSON.parse(rawBody);
      const textPart = payload?.candidates?.[0]?.content?.parts?.find(
        (part: any) => typeof part?.text === "string"
      );

      if (!textPart?.text) {
        lastError = `Gemini returned no text content: ${rawBody.slice(0, 400)}`;
        throw new Error(lastError);
      }

      return textPart.text;
    } catch (error: any) {
      lastError =
        error?.name === "AbortError"
          ? `Gemini request timed out after ${GEMINI_TIMEOUT_MS}ms`
          : error?.message || String(error);

      if (attempt < GEMINI_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(lastError);
}

export const analyzeShelf = api<AnalyzeShelfRequest, AnalyzeShelfResponse>({
  expose: true,
  method: "POST",
  path: "/items/analyze-shelf",
  auth: true,
}, async (req) => {
  const auth = getAuthData()!;
  if (!req.imageUrls || req.imageUrls.length === 0) {
    throw APIError.invalidArgument("At least one image is required");
  }

  const apiKey = geminiApiKey();
  if (!apiKey) {
    throw APIError.unavailable(
      "AI detection service not configured. Please set the GEMINI_API_KEY in Settings."
    );
  }

  const keyFingerprint = createHash("sha256").update(apiKey).digest("hex").slice(0, 12);
  console.log(`[Gemini] Using key fingerprint: ${keyFingerprint}`);

  // 1. Construct the prompt and image parts for the Google API
  const prompt = `You are a JSON-only API. You MUST respond with ONLY a valid JSON array of objects. For each item you see, return an object with "name", "description", "brand", "color", "size", "quantity", "expirationDate", "category", and "notes".
    - "name": The item's name.
    - "description": A brief 5-10 word description.
    - "brand": The brand name, or null if not visible.
    - "color": The item's primary color, or null if not clear.
    - "size": The item's size (e.g., "12 oz"), or null if not visible.
    - "quantity": The estimated number of items, default to 1.
    - "expirationDate": The expiration date in YYYY-MM-DD format, or null if not visible.
    - "category": A single-word suggested category (e.g., "Dairy", "Cleaning"), or null.
    - "notes": A brief description of its location (e.g., "Top shelf, next to the milk"), or null.
    Example: [{ "name": "Cereal", "description": "Box of cereal", "brand": "Cheerios", "color": "Yellow", "size": "18 oz", "quantity": 1, "expirationDate": null, "category": "Pantry", "notes": "Middle shelf, next to the pasta" }].
    Respond with an empty array [] if no items are found.`;

  const requestParts: GeminiPart[] = [{ text: prompt }];

  try {
    // Fetch each image, convert it to base64, and add to request parts
    for (const url of req.imageUrls) {
      const mimeType = url.toLowerCase().includes(".png") ? "image/png" : "image/jpeg";

      // Fetch the image from the private storage URL
      const imageResponse = await fetch(url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image from storage: ${url}`);
      }

      // Get the image data as an ArrayBuffer
      const imageBuffer = await imageResponse.arrayBuffer();
      
      // Convert the buffer to a base64 string
      const base64Data = arrayBufferToBase64(imageBuffer);

      // Add to request parts using inlineData
      requestParts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data,
        },
      });
    }
  } catch (fetchError: any) {
    console.error("Failed to fetch image for AI processing:", fetchError.message);
    throw APIError.internal("Failed to read image from storage");
  }

  // Call Gemini API directly with retries for transient network issues
  try {
    const jsonText = await callGeminiWithRetry(requestParts, apiKey);
    const items = JSON.parse(jsonText);

    return { items };

  } catch (error: any) {
    console.error("Failed to call Google AI:", error.message);
    throw APIError.internal("AI detection failed: " + error.message);
  }
});
