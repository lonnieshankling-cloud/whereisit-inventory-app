import { useEffect, useState, ChangeEvent, KeyboardEvent, useMemo, useCallback, useRef } from "react";
import { MapPin, Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useBackend } from "@/lib/backend";
import { useInfiniteScroll } from "@/lib/useInfiniteScroll";
import { ItemDetailDialog } from "./ItemDetailDialog";
import { ManageContainersDialog } from "./ManageContainersDialog";
import { StickySearchFilterBar } from "./StickySearchFilterBar";
import { FilterOptions } from "./FiltersDialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LocationAccordion,
  LocationWithContainers,
} from "./LocationAccordion";
import { ContainerWithItems } from "./ContainerList";
import type { Item } from "~backend/item/create";
import type { Location } from "~backend/location/create";
import type { Container } from "~backend/container/api";

interface LocationsListProps {
  externalSearchQuery?: string;
}

export function LocationsList({ externalSearchQuery = "" }: LocationsListProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showContainersDialog, setShowContainersDialog] = useState(false);
  const [preselectedLocationId, setPreselectedLocationId] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({});
  const { toast } = useToast();
  const backend = useBackend();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(async (limit: number, offset: number) => {
    return await backend.item.search({ query: "", limit, offset });
  }, [backend]);

  const { items, isLoading: itemsLoading, isLoadingMore, hasMore, loadMore, reload } = useInfiniteScroll({
    fetchItems,
    limit: 100,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const locationsResponse = await backend.location.list();
      setLocations(locationsResponse.locations);
      setContainers(locationsResponse.containers || []);
    } catch (error) {
      console.error("Failed to load locations:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load locations",
      });
    } finally {
      setLocationsLoading(false);
    }
  };



  const filteredItems = useMemo(() => {
    let result = [...items];

    const combinedQuery = externalSearchQuery || searchQuery;
    if (combinedQuery.trim()) {
      const query = combinedQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    if (filters.minQuantity !== undefined) {
      result = result.filter((item) => item.quantity >= filters.minQuantity!);
    }

    if (filters.maxQuantity !== undefined) {
      result = result.filter((item) => item.quantity <= filters.maxQuantity!);
    }

    if (filters.locationIds && filters.locationIds.length > 0) {
      result = result.filter((item) => item.locationId && filters.locationIds!.includes(item.locationId));
    }

    if (filters.containerIds && filters.containerIds.length > 0) {
      result = result.filter((item) => item.containerId && filters.containerIds!.includes(item.containerId));
    }

    if (filters.isFavorite) {
      result = result.filter((item) => item.isFavorite);
    }

    if (filters.hasPhoto) {
      result = result.filter((item) => item.photoUrl);
    }

    if (filters.expirationDateFrom) {
      result = result.filter((item) => {
        if (!item.expirationDate) return false;
        return new Date(item.expirationDate) >= new Date(filters.expirationDateFrom!);
      });
    }

    if (filters.expirationDateTo) {
      result = result.filter((item) => {
        if (!item.expirationDate) return false;
        return new Date(item.expirationDate) <= new Date(filters.expirationDateTo!);
      });
    }

    return result;
  }, [items, searchQuery, externalSearchQuery, filters]);

  const groupedData = useMemo(() => {
    const containerMap: Record<number, ContainerWithItems> = {};
    for (const container of containers) {
      containerMap[container.id] = { ...container, items: [] };
    }

    const locationMap: Record<number, LocationWithContainers> = {};
    for (const location of locations) {
      locationMap[location.id] = { ...location, containers: [], directItems: [] };
    }

    for (const item of filteredItems) {
      if (item.containerId !== null && item.containerId !== undefined) {
        if (containerMap[item.containerId]) {
          containerMap[item.containerId].items.push(item);
        }
      }
    }

    const unassignedItems = filteredItems.filter(item => 
      (item.containerId === null || item.containerId === undefined) && 
      (item.locationId === null || item.locationId === undefined)
    );
    if (unassignedItems.length > 0) {
      const unassignedContainer: ContainerWithItems = {
        id: -1,
        name: "Unassigned",
        locationId: -1,
        photoUrl: null,
        items: unassignedItems,
      };
      const unassignedLocation: LocationWithContainers = {
        id: -1,
        name: "Unassigned",
        userId: "",
        createdAt: new Date(),
        containers: [unassignedContainer],
      };
      locationMap[-1] = unassignedLocation;
    }

    for (const item of filteredItems) {
      if ((item.containerId === null || item.containerId === undefined) && 
          item.locationId !== null && item.locationId !== undefined) {
        if (locationMap[item.locationId]) {
          locationMap[item.locationId].directItems!.push(item);
        }
      }
    }

    for (const container of Object.values(containerMap)) {
      const locationId = container.locationId ?? -1;
      if (locationMap[locationId]) {
        if (!locationMap[locationId].containers.find(c => c.id === container.id)) {
          locationMap[locationId].containers.push(container);
        }
      }
    }

    const finalData = Object.values(locationMap);

    return finalData;
  }, [locations, containers, filteredItems]);

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) {
      return;
    }

    setIsAdding(true);
    setLocationError(null);
    try {
      await backend.location.create({ name: newLocationName.trim() });
      setNewLocationName("");
      await loadLocations();
      toast({
        title: "Success",
        description: "Location added successfully",
      });
    } catch (error) {
      console.error("Failed to add location:", error);
      setLocationError("Could not add location. Please try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add location",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteLocation = async (locationId: number) => {
    try {
      await backend.location.deleteLocation({ id: locationId });
      await loadLocations();
      toast({
        title: "Success",
        description: "Location deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete location:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete location",
      });
    }
  };



  if (locationsLoading || itemsLoading) {
    return (
      <div className="bg-[#F3F4F6] rounded-lg p-6">
        <h2 className="text-xl font-semibold text-[#111827] mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Locations
        </h2>
        <div className="mb-4 flex gap-2">
          <Skeleton className="flex-1 h-10" />
          <Skeleton className="w-20 h-10" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-4 rounded-md border border-gray-200">
              <Skeleton className="h-6 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F3F4F6] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-[#111827] flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Locations
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowContainersDialog(true)}
          className="flex items-center gap-2"
        >
          <Package className="h-4 w-4" />
          Manage Containers
        </Button>
      </div>

      <StickySearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        availableLocations={locations.map(loc => ({ id: loc.id, name: loc.name }))}
        availableContainers={containers.map(cont => ({ id: cont.id, name: cont.name }))}
      />

      <div className="mb-4">
        <div className="flex gap-2">
          <Input
            placeholder="Add new location..."
            value={newLocationName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setNewLocationName(e.target.value);
              setLocationError(null);
            }}
            onKeyDown={(e: KeyboardEvent) => e.key === "Enter" && handleAddLocation()}
            className="flex-1"
          />
          <Button
            onClick={handleAddLocation}
            disabled={isAdding || !newLocationName.trim()}
            className="bg-[#FACC15] hover:bg-[#FACC15]/90 text-[#111827] font-semibold"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        {locationError && (
          <p style={{ color: 'red', marginTop: '8px', fontSize: '14px' }}>{locationError}</p>
        )}
      </div>

      {groupedData.length === 0 ? (
        <p className="text-gray-600">
          No locations yet. Add locations like "Kitchen", "Garage", or "Attic" to organize your items!
        </p>
      ) : (
        <>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {groupedData.map((location) => (
              <LocationAccordion 
                key={location.id} 
                location={location} 
                onDelete={handleDeleteLocation}
                onAddContainer={(locationId) => {
                  setPreselectedLocationId(locationId);
                  setShowContainersDialog(true);
                }}
                onItemUpdated={reload}
                searchQuery={externalSearchQuery || searchQuery}
              />
            ))}
          </div>
          {hasMore && (
            <div ref={loadMoreRef} className="mt-4 text-center">
              {isLoadingMore && (
                <p className="text-sm text-gray-500">Loading more items...</p>
              )}
            </div>
          )}
        </>
      )}

      {selectedItem && (
        <ItemDetailDialog
          item={selectedItem}
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onItemUpdated={() => reload()}
        />
      )}

      <ManageContainersDialog
        open={showContainersDialog}
        onClose={() => {
          setShowContainersDialog(false);
          setPreselectedLocationId(undefined);
        }}
        preselectedLocationId={preselectedLocationId}
        onContainerAdded={loadLocations}
      />
    </div>
  );
}
