import { api, APIError } from "encore.dev/api";
import db from "../db";

interface LookupBarcodeRequest {
  upc: string;
}

interface LookupBarcodeResponse {
  name: string;
  description?: string;
  brand?: string;
  color?: string;
  size?: string;
  category?: string;
  imageUrl?: string;
  source?: string; // 'cache', 'off', 'upcitemdb'
  // New enriched fields
  features?: string[]; // e.g., Organic, Gluten-free, Nutri-Score, Packaging
  ingredients?: string; // ingredient list for food & cosmetics
}

export const lookupBarcode = api<LookupBarcodeRequest, LookupBarcodeResponse>(
  { expose: true, method: "GET", path: "/items/barcode/:upc", auth: true },
  async (req) => {
    const { upc } = req;
    // 0. Handle ISBN (EAN-13 starting with 978/979)
    try {
      if (/^(978|979)\d{10}$/.test(upc)) {
        const isbn = upc;
        console.log(`[Barcode] Detected ISBN/EAN-13: ${isbn} — querying Open Library`);

        // Open Library book details
        const olResp = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, {
          headers: { 'User-Agent': 'WhereIsItInventory/1.0' },
        });

        if (olResp.ok) {
          const book = await olResp.json();
          const title: string = book.title || 'Unknown Book';
          let authors: string | undefined = undefined;
          try {
            if (Array.isArray(book.authors) && book.authors.length > 0) {
              const keys: string[] = book.authors.map((a: any) => a.key).filter(Boolean);
              const authorNames: string[] = [];
              for (const key of keys) {
                const aResp = await fetch(`https://openlibrary.org${key}.json`, {
                  headers: { 'User-Agent': 'WhereIsItInventory/1.0' },
                });
                if (aResp.ok) {
                  const a = await aResp.json();
                  if (a && a.name) authorNames.push(a.name);
                }
              }
              if (authorNames.length > 0) {
                authors = authorNames.join(', ');
              }
            }
          } catch (e) {
            console.warn('[Barcode] Open Library author lookup failed:', e);
          }

          // Cover image via covers service
          let imageUrl: string | undefined = undefined;
          if (book.covers && Array.isArray(book.covers) && book.covers.length > 0) {
            const coverId = book.covers[0];
            imageUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
          } else {
            imageUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
          }

          const product: LookupBarcodeResponse = {
            name: title,
            brand: authors,
            category: 'Book',
            imageUrl,
            description: (book.subtitle ? `${book.subtitle}` : undefined),
            source: 'openlibrary',
            // Books: provide helpful features when available
            features: [
              ...(book.publish_date ? [`Published: ${book.publish_date}`] : []),
              ...(book.number_of_pages ? [`Pages: ${book.number_of_pages}`] : []),
              ...(Array.isArray(book.subjects) ? [`Subjects: ${book.subjects.slice(0,5).join(', ')}`] : []),
            ],
          };

          // Cache the result
          try {
            await db.query`
              INSERT INTO barcode_cache (
                upc, product_name, brand, category, image_url, size, source, raw_data, cached_at
              ) VALUES (
                ${isbn},
                ${product.name},
                ${product.brand || null},
                ${product.category || null},
                ${product.imageUrl || null},
                ${null},
                'openlibrary',
                ${JSON.stringify(book)},
                NOW()
              )
              ON CONFLICT (upc) DO UPDATE SET
                product_name = EXCLUDED.product_name,
                brand = EXCLUDED.brand,
                category = EXCLUDED.category,
                image_url = EXCLUDED.image_url,
                source = EXCLUDED.source,
                raw_data = EXCLUDED.raw_data,
                cached_at = NOW()
            `;
          } catch (cacheErr) {
            console.warn('[Barcode] Failed to cache Open Library result:', cacheErr);
          }

          console.log(`[Barcode] Found in Open Library: ${product.name}`);
          return product;
        }

        // Google Books fallback when Open Library misses
        try {
          console.log(`[Barcode] Open Library miss; trying Google Books for ISBN: ${isbn}`);
          const gbResp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
          if (gbResp.ok) {
            const gb = await gbResp.json();
            if (Array.isArray(gb.items) && gb.items.length > 0) {
              const info = gb.items[0].volumeInfo || {};
              const product: LookupBarcodeResponse = {
                name: info.title || 'Unknown Book',
                brand: Array.isArray(info.authors) ? info.authors.join(', ') : undefined,
                category: Array.isArray(info.categories) ? info.categories[0] : 'Book',
                imageUrl: info.imageLinks?.thumbnail || info.imageLinks?.small || info.imageLinks?.medium || undefined,
                description: info.subtitle || info.description || undefined,
                features: [
                  ...(info.publishedDate ? [`Published: ${info.publishedDate}`] : []),
                  ...(info.pageCount ? [`Pages: ${info.pageCount}`] : []),
                ],
                source: 'googlebooks',
              };

              // Cache the result
              try {
                await db.query`
                  INSERT INTO barcode_cache (
                    upc, product_name, brand, category, image_url, size, source, raw_data, cached_at
                  ) VALUES (
                    ${isbn},
                    ${product.name},
                    ${product.brand || null},
                    ${product.category || null},
                    ${product.imageUrl || null},
                    ${null},
                    'googlebooks',
                    ${JSON.stringify(info)},
                    NOW()
                  )
                  ON CONFLICT (upc) DO UPDATE SET
                    product_name = EXCLUDED.product_name,
                    brand = EXCLUDED.brand,
                    category = EXCLUDED.category,
                    image_url = EXCLUDED.image_url,
                    source = EXCLUDED.source,
                    raw_data = EXCLUDED.raw_data,
                    cached_at = NOW()
                `;
              } catch (cacheErr) {
                console.warn('[Barcode] Failed to cache Google Books result:', cacheErr);
              }

              console.log(`[Barcode] Found in Google Books: ${product.name}`);
              return product;
            }
          }
        } catch (gbErr) {
          console.warn('[Barcode] Google Books fallback failed:', gbErr);
        }
      }
    } catch (error) {
      console.warn('[Barcode] ISBN lookup failed:', error);
    }

    // 1. Check cache first (30-day TTL)
    try {
      const cached = await db.queryRow<{
        productName: string;
        brand?: string;
        category?: string;
        imageUrl?: string;
        size?: string;
      }>`
        SELECT 
          product_name as "productName",
          brand,
          category,
          image_url as "imageUrl",
          size
        FROM barcode_cache
        WHERE upc = ${upc}
        AND cached_at > NOW() - INTERVAL '30 days'
      `;

      if (cached) {
        console.log(`[Barcode] Cache hit: ${upc}`);
        return {
          name: cached.productName,
          brand: cached.brand || undefined,
          category: cached.category || undefined,
          imageUrl: cached.imageUrl || undefined,
          size: cached.size || undefined,
          source: 'cache',
        };
      }
    } catch (error) {
      console.warn('[Barcode] Cache lookup failed:', error);
    }

    // 2. Try Open Food Facts (free, no API key needed)
    try {
      console.log(`[Barcode] Fetching from Open Food Facts: ${upc}`);
      const offResponse = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${upc}.json`,
        { headers: { 'User-Agent': 'WhereIsItInventory/1.0' } }
      );

      if (offResponse.ok) {
        const offData = await offResponse.json();
        
        if (offData.status === 1 && offData.product) {
          const labels: string[] = (offData.product.labels || '')
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);

          const features: string[] = [
            ...(labels.length ? labels : []),
            ...(offData.product.nutriscore_grade ? [`Nutri-Score: ${String(offData.product.nutriscore_grade).toUpperCase()}`] : []),
            ...(offData.product.ecoscore_grade ? [`Eco-Score: ${String(offData.product.ecoscore_grade).toUpperCase()}`] : []),
            ...(offData.product.packaging ? [`Packaging: ${offData.product.packaging}`] : []),
          ];

          const product: LookupBarcodeResponse = {
            name: offData.product.product_name || offData.product.product_name_en || 'Unknown Product',
            brand: offData.product.brands || undefined,
            category: offData.product.categories?.split(',')[0]?.trim() || undefined,
            imageUrl: offData.product.image_url || offData.product.image_front_url || undefined,
            size: offData.product.quantity || undefined,
            description: offData.product.generic_name || undefined,
            source: 'off',
            features: features.length ? features : undefined,
            ingredients: offData.product.ingredients_text || offData.product.ingredients_text_en || undefined,
          };

          // Cache the result
          await db.query`
            INSERT INTO barcode_cache (
              upc, product_name, brand, category, image_url, size, source, raw_data, cached_at
            ) VALUES (
              ${upc},
              ${product.name},
              ${product.brand || null},
              ${product.category || null},
              ${product.imageUrl || null},
              ${product.size || null},
              'off',
              ${JSON.stringify(offData.product)},
              NOW()
            )
            ON CONFLICT (upc) DO UPDATE SET
              product_name = EXCLUDED.product_name,
              brand = EXCLUDED.brand,
              category = EXCLUDED.category,
              image_url = EXCLUDED.image_url,
              size = EXCLUDED.size,
              source = EXCLUDED.source,
              raw_data = EXCLUDED.raw_data,
              cached_at = NOW()
          `;

          console.log(`[Barcode] Found in OFF: ${product.name}`);
          return product;
        }
      }
    } catch (error) {
      console.warn('[Barcode] Open Food Facts failed:', error);
    }

    // 3. Fallback to UPC Item DB (original implementation)
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
    // Attempt to derive simple features from description heuristics
    let derivedFeatures: string[] | undefined = undefined;
    if (item.description) {
      const parts = item.description
        .split(/[;•\-|\n]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .slice(0, 5);
      if (parts.length) derivedFeatures = parts;
    }

    const result: LookupBarcodeResponse = {
      name: item.title,
      description: item.description,
      brand: item.brand,
      color: item.color,
      size: item.size,
      source: 'upcitemdb',
      features: derivedFeatures,
    };

    // Cache UPC Item DB result
    try {
      await db.query`
        INSERT INTO barcode_cache (
          upc, product_name, brand, category, image_url, size, source, raw_data, cached_at
        ) VALUES (
          ${upc},
          ${result.name},
          ${result.brand || null},
          ${null},
          ${null},
          ${result.size || null},
          'upcitemdb',
          ${JSON.stringify(item)},
          NOW()
        )
        ON CONFLICT (upc) DO NOTHING
      `;
    } catch (error) {
      console.warn('[Barcode] Failed to cache UPC Item DB result:', error);
    }

    return result;
  }
);
