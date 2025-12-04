import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { useBackend } from "@/lib/backend";
import { useInfiniteScroll } from "@/lib/useInfiniteScroll";
import { Move } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Item } from "~backend/item/create";
import { EditItemDialog } from "./EditItemDialog";
import { EmptyState } from "./EmptyState";
import { FilterOptions } from "./FiltersDialog";
import { MoveItemsDialog } from "./MoveItemsDialog";
import { StickySearchFilterBar } from "./StickySearchFilterBar";

export function UnplacedItems() {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const { toast } = useToast();
  const backend = useBackend();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(async (limit: number, offset: number) => {
    return await backend.item.listByPlacedStatus({ status: "not_placed", limit, offset });
  }, [backend]);

  const { items, isLoading, isLoadingMore, hasMore, loadMore, reload } = useInfiniteScroll({
    fetchItems,
    limit: 50,
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

  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  const handleMoveComplete = () => {
    setSelectedIds(new Set());
    reload();
  };

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
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
  }, [items, searchQuery, filters]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i: number) => (
          <div key={i} className="p-3 bg-muted rounded-md flex items-start gap-3">
            <Skeleton className="h-4 w-4 mt-0.5" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-2" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StickySearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {filteredItems.length === 0 ? (
        <EmptyState
          icon="package"
          title={searchQuery || Object.keys(filters).length > 0 ? "No items found" : "No unassigned items"}
          description={
            searchQuery || Object.keys(filters).length > 0
              ? "Try adjusting your search or filters to find what you're looking for."
              : "All items have been assigned to locations. Great job organizing!"
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {filteredItems.map((item) => (
            <li 
              key={item.id} 
              className="p-3 bg-muted rounded-md cursor-pointer hover:bg-muted/80 transition-colors flex items-start gap-3"
              onClick={() => handleItemClick(item)}
            >
              <Checkbox
                checked={selectedIds.has(item.id)}
                onCheckedChange={(checked) => {
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (checked) {
                      next.add(item.id);
                    } else {
                      next.delete(item.id);
                    }
                    return next;
                  });
                }}
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5"
              />
              <div className="flex-1">
              <p className="font-semibold text-base">{item.name}</p>
              {item.description && (
                <p className="text-sm text-muted-foreground italic">
                  {item.description}
                </p>
              )}
              <div className="grid grid-cols-2 gap-x-4 text-sm mt-2">
                <p>
                  <span className="font-medium">Quantity:</span> {item.quantity}
                </p>
                <p>
                  <span className="font-medium">Location:</span>{" "}
                  {item.locationName || "N/A"}
                </p>
                <p>
                  <span className="font-medium">Container:</span>{" "}
                  {item.containerName || "N/A"}
                </p>
                <p>
                  <span className="font-medium">Added:</span>{" "}
                  {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
              </div>
            </li>
            ))}
          </ul>
          {hasMore && (
            <div ref={loadMoreRef} className="mt-4 text-center">
              {isLoadingMore && (
                <p className="text-sm text-gray-500">Loading more...</p>
              )}
            </div>
          )}
        </>
      )}

      <EditItemDialog
        item={selectedItem}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onItemUpdated={reload}
      />

      <MoveItemsDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        selectedItemIds={Array.from(selectedIds)}
        onMoveComplete={handleMoveComplete}
      />

      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {selectedIds.size} item(s) selected
            </p>
            <Button onClick={() => setMoveDialogOpen(true)}>
              <Move className="h-4 w-4 mr-2" />
              Move Selected
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
