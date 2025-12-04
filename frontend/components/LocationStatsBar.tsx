import { theme } from "@/lib/theme";
import { BarChart3, FolderX, MapPin, Package } from "lucide-react";
import { useMemo } from "react";
import type { LocationWithContainers } from "./LocationAccordion";

interface LocationStatsBarProps {
  locations: LocationWithContainers[];
}

export function LocationStatsBar({ locations }: LocationStatsBarProps) {
  const stats = useMemo(() => {
    let totalItems = 0;
    let totalContainers = 0;
    let emptyLocations = 0;
    let mostPopulatedLocation = { name: "", count: 0 };

    locations.forEach((location) => {
      const locationItemCount = (location.directItems?.length || 0);
      const containerItemCount = location.containers.reduce(
        (sum, container) => sum + (container.items?.length || 0),
        0
      );
      const locationTotal = locationItemCount + containerItemCount;

      totalItems += locationTotal;
      totalContainers += location.containers.length;

      if (locationTotal === 0) {
        emptyLocations++;
      }

      if (locationTotal > mostPopulatedLocation.count && location.id !== -1) {
        mostPopulatedLocation = { name: location.name, count: locationTotal };
      }
    });

    return {
      totalLocations: locations.filter(l => l.id !== -1).length,
      totalItems,
      totalContainers,
      emptyLocations,
      mostPopulatedLocation,
    };
  }, [locations]);

  if (stats.totalLocations === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div
        className="bg-white rounded-lg p-4 border border-gray-200"
        style={{
          boxShadow: theme.shadows.sm,
          transition: `all ${theme.transitions.base}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: theme.colors.brand.lightest }}
          >
            <MapPin className="h-5 w-5" style={{ color: theme.colors.brand.primary }} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Locations</p>
            <p className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
              {stats.totalLocations}
            </p>
          </div>
        </div>
      </div>

      <div
        className="bg-white rounded-lg p-4 border border-gray-200"
        style={{
          boxShadow: theme.shadows.sm,
          transition: `all ${theme.transitions.base}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${theme.colors.accent.emerald}15` }}
          >
            <Package className="h-5 w-5" style={{ color: theme.colors.accent.emerald }} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Items</p>
            <p className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
              {stats.totalItems}
            </p>
          </div>
        </div>
      </div>

      <div
        className="bg-white rounded-lg p-4 border border-gray-200"
        style={{
          boxShadow: theme.shadows.sm,
          transition: `all ${theme.transitions.base}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${theme.colors.accent.purple}15` }}
          >
            <BarChart3 className="h-5 w-5" style={{ color: theme.colors.accent.purple }} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Containers</p>
            <p className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
              {stats.totalContainers}
            </p>
          </div>
        </div>
      </div>

      <div
        className="bg-white rounded-lg p-4 border border-gray-200"
        style={{
          boxShadow: theme.shadows.sm,
          transition: `all ${theme.transitions.base}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${theme.colors.accent.amber}15` }}
          >
            <FolderX className="h-5 w-5" style={{ color: theme.colors.accent.amber }} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Empty</p>
            <p className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
              {stats.emptyLocations}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
