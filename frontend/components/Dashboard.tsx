import React from "react";
import { ExpiringItems } from "./ExpiringItems";
import { LowStockItems } from "./LowStockItems";
import { RecentItems } from "./RecentItems";
import { FavoriteItems } from "./FavoriteItems";
import { LocationsList } from "./LocationsList";

export const Dashboard = () => {
  return (
    <div className="p-4 space-y-6">
      {/* Quick Access Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-card rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Expiring Soon</h2>
          <ExpiringItems />
        </div>
        <div className="p-4 bg-card rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Low Stock</h2>
          <LowStockItems />
        </div>
        <div className="p-4 bg-card rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Favorites</h2>
          <FavoriteItems />
        </div>
        <div className="p-4 bg-card rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Recently Added</h2>
          <RecentItems />
        </div>
      </div>

      {/* Main Inventory List */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Inventory</h2>
        <LocationsList />
      </div>
    </div>
  );
};
