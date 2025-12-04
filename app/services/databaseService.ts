import * as SQLite from 'expo-sqlite';

export interface LocalItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  location_id?: string;
  location_name?: string;
  container_id?: string;
  container_name?: string;
  photo_url?: string;
  local_photo_uri?: string;
  quantity?: number;
  min_quantity?: number;
  barcode?: string;
  purchase_date?: string;
  purchase_price?: number;
  purchase_store?: string;
  warranty_months?: number;
  synced: number; // 0 = not synced, 1 = synced
  created_at: number;
  updated_at: number;
}

export interface LocalContainer {
  id: string;
  name: string;
  location_id?: string;
  photo_url?: string;
  local_photo_uri?: string;
  synced: number;
  created_at: number;
  updated_at: number;
}

export interface LocalReceipt {
  id: string;
  item_id: string;
  photo_url?: string;
  local_photo_uri?: string;
  synced: number;
  created_at: number;
}

export interface LocalShoppingItem {
  id: string;
  item_name: string;
  quantity: number;
  is_purchased: number; // 0 = not purchased, 1 = purchased
  synced: number;
  created_at: number;
  updated_at: number;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize() {
    if (this.db) {
      console.log('Database already initialized');
      return;
    }
    try {
      console.log('Opening database...');
      this.db = await SQLite.openDatabaseAsync('whereisit.db');
      console.log('Database opened, creating tables...');
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables() {
    if (!this.db) throw new Error('Database not initialized');

    // Items table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        location_id TEXT,
        container_id TEXT,
        photo_url TEXT,
        local_photo_uri TEXT,
        quantity INTEGER DEFAULT 1,
        barcode TEXT,
        purchase_date TEXT,
        purchase_price REAL,
        purchase_store TEXT,
        warranty_months INTEGER,
        synced INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Add category column if it doesn't exist (migration)
    try {
      await this.db.execAsync('ALTER TABLE items ADD COLUMN category TEXT;');
    } catch (error) {
      // Column already exists, ignore error
    }

    // Add location_id column if it doesn't exist (migration)
    try {
      await this.db.execAsync('ALTER TABLE items ADD COLUMN location_id TEXT;');
    } catch (error) {
      // Column already exists, ignore error
    }

    // Add min_quantity column if it doesn't exist (migration)
    try {
      await this.db.execAsync('ALTER TABLE items ADD COLUMN min_quantity INTEGER;');
    } catch (error) {
      // Column already exists, ignore error
    }

    // Add location_name column if it doesn't exist (migration)
    try {
      await this.db.execAsync('ALTER TABLE items ADD COLUMN location_name TEXT;');
    } catch (error) {
      // Column already exists, ignore error
    }

    // Add container_name column if it doesn't exist (migration)
    try {
      await this.db.execAsync('ALTER TABLE items ADD COLUMN container_name TEXT;');
    } catch (error) {
      // Column already exists, ignore error
    }

    // Locations table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Containers table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS containers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location_id TEXT,
        photo_url TEXT,
        local_photo_uri TEXT,
        synced INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Receipts table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        photo_url TEXT,
        local_photo_uri TEXT,
        synced INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE
      );
    `);

    // Shopping list table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS shopping_list (
        id TEXT PRIMARY KEY,
        item_name TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        is_purchased INTEGER DEFAULT 0,
        synced INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create indices for performance optimization
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_items_container_id ON items(container_id);
      CREATE INDEX IF NOT EXISTS idx_items_location_id ON items(location_id);
      CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode);
      CREATE INDEX IF NOT EXISTS idx_items_synced ON items(synced);
      CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
      CREATE INDEX IF NOT EXISTS idx_items_name ON items(name COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_items_quantity ON items(quantity);
      CREATE INDEX IF NOT EXISTS idx_receipts_item_id ON receipts(item_id);
      CREATE INDEX IF NOT EXISTS idx_shopping_is_purchased ON shopping_list(is_purchased);
      CREATE INDEX IF NOT EXISTS idx_shopping_updated_at ON shopping_list(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_containers_name ON containers(name COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name COLLATE NOCASE);
    `);

    // Migrate existing locations from items table to locations table
    await this.migrateLocations();
  }

  private async migrateLocations(): Promise<void> {
    if (!this.db) return;

    try {
      console.log('🔄 Starting location migration...');
      
      // Get distinct locations from items table
      const existingLocations = await this.db.getAllAsync<{ location_id: string; location_name: string }>(`
        SELECT DISTINCT location_id, location_name 
        FROM items 
        WHERE location_id IS NOT NULL AND location_name IS NOT NULL
      `);

      console.log(`📍 Found ${existingLocations.length} locations in items table:`, existingLocations);

      // Insert each location into locations table if it doesn't exist
      for (const loc of existingLocations) {
        const now = Date.now();
        await this.db.runAsync(
          'INSERT OR IGNORE INTO locations (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
          [loc.location_id, loc.location_name, now, now]
        );
        console.log(`✅ Migrated location: ${loc.location_name} (${loc.location_id})`);
      }

      console.log(`✅ Migration complete: ${existingLocations.length} locations migrated`);
    } catch (error) {
      console.error('❌ Error migrating locations:', error);
      // Don't throw - this is a best-effort migration
    }
  }

