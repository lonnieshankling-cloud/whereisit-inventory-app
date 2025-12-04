import { ImageAnnotatorClient } from "@google-cloud/vision";
import { api } from "encore.dev/api";

interface ExtractReceiptDataRequest {
  imageUrl: string;
}

interface ExtractedReceiptData {
  extractedDate: string | null;
  extractedPrice: number | null;
  extractedStore: string | null;
  rawText: string;
}

export const extractReceiptData = api(
  { expose: true, method: "POST", path: "/item/extract-receipt-data", auth: true },
  async ({ imageUrl }: ExtractReceiptDataRequest): Promise<ExtractedReceiptData> => {
    try {
      // Initialize Google Vision client
      const client = new ImageAnnotatorClient();

      // Perform text detection
      const [result] = await client.textDetection(imageUrl);
      const detections = result.textAnnotations;

      if (!detections || detections.length === 0) {
        return {
          extractedDate: null,
          extractedPrice: null,
          extractedStore: null,
          rawText: "",
        };
      }

      // First annotation contains full text
      const rawText = detections[0].description || "";
      const lines = rawText.split("\n");

      // Extract store name (usually in first few lines)
      const extractedStore = extractStoreName(lines);

      // Extract date
      const extractedDate = extractDate(rawText);

      // Extract price (total)
      const extractedPrice = extractPrice(rawText);

      return {
        extractedDate,
        extractedPrice,
        extractedStore,
        rawText,
      };
    } catch (error) {
      // Error extracting receipt data - return empty result
      return {
        extractedDate: null,
        extractedPrice: null,
        extractedStore: null,
        rawText: "",
      };
    }
  }
);

function extractStoreName(lines: string[]): string | null {
  // Store name is typically in first 3 lines, usually the longest/most prominent
  const firstLines = lines.slice(0, 3).filter((line) => line.trim().length > 2);
  
  if (firstLines.length === 0) return null;

  // Return the first substantial line (likely store name)
  const storeLine = firstLines.find((line) => line.length > 3 && line.length < 50);
  return storeLine ? storeLine.trim() : firstLines[0].trim();
}

function extractDate(text: string): string | null {
  // Common date patterns
  const datePatterns = [
    // MM/DD/YYYY or MM-DD-YYYY
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/,
    // YYYY/MM/DD or YYYY-MM-DD
    /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/,
    // Month DD, YYYY
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/i,
    // DD Month YYYY
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      return normalizeDate(match[0]);
    }
  }

  return null;
}

function normalizeDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      // Return in YYYY-MM-DD format
      return date.toISOString().split("T")[0];
    }
  } catch (error) {
    // If parsing fails, return original
  }
  return dateString;
}

function extractPrice(text: string): number | null {
  // Look for "total", "amount", or $ signs followed by numbers
  const pricePatterns = [
    // Total: $XX.XX or TOTAL $XX.XX
    /(?:total|amount|sum)[\s:]*\$?\s*(\d+[,\d]*\.?\d{0,2})/i,
    // $XX.XX at end of line (likely total)
    /\$\s*(\d+[,\d]*\.\d{2})\s*$/m,
    // Any $XX.XX
    /\$\s*(\d+[,\d]*\.\d{2})/,
  ];

  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Remove commas and parse as float
      const priceStr = match[1].replace(/,/g, "");
      const price = parseFloat(priceStr);
      if (!isNaN(price)) {
        return price;
      }
    }
  }

  return null;
}
