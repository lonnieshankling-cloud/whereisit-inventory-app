import { api, APIError } from "encore.dev/api";

interface LookupBarcodeRequest {
  upc: string;
}

interface LookupBarcodeResponse {
  name: string;
  description?: string;
  brand?: string;
  color?: string;
  size?: string;
}

export const lookupBarcode = api<LookupBarcodeRequest, LookupBarcodeResponse>(
  { expose: true, method: "GET", path: "/items/barcode/:upc", auth: true },
  async (req) => {
    const { upc } = req;

    const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`);
    
    if (!response.ok) {
      throw APIError.internal("Barcode API request failed");
    }
    
    const data = await response.json() as {
      items?: Array<{
        title: string;
        description?: string;
        brand?: string;
        color?: string;
        size?: string;
      }>;
    };

    if (!data.items || data.items.length === 0) {
      throw APIError.notFound("Item not found for that barcode.");
    }

    const item = data.items[0];

    return {
      name: item.title,
      description: item.description,
      brand: item.brand,
      color: item.color,
      size: item.size,
    };
  }
);