  // ==================== ITEMS ====================

  async createItem(item: Omit<LocalItem, 'created_at' | 'updated_at'>): Promise<void> {
    if (!this.db) {
      console.error('Database not initialized in createItem');
      throw new Error('Database not initialized');
    }

    const now = Date.now();
    console.log('Attempting to insert item:', item.id, item.name);
    
    try {
      await this.db.runAsync(
        `INSERT INTO items (
          id, name, description, category, location_id, container_id, photo_url, local_photo_uri,
          quantity, barcode, purchase_date, purchase_price, purchase_store,
          warranty_months, synced, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.name,
          item.description || null,
          item.category || null,
          item.location_id || null,
          item.container_id || null,
          item.photo_url || null,
          item.local_photo_uri || null,
          item.quantity || 1,
          item.barcode || null,
          item.purchase_date || null,
          item.purchase_price || null,
          item.purchase_store || null,
          item.warranty_months || null,
          item.synced,
          now,
          now,
        ]
      );
      console.log('Item inserted successfully');
    } catch (error) {
      console.error('Error inserting item:', error);
      throw error;
    }
  }

  async getItem(id: string): Promise<LocalItem | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<LocalItem>(
      'SELECT * FROM items WHERE id = ?',
      [id]
    );
    return result || null;
  }

  async getAllItems(limit?: number, offset?: number): Promise<LocalItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = limit !== undefined
      ? 'SELECT * FROM items ORDER BY updated_at DESC LIMIT ? OFFSET ?'
      : 'SELECT * FROM items ORDER BY updated_at DESC';
    
    const params = limit !== undefined ? [limit, offset || 0] : [];
    
    return await this.db.getAllAsync<LocalItem>(query, params);
  }

  async getItemsByLocation(locationId: string, limit?: number, offset?: number): Promise<LocalItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = limit !== undefined
      ? 'SELECT * FROM items WHERE location_id = ? ORDER BY name ASC LIMIT ? OFFSET ?'
      : 'SELECT * FROM items WHERE location_id = ? ORDER BY name ASC';
    
    const params = limit !== undefined ? [locationId, limit, offset || 0] : [locationId];
    
    return await this.db.getAllAsync<LocalItem>(query, params);
  }

  async getItemsByContainer(containerId: string, limit?: number, offset?: number): Promise<LocalItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = limit !== undefined
      ? 'SELECT * FROM items WHERE container_id = ? ORDER BY name ASC LIMIT ? OFFSET ?'
      : 'SELECT * FROM items WHERE container_id = ? ORDER BY name ASC';
    
    const params = limit !== undefined ? [containerId, limit, offset || 0] : [containerId];
    
    return await this.db.getAllAsync<LocalItem>(query, params);
  }

  async searchItemsByBarcode(barcode: string): Promise<LocalItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAllAsync<LocalItem>(
      'SELECT * FROM items WHERE barcode = ?',
      [barcode]
    );
  }

  async updateItem(id: string, updates: Partial<LocalItem>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'created_at')
      .map(key => `${key} = ?`);
    
    const values = Object.entries(updates)
      .filter(([key]) => key !== 'id' && key !== 'created_at')
      .map(([_, value]) => value);

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    await this.db.runAsync(
      `UPDATE items SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteItem(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM items WHERE id = ?', [id]);
  }

  async getUnsyncedItems(): Promise<LocalItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAllAsync<LocalItem>(
      'SELECT * FROM items WHERE synced = 0'
    );
  }

  async markItemAsSynced(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'UPDATE items SET synced = 1, updated_at = ? WHERE id = ?',
      [Date.now(), id]
    );
  }

  // ==================== CONTAINERS ====================

  async createContainer(container: Omit<LocalContainer, 'created_at' | 'updated_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    await this.db.runAsync(
      `INSERT INTO containers (
        id, name, location_id, photo_url, local_photo_uri, synced, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        container.id,
        container.name,
        container.location_id || null,
        container.photo_url || null,
        container.local_photo_uri || null,
        container.synced,
        now,
        now,
      ]
    );
  }

  async getAllContainers(): Promise<LocalContainer[]> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAllAsync<LocalContainer>(
      'SELECT * FROM containers ORDER BY name ASC'
    );
  }

  async getAllLocations(): Promise<{ id: string; name: string }[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Get locations from locations table
      const locationsFromTable = await this.db.getAllAsync<{ id: string; name: string }>(
        'SELECT id, name FROM locations ORDER BY name ASC'
      );
      console.log('📍 Locations from table:', locationsFromTable.length, locationsFromTable);
      
      // Also get unique locations from items table (for backward compatibility)
      const locationsFromItems = await this.db.getAllAsync<{ id: string; name: string }>(
        'SELECT DISTINCT location_id as id, location_name as name FROM items WHERE location_id IS NOT NULL AND location_name IS NOT NULL'
      );
      console.log('📍 Locations from items:', locationsFromItems.length, locationsFromItems);
      
      // Merge and deduplicate
      const allLocations = [...locationsFromTable];
      for (const itemLoc of locationsFromItems) {
        if (!allLocations.some(loc => loc.id === itemLoc.id)) {
          allLocations.push(itemLoc);
        }
      }
      
      console.log('📍 Total merged locations:', allLocations.length);
      return allLocations.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('❌ Error in getAllLocations:', error);
      throw error;
    }
  }

  async createLocation(location: { id: string; name: string }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    console.log('💾 Inserting location into database:', location);
    const now = Date.now();
    await this.db.runAsync(
      'INSERT OR REPLACE INTO locations (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [location.id, location.name, now, now]
    );
    console.log('✅ Location inserted successfully');
  }

  async getContainer(id: string): Promise<LocalContainer | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<LocalContainer>(
      'SELECT * FROM containers WHERE id = ?',
      [id]
    );
    return result || null;
  }

  async updateContainer(id: string, updates: Partial<LocalContainer>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'created_at')
      .map(key => `${key} = ?`);
    
    const values = Object.entries(updates)
      .filter(([key]) => key !== 'id' && key !== 'created_at')
      .map(([_, value]) => value);

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    await this.db.runAsync(
      `UPDATE containers SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteContainer(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM containers WHERE id = ?', [id]);
  }

  // ==================== RECEIPTS ====================

  async createReceipt(receipt: Omit<LocalReceipt, 'created_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    await this.db.runAsync(
      `INSERT INTO receipts (
        id, item_id, photo_url, local_photo_uri, synced, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        receipt.id,
        receipt.item_id,
        receipt.photo_url || null,
        receipt.local_photo_uri || null,
        receipt.synced,
        now,
      ]
    );
  }

  async getReceiptsByItem(itemId: string): Promise<LocalReceipt[]> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAllAsync<LocalReceipt>(
      'SELECT * FROM receipts WHERE item_id = ? ORDER BY created_at DESC',
      [itemId]
    );
  }

  async deleteReceipt(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM receipts WHERE id = ?', [id]);
  }

  // ==================== UTILITY ====================

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      DELETE FROM receipts;
      DELETE FROM items;
      DELETE FROM containers;
    `);
  }

  async getStats() {
    if (!this.db) throw new Error('Database not initialized');

    const itemCount = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM items'
    );
    const unsyncedCount = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM items WHERE synced = 0'
    );
    const containerCount = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM containers'
    );

    return {
      items: itemCount?.count || 0,
      unsynced: unsyncedCount?.count || 0,
      containers: containerCount?.count || 0,
    };
  }

  // ==================== SHOPPING LIST ====================

  async addToShoppingList(itemName: string, quantity: number = 1): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `shopping-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    await this.db.runAsync(
      `INSERT INTO shopping_list (id, item_name, quantity, is_purchased, synced, created_at, updated_at)
       VALUES (?, ?, ?, 0, 0, ?, ?)`,
      [id, itemName, quantity, now, now]
    );
  }

  async getShoppingList(): Promise<LocalShoppingItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAllAsync<LocalShoppingItem>(
      'SELECT * FROM shopping_list ORDER BY is_purchased ASC, created_at DESC'
    );
  }

  async updateShoppingItem(
    id: string,
    updates: { quantity?: number; is_purchased?: number; synced?: number }
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    const setParts: string[] = [];
    const values: any[] = [];

    if (updates.quantity !== undefined) {
      setParts.push('quantity = ?');
      values.push(updates.quantity);
    }

    if (updates.is_purchased !== undefined) {
      setParts.push('is_purchased = ?');
      values.push(updates.is_purchased);
    }

    if (updates.synced !== undefined) {
      setParts.push('synced = ?');
      values.push(updates.synced);
    }

    if (setParts.length === 0) return;

    setParts.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const query = `UPDATE shopping_list SET ${setParts.join(', ')} WHERE id = ?`;
    await this.db.runAsync(query, values);
  }

  async deleteShoppingItem(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM shopping_list WHERE id = ?', [id]);
  }

  async clearPurchasedItems(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM shopping_list WHERE is_purchased = 1');
  }
}

// Singleton instance
export const databaseService = new DatabaseService();
