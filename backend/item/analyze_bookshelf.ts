import { GoogleGenerativeAI } from "@google/generative-ai";
import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { getAuthData } from "~encore/auth";

const geminiApiKey = secret("GeminiApiKey");

interface BookAnalysis {
  guessed_title: string;
  guessed_author: string;
  visual_signature: string;
  shelf_location: string;
  search_query: string;
}

interface AnalyzeBookshelfRequest {
  imageUrls: string[]; // Private storage URLs
}

interface AnalyzeBookshelfResponse {
  books: BookAnalysis[];
}

const GOOGLE_MODEL_NAME = "gemini-2.5-flash";

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString('base64');
}

export const analyzeBookshelf = api<AnalyzeBookshelfRequest, AnalyzeBookshelfResponse>({
  expose: true,
  method: "POST",
  path: "/items/analyze-bookshelf",
  auth: true,
}, async (req) => {
  const auth = getAuthData()!;
  if (!req.imageUrls || req.imageUrls.length === 0) {
    throw APIError.invalidArgument("At least one image is required");
  }

  const apiKey = geminiApiKey();
  if (!apiKey) {
    throw APIError.unavailable(
      "AI detection service not configured. Please set the GeminiApiKey secret."
    );
  }

  // Construct the prompt for bookshelf analysis
  const prompt = `You are an inventory assistant. Analyze the image of the bookshelf.
For each book visible on the shelf, output a JSON object with:
1. 'guessed_title': The most prominent text on the spine (the book's title).
2. 'guessed_author': Any author names visible on the spine.
3. 'visual_signature': A 3-word visual description (e.g., 'Maroon, Gold Text' or 'Blue, White Spine').
4. 'shelf_location': Calculate the position from left to right (e.g., '1 of 8' or '3 of 12').
5. 'search_query': A string optimized to find this exact book in an API (e.g., 'Law of Success Napoleon Hill Deluxe' or 'Harry Potter Sorcerer Stone Rowling').

IMPORTANT: 
- Return ONLY a valid JSON array of book objects
- If a field cannot be determined, use an empty string ""
- Number books from left to right on each shelf
- Respond with an empty array [] if no books are found

Example response:
[
  {
    "guessed_title": "The Law of Success",
    "guessed_author": "Napoleon Hill",
    "visual_signature": "Maroon, Gold Text",
    "shelf_location": "1 of 8",
    "search_query": "Law of Success Napoleon Hill Deluxe Edition"
  },
  {
    "guessed_title": "Atomic Habits",
    "guessed_author": "James Clear",
    "visual_signature": "Blue, White Spine",
    "shelf_location": "2 of 8",
    "search_query": "Atomic Habits James Clear"
  }
]`;

  const requestParts: any[] = [prompt];

  try {
    // Fetch each image, convert to base64, and add to request
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

  // Use the Google Generative AI SDK
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: GOOGLE_MODEL_NAME,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(requestParts);
    const response = await result.response;
    const jsonText = response.text();
    const books = JSON.parse(jsonText);

    return { books };

  } catch (error: any) {
    console.error("Failed to call Google AI:", error.message);
    throw APIError.internal("AI detection failed: " + error.message);
  }
});
