// Mock API server for debugging frontend without Docker/DB
// Runs on http://localhost:4000 to match Encore backend

const PORT = 4000;

// Sample data matching backend schema
const locations = [
  { id: 1, name: "Kitchen", itemCount: 15 },
  { id: 2, name: "Living Room", itemCount: 8 },
  { id: 3, name: "Garage", itemCount: 22 },
  { id: 4, name: "Bedroom", itemCount: 12 },
];

const containers = [
  { id: 1, locationId: 1, name: "Pantry Shelf A", photoUrl: null },
  { id: 2, locationId: 1, name: "Fridge Top Shelf", photoUrl: null },
  { id: 3, locationId: 2, name: "TV Stand", photoUrl: null },
  { id: 4, locationId: 3, name: "Tool Box", photoUrl: null },
  { id: 5, locationId: 3, name: "Storage Bin 1", photoUrl: null },
];

const items = [
  {
    id: 1,
    name: "Olive Oil",
    description: "Extra virgin olive oil",
    category: "Pantry",
    quantity: 2,
    locationId: 1,
    locationName: "Kitchen",
    containerId: 1,
    containerName: "Pantry Shelf A",
    photoUrl: null,
    thumbnailUrl: null,
    isFavorite: true,
    expirationDate: null,
    tags: ["cooking", "oil"],
    consumption: { rate: 1, unit: "bottle", period: "month" },
    placed: true,
    createdAt: new Date("2025-11-20T10:00:00Z"),
  },
  {
    id: 2,
    name: "Milk",
    description: "Whole milk 1 gallon",
    category: "Dairy",
    quantity: 1,
    locationId: 1,
    locationName: "Kitchen",
    containerId: 2,
    containerName: "Fridge Top Shelf",
    photoUrl: null,
    thumbnailUrl: null,
    isFavorite: false,
    expirationDate: new Date("2025-11-30T00:00:00Z"),
    tags: ["dairy", "perishable"],
    consumption: { rate: 1, unit: "gallon", period: "week" },
    placed: true,
    createdAt: new Date("2025-11-22T08:30:00Z"),
  },
  {
    id: 3,
    name: "Rice",
    description: "Basmati rice 5 lb bag",
    category: "Pantry",
    quantity: 3,
    locationId: 1,
    locationName: "Kitchen",
    containerId: 1,
    containerName: "Pantry Shelf A",
    photoUrl: null,
    thumbnailUrl: null,
    isFavorite: false,
    expirationDate: null,
    tags: ["grains", "staple"],
    consumption: { rate: 1, unit: "bag", period: "month" },
    placed: false,
    createdAt: new Date("2025-11-15T14:20:00Z"),
  },
  {
    id: 4,
    name: "Screwdriver Set",
    description: "Phillips and flathead screwdrivers",
    category: "Tools",
    quantity: 1,
    locationId: 3,
    locationName: "Garage",
    containerId: 4,
    containerName: "Tool Box",
    photoUrl: null,
    thumbnailUrl: null,
    isFavorite: true,
    expirationDate: null,
    tags: ["tools", "hardware"],
    consumption: null,
    placed: true,
    createdAt: new Date("2025-11-10T12:00:00Z"),
  },
  {
    id: 5,
    name: "Paint Brushes",
    description: "Set of 10 paint brushes",
    category: "Art Supplies",
    quantity: 2,
    locationId: 3,
    locationName: "Garage",
    containerId: 5,
    containerName: "Storage Bin 1",
    photoUrl: null,
    thumbnailUrl: null,
    isFavorite: false,
    expirationDate: null,
    tags: ["art", "painting"],
    consumption: null,
    placed: true,
    createdAt: new Date("2025-11-18T09:45:00Z"),
  },
  {
    id: 6,
    name: "Coffee Beans",
    description: "Ethiopian coffee beans",
    category: "Pantry",
    quantity: 1,
    locationId: 1,
    locationName: "Kitchen",
    containerId: 1,
    containerName: "Pantry Shelf A",
    photoUrl: null,
    thumbnailUrl: null,
    isFavorite: true,
    expirationDate: new Date("2025-12-31T00:00:00Z"),
    tags: ["coffee", "beverage"],
    consumption: { rate: 1, unit: "bag", period: "week" },
    placed: true,
    createdAt: new Date("2025-11-23T16:10:00Z"),
  },
];

const shopping = [
  { id: 1, itemName: "Eggs", quantity: 2, isPurchased: false },
  { id: 2, itemName: "Bread", quantity: 1, isPurchased: false },
];

