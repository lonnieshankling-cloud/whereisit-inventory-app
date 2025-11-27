import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { getAuthData } from "~encore/auth";

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

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString('base64');
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

  const requestParts: any[] = [{ text: prompt }];

  try {
    // We must fetch each image, convert it to base64, and send the bytes.
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
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      });
    }
  } catch (fetchError: any) {
    console.error("Failed to fetch image for AI processing:", fetchError.message);
    throw APIError.internal("Failed to read image from storage");
  }

  // 2. Make the direct 'fetch' call to the Google AI API
  const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL_NAME}:generateContent?key=${apiKey}`;

  let response;
  try {
    response = await fetch(googleApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: requestParts,
        }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorBody: any = await response.json();
      console.error("Google AI API Error:", JSON.stringify(errorBody, null, 2));
      throw new Error(`Google API responded with status ${response.status}: ${errorBody.error.message}`);
    }

    const data: any = await response.json();

    // 3. Parse the JSON response from Google
    const jsonText = data.candidates[0].content.parts[0].text;
    const items = JSON.parse(jsonText);

    return { items };

  } catch (error: any) {
    console.error("Failed to call Google AI:", error.message);
    throw APIError.internal("AI detection failed");
  }
});
