import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { ensureUserHasHousehold } from "../household/utils";

interface CreateItemRequest {
  name: string;
  locationId?: number;
  containerId?: number | null;
  description?: string;
  photoUrl?: string;
  thumbnailUrl?: string;
  brand?: string | null;
  color?: string | null;
  size?: string | null;
  quantity?: number | null;
  expirationDate?: string | null;
  category?: string | null;
  notes?: string | null;
  tags?: string[];
  // Phase 1: Barcode & Analysis fields
  barcodeUpc?: string | null;
  detectedLanguage?: string | null;
  confidenceScore?: number | null;
  analysisMetadata?: any | null;
  estimatedDimensions?: string | null;
  expiryAlertDays?: number | null;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
}

export interface Item {
  id: number;
  userId: string;
  locationId?: number;
  containerId?: number;
  locationName?: string;
  containerName?: string;
  name: string;
  description?: string;
  photoUrl?: string;
  thumbnailUrl?: string;
  brand?: string;
  color?: string;
  size?: string;
  quantity: number;
  consumption: number;
  expirationDate?: Date;
  category?: string;
  notes?: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: Date;
  lastConfirmedAt?: Date;
  // Phase 1: Barcode & Analysis fields
  barcodeUpc?: string;
  detectedLanguage?: string;
  confidenceScore?: number;
  analysisMetadata?: any;
  estimatedDimensions?: string;
  expiryAlertDays?: number;
  purchaseDate?: Date;
  purchasePrice?: number;
}

// Creates a new item in the inventory.
export const create = api<CreateItemRequest, Item>(
  { expose: true, method: "POST", path: "/items", auth: true },
  async (req) => {
    if (!req.name || req.name.trim() === "") {
      throw APIError.invalidArgument("Item name cannot be empty");
    }

    const auth = getAuthData()!;
    const userId = auth.userID;

    const householdId = await ensureUserHasHousehold(userId);

    const item = await db.queryRow<Item>`
      INSERT INTO items (
        user_id, household_id, location_id, container_id, name, description, photo_url,
        thumbnail_url, brand, color, size, quantity, expiration_date, category, notes, tags,
        barcode_upc, detected_language, confidence_score, analysis_metadata,
        estimated_dimensions, expiry_alert_days, purchase_date, purchase_price
      )
      VALUES (
        ${userId},
        ${householdId},
        ${req.locationId ?? null},
        ${req.containerId ?? null},
        ${req.name},
        ${req.description ?? null},
        ${req.photoUrl ?? null},
        ${req.thumbnailUrl ?? null},
        ${req.brand ?? null},
        ${req.color ?? null},
        ${req.size ?? null},
        ${req.quantity ?? 1},
        ${req.expirationDate ?? null},
        ${req.category ?? null},
        ${req.notes ?? null},
        ${req.tags ?? []},
        ${req.barcodeUpc ?? null},
        ${req.detectedLanguage ?? null},
        ${req.confidenceScore ?? null},
        ${req.analysisMetadata ? JSON.stringify(req.analysisMetadata) : null},
        ${req.estimatedDimensions ?? null},
        ${req.expiryAlertDays ?? 30},
        ${req.purchaseDate ?? null},
        ${req.purchasePrice ?? null}
      )
      RETURNING
        id,
        user_id as "userId",
        location_id as "locationId",
        container_id as "containerId",
        name,
        description,
        photo_url as "photoUrl",
        thumbnail_url as "thumbnailUrl",
        brand,
        color,
        size,
        quantity,
        consumption,
        expiration_date as "expirationDate",
        category,
        notes,
        tags,
        is_favorite as "isFavorite",
        created_at as "createdAt",
        last_confirmed_at as "lastConfirmedAt",
        barcode_upc as "barcodeUpc",
        detected_language as "detectedLanguage",
        confidence_score as "confidenceScore",
        analysis_metadata as "analysisMetadata",
        estimated_dimensions as "estimatedDimensions",
        expiry_alert_days as "expiryAlertDays",
        purchase_date as "purchaseDate",
        purchase_price as "purchasePrice"
    `;

    if (!item) {
      throw new Error("Failed to create item");
    }

    return item;
  }
);