// Helper to respond with JSON
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "http://localhost:5173",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// Simple router
const server = Bun.serve({
  port: PORT,
  async fetch(req: Request) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    console.log(`${method} ${path}`);

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "http://localhost:5173",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // GET /locations
    if (path === "/locations" && method === "GET") {
      return jsonResponse({ locations });
    }

    // GET /items/location/:locationId
    const locationMatch = path.match(/^\/items\/location\/(\d+)$/);
    if (locationMatch && method === "GET") {
      const locationId = parseInt(locationMatch[1]);
      const locationItems = items.filter((i) => i.locationId === locationId);
      return jsonResponse({ items: locationItems });
    }

    // GET /items/stats/:locationId/categories
    const statsMatch = path.match(/^\/items\/stats\/(\d+)\/categories$/);
    if (statsMatch && method === "GET") {
      const locationId = parseInt(statsMatch[1]);
      const locationItems = items.filter((i) => i.locationId === locationId);
      const categoryMap = new Map<string, number>();
      locationItems.forEach((item) => {
        categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1);
      });
      const stats = Array.from(categoryMap.entries()).map(([category, count]) => ({
        category,
        count,
      }));
      return jsonResponse({ stats });
    }

    // GET /locations/:locationId/containers
    const containerMatch = path.match(/^\/locations\/(\d+)\/containers$/);
    if (containerMatch && method === "GET") {
      const locationId = parseInt(containerMatch[1]);
      const locationContainers = containers.filter((c) => c.locationId === locationId);
      return jsonResponse({ containers: locationContainers });
    }

    // GET /containers
    if (path === "/containers" && method === "GET") {
      return jsonResponse({ containers });
    }

    // GET /items/:id
    const itemMatch = path.match(/^\/items\/(\d+)$/);
    if (itemMatch && method === "GET") {
      const itemId = parseInt(itemMatch[1]);
      const item = items.find((i) => i.id === itemId);
      if (item) {
        return jsonResponse({ item });
      }
      return jsonResponse({ error: "Item not found" }, 404);
    }

    // POST /items/:id/favorite
    const favoriteMatch = path.match(/^\/items\/(\d+)\/favorite$/);
    if (favoriteMatch && method === "POST") {
      const itemId = parseInt(favoriteMatch[1]);
      const item = items.find((i) => i.id === itemId);
      if (item) {
        item.isFavorite = !item.isFavorite;
        return jsonResponse({ item });
      }
      return jsonResponse({ error: "Item not found" }, 404);
    }

    // POST /items/:id/confirm
    const confirmMatch = path.match(/^\/items\/(\d+)\/confirm$/);
    if (confirmMatch && method === "POST") {
      const itemId = parseInt(confirmMatch[1]);
      const item = items.find((i) => i.id === itemId);
      if (item) {
        item.placed = true;
        return jsonResponse({ item });
      }
      return jsonResponse({ error: "Item not found" }, 404);
    }

    // DELETE /items/:id
    const deleteMatch = path.match(/^\/items\/(\d+)$/);
    if (deleteMatch && method === "DELETE") {
      const itemId = parseInt(deleteMatch[1]);
      const index = items.findIndex((i) => i.id === itemId);
      if (index >= 0) {
        items.splice(index, 1);
        return new Response(null, { status: 204 });
      }
      return jsonResponse({ error: "Item not found" }, 404);
    }

    // POST /items/bulk-delete
    if (path === "/items/bulk-delete" && method === "POST") {
      const body = await req.json();
      const { itemIds } = body as { itemIds: number[] };
      itemIds.forEach((id) => {
        const index = items.findIndex((i) => i.id === id);
        if (index >= 0) items.splice(index, 1);
      });
      return new Response(null, { status: 204 });
    }

    // POST /items/bulk-confirm-location
    if (path === "/items/bulk-confirm-location" && method === "POST") {
      const body = await req.json();
      const { itemIds } = body as { itemIds: number[] };
      itemIds.forEach((id) => {
        const item = items.find((i) => i.id === id);
        if (item) item.placed = true;
      });
      return jsonResponse({ success: true });
    }

    // GET /shopping
    if (path === "/shopping" && method === "GET") {
      return jsonResponse({ items: shopping });
    }

    // POST /shopping
    if (path === "/shopping" && method === "POST") {
      const body = await req.json();
      const newItem = {
        id: shopping.length + 1,
        itemName: body.itemName,
        quantity: body.quantity || 1,
        isPurchased: false,
      };
      shopping.push(newItem);
      return jsonResponse(newItem, 201);
    }

    // POST /image/upload-url - Generate mock upload URL for images
    if (path === "/image/upload-url" && method === "POST") {
      const body = await req.json();
      const { filename } = body;
      // Return mock URLs - in real implementation, this would be S3 presigned URLs
      return jsonResponse({
        uploadUrl: `http://localhost:4000/mock-upload/${filename}`,
        fileUrl: `http://localhost:4000/mock-images/${filename}`,
      });
    }

    // PUT /mock-upload/:filename - Mock file upload endpoint
    const uploadMatch = path.match(/^\/mock-upload\/(.+)$/);
    if (uploadMatch && method === "PUT") {
      // Just accept the file upload without storing it
      return new Response(null, { 
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "http://localhost:5173",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Methods": "PUT, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // POST /items/analyze-shelf - Mock shelf analysis
    if (path === "/items/analyze-shelf" && method === "POST") {
      const body = await req.json();
      const { imageUrls } = body;
      
      // Return mock analyzed items
      const mockAnalyzedItems = [
        {
          name: "Cereal Box",
          description: "Breakfast cereal",
          brand: "Generic Brand",
          color: null,
          size: "Family Size",
          quantity: 1,
          expirationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
          category: "Pantry",
          notes: "Detected from image analysis",
          containerId: null,
        },
        {
          name: "Pasta",
          description: "Dry pasta",
          brand: null,
          color: null,
          size: "1 lb",
          quantity: 2,
          expirationDate: null,
          category: "Pantry",
          notes: "Detected from image analysis",
          containerId: null,
        },
        {
          name: "Canned Tomatoes",
          description: "Canned diced tomatoes",
          brand: null,
          color: null,
          size: "14 oz",
          quantity: 3,
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
          category: "Pantry",
          notes: "Detected from image analysis",
          containerId: null,
        },
      ];

      return jsonResponse({ items: mockAnalyzedItems });
    }

    // GET /items/placed/:status (e.g., not_placed)
    const placedMatch = path.match(/^\/items\/placed\/(.+)$/);
    if (placedMatch && method === "GET") {
      const status = placedMatch[1];
      const limit = parseInt(url.searchParams.get("limit") || "100");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      
      let filteredItems = status === "not_placed" 
        ? items.filter(i => !i.placed)
        : items.filter(i => i.placed);
      
      const total = filteredItems.length;
      const paginatedItems = filteredItems.slice(offset, offset + limit);
      
      return jsonResponse({ 
        items: paginatedItems, 
        total,
        limit,
        offset 
      });
    }

    // GET /items/recent
    if (path === "/items/recent" && method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "100");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      
      const sortedItems = [...items].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      const total = sortedItems.length;
      const paginatedItems = sortedItems.slice(offset, offset + limit);
      
      return jsonResponse({ 
        items: paginatedItems, 
        total,
        limit,
        offset 
      });
    }

    // GET /items/expiring
    if (path === "/items/expiring" && method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "100");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const expiringItems = items.filter(i => 
        i.expirationDate && 
        new Date(i.expirationDate) <= thirtyDaysFromNow &&
        new Date(i.expirationDate) >= now
      );
      
      const total = expiringItems.length;
      const paginatedItems = expiringItems.slice(offset, offset + limit);
      
      return jsonResponse({ 
        items: paginatedItems, 
        total,
        limit,
        offset 
      });
    }

    // GET /items/low-stock
    if (path === "/items/low-stock" && method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "100");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      
      const lowStockItems = items.filter(i => i.quantity <= 2);
      
      const total = lowStockItems.length;
      const paginatedItems = lowStockItems.slice(offset, offset + limit);
      
      return jsonResponse({ 
        items: paginatedItems, 
        total,
        limit,
        offset 
      });
    }

    // GET /items/favorites
    if (path === "/items/favorites" && method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "100");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      
      const favoriteItems = items.filter(i => i.isFavorite);
      
      const total = favoriteItems.length;
      const paginatedItems = favoriteItems.slice(offset, offset + limit);
      
      return jsonResponse({ 
        items: paginatedItems, 
        total,
        limit,
        offset 
      });
    }

    // GET /items/needs-confirmation
    if (path === "/items/needs-confirmation" && method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "100");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      
      const needsConfirmItems = items.filter(i => !i.placed);
      
      const total = needsConfirmItems.length;
      const paginatedItems = needsConfirmItems.slice(offset, offset + limit);
      
      return jsonResponse({ 
        items: paginatedItems, 
        total,
        limit,
        offset 
      });
    }

    // GET /items/search
    if (path === "/items/search" && method === "GET") {
      const query = url.searchParams.get("query") || "";
      const limit = parseInt(url.searchParams.get("limit") || "100");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      
      let searchResults = items;
      
      if (query.trim()) {
        const lowerQuery = query.toLowerCase();
        searchResults = items.filter(i => 
          i.name.toLowerCase().includes(lowerQuery) ||
          (i.description && i.description.toLowerCase().includes(lowerQuery)) ||
          i.category.toLowerCase().includes(lowerQuery) ||
          (i.tags && i.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
        );
      }
      
      const total = searchResults.length;
      const paginatedItems = searchResults.slice(offset, offset + limit);
      
      return jsonResponse({ 
        items: paginatedItems, 
        total,
        limit,
        offset 
      });
    }

    // Catch-all 404
    return jsonResponse({ error: "Not found", path }, 404);
  },
});

console.log(`🚀 Mock API server running at http://localhost:${PORT}`);
console.log(`📍 Serving ${locations.length} locations, ${items.length} items, ${containers.length} containers`);
console.log(`🔍 Test endpoints:`);
console.log(`   GET  http://localhost:${PORT}/locations`);
console.log(`   GET  http://localhost:${PORT}/items/location/1`);
console.log(`   GET  http://localhost:${PORT}/containers`);
