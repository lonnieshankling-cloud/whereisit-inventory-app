import { ImageAnnotatorClient } from "@google-cloud/vision";
import { api } from "encore.dev/api";

interface DetectBarcodeRequest {
  imageData: string; // base64 image data
}

interface BarcodeResult {
  format: string;
  rawValue: string;
}

interface DetectBarcodeResponse {
  barcodes: BarcodeResult[];
}

// Fast barcode-only detection endpoint with timeout
export const detectBarcode = api(
  { expose: true, method: "POST", path: "/item/detect-barcode", auth: false },
  async ({ imageData }: DetectBarcodeRequest): Promise<DetectBarcodeResponse> => {
    try {
      console.log("[Fast Barcode] Starting detection...");
      
      // Initialize Vision API client with explicit credentials path
      const client = new ImageAnnotatorClient({
        keyFilename: './google-vision-key.json'
      });

      // Create timeout promise (30 seconds max for Vision API)
      // Ensure we clear the timeout once Vision returns to avoid spurious timeout logs.
      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          console.error("[Fast Barcode] Vision API timeout after 30 seconds");
          reject(new Error("Barcode detection timeout after 30 seconds"));
        }, 30000);
      });

      // Race between Vision API call and timeout
      console.log("[Fast Barcode] Calling Vision API...");
      const visionPromise = client
        .annotateImage({
          image: { content: Buffer.from(imageData, "base64") },
          features: [
            { type: "BARCODE_DETECTION" },
          ],
        })
        .finally(() => {
          if (timeoutId) clearTimeout(timeoutId);
        });

      const [result] = await Promise.race([visionPromise, timeoutPromise]) as any;

      const barcodeAnnotations = (result as any).barcodeAnnotations || [];
      console.log(`[Fast Barcode] Vision API returned ${barcodeAnnotations.length} barcode(s)`);
      
      if (barcodeAnnotations.length > 0) {
        console.log(`[Fast Barcode] Detected ${barcodeAnnotations.length} barcode(s)`);
        barcodeAnnotations.forEach((barcode: any) => {
          console.log(`  - ${barcode.format}: ${barcode.rawValue}`);
        });
      }

      const barcodes: BarcodeResult[] = barcodeAnnotations.map((b: any) => ({
        format: b.format || "UNKNOWN",
        rawValue: b.rawValue || "",
      }));

      return { barcodes };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[Fast Barcode] Error:", errorMsg);
      return { barcodes: [] };
    }
  }
);
