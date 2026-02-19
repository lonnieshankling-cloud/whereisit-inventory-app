import { ImageAnnotatorClient } from "@google-cloud/vision";
import { api } from "encore.dev/api";

interface AnalyzeShelfRequest {
  imageUrl: string;
}

interface DetectedItemData {
  name: string;
  brand?: string;
  category?: string;
  extractedText?: string;
  confidence?: number;
}

interface AnalyzeShelfResponse {
  items: DetectedItemData[];
  rawOcrText: string;
}

interface DetectedBarcode {
  format?: string;
  rawValue?: string;
}

export const analyzeShelfOcr = api(
  { expose: true, method: "POST", path: "/item/analyze-shelf-ocr", auth: false },
  async ({ imageUrl }: AnalyzeShelfRequest): Promise<AnalyzeShelfResponse> => {
    try {
      const client = new ImageAnnotatorClient();

      const [result] = await client.annotateImage({
        image: { source: { imageUri: imageUrl } },
        features: [
          { type: "TEXT_DETECTION" },
          { type: "BARCODE_DETECTION" }, // PHASE 2: Barcode detection
          { type: "LABEL_DETECTION", maxResults: 20 },
          { type: "LOGO_DETECTION", maxResults: 10 },
          { type: "OBJECT_LOCALIZATION", maxResults: 20 },
        ],
      });

      const textAnnotations = result.textAnnotations || [];
      const barcodeAnnotations: DetectedBarcode[] =
        ((result as unknown as { barcodeAnnotations?: DetectedBarcode[] }).barcodeAnnotations ?? []);
      const labelAnnotations = result.labelAnnotations || [];
      const logoAnnotations = result.logoAnnotations || [];
      const objectAnnotations = result.localizedObjectAnnotations || [];

      const rawOcrText = textAnnotations[0]?.description || "";
      const detectedBrands = logoAnnotations.map((logo) => logo.description || "");
      const textSnippets = textAnnotations.slice(1).map((t) => t.description || "");

      // Log barcode detections
      if (barcodeAnnotations.length > 0) {
        console.log(`[Vision API] Detected ${barcodeAnnotations.length} barcode(s)`);
        barcodeAnnotations.forEach((barcode) => {
          console.log(`  - ${barcode.format}: ${barcode.rawValue}`);
        });
      }

      const items: DetectedItemData[] = [];
      
      for (const obj of objectAnnotations) {
        const itemName = obj.name || "Unknown Item";
        const confidence = obj.score || 0;

        const relevantText = extractRelevantTextForObject(obj, textSnippets, textAnnotations);
        const brand = findBrandForItem(relevantText, detectedBrands);
        const category = categorizeItem(itemName, labelAnnotations);

        items.push({
          name: capitalizeWords(itemName),
          brand: brand || undefined,
          category: category || undefined,
          extractedText: relevantText || undefined,
          confidence: Math.round(confidence * 100) / 100,
        });
      }

      if (items.length === 0) {
        const topLabels = labelAnnotations
          .filter((label) => (label.score || 0) > 0.7)
          .slice(0, 5);

        for (const label of topLabels) {
          items.push({
            name: capitalizeWords(label.description || "Item"),
            confidence: Math.round((label.score || 0) * 100) / 100,
          });
        }
      }

      // Return full Vision API result including barcodes in rawOcrText
      return { 
        items, 
        rawOcrText: JSON.stringify({ 
          text: rawOcrText,
          barcodeAnnotations: barcodeAnnotations.map((b) => ({
            format: b.format,
            rawValue: b.rawValue,
          })),
        }) 
      };
    } catch (error) {
      console.error("Error analyzing shelf:", error);
      return { items: [], rawOcrText: "" };
    }
  }
);

function extractRelevantTextForObject(obj: any, textSnippets: string[], allAnnotations: any[]): string | null {
  if (!obj.boundingPoly?.normalizedVertices) return null;

  const objVertices = obj.boundingPoly.normalizedVertices;
  const objCenterX = (objVertices[0].x + objVertices[2].x) / 2;
  const objCenterY = (objVertices[0].y + objVertices[2].y) / 2;

  const nearbyText: string[] = [];

  for (const annotation of allAnnotations.slice(1)) {
    if (!annotation.boundingPoly?.vertices) continue;

    const textVertices = annotation.boundingPoly.vertices;
    const textCenterX = (textVertices[0].x + textVertices[2].x) / 2 / 1000;
    const textCenterY = (textVertices[0].y + textVertices[2].y) / 2 / 1000;

    const distance = Math.sqrt(
      Math.pow(objCenterX - textCenterX, 2) + Math.pow(objCenterY - textCenterY, 2)
    );

    if (distance < 0.15) {
      nearbyText.push(annotation.description || "");
    }
  }

  return nearbyText.length > 0 ? nearbyText.join(" ") : null;
}

function findBrandForItem(text: string | null, brands: string[]): string | null {
  if (!text || brands.length === 0) return null;

  const lowerText = text.toLowerCase();
  for (const brand of brands) {
    if (lowerText.includes(brand.toLowerCase())) {
      return brand;
    }
  }

  const brandPatterns = [/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g];
  for (const pattern of brandPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      return matches[0];
    }
  }

  return null;
}

function categorizeItem(itemName: string, labels: any[]): string | null {
  const categoryMap: { [key: string]: string } = {
    bottle: "Beverage", can: "Beverage", box: "Packaged Good",
    package: "Packaged Good", jar: "Condiment", container: "Container",
    food: "Food", drink: "Beverage", snack: "Snack", cereal: "Breakfast",
    bread: "Bakery", fruit: "Produce", vegetable: "Produce",
    meat: "Protein", dairy: "Dairy", frozen: "Frozen Food",
  };

  const itemLower = itemName.toLowerCase();
  for (const [key, category] of Object.entries(categoryMap)) {
    if (itemLower.includes(key)) return category;
  }

  for (const label of labels) {
    const labelDesc = (label.description || "").toLowerCase();
    for (const [key, category] of Object.entries(categoryMap)) {
      if (labelDesc.includes(key)) return category;
    }
  }

  return null;
}

function capitalizeWords(str: string): string {
  return str.split(" ").map((word) => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(" ");
}
