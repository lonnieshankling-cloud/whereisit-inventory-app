import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, MapPin, Package, Trash2, Move, CheckCircle } from "lucide-react";
import { MoveItemsDialog } from "@/components/MoveItemsDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useBackend } from "@/lib/backend";
import { ItemCard } from "@/components/ItemCard";
import { ItemDetailDialog } from "@/components/ItemDetailDialog";
import type { Item } from "~backend/item/create";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CategoryStat {
  category: string;
  count: number;
}

interface ContainerGroup {
  containerId: number | null;
  containerName: string;
  items: Item[];
}

interface LocationDetailPageProps {
  locationId: string;
  locationName: string;
  onBack: () => void;
}

export function LocationDetailPage({ locationId, locationName, onBack }: LocationDetailPageProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const { toast } = useToast();
  const backend = useBackend();

  useEffect(() => {
    loadItems();
    loadCategoryStats();
  }, [locationId]);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const response = await backend.item.listByLocation({ locationId });
      setItems(response.items);
    } catch (error) {
      console.error("Failed to load items:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load items for this location",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategoryStats = async () => {
    try {
      const response = await backend.item.getCategoryStatsByLocation({ locationId });
      setCategoryStats(response.stats);
    } catch (error) {
      console.error("Failed to load category stats:", error);
    }
  };

  const handleToggleFavorite = async (id: number) => {
    try {
      await backend.item.toggleFavorite({ id });
      await loadItems();
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update favorite status",
      });
    }
  };

  const handleAddToShopping = async (itemName: string) => {
    try {
      await backend.shopping.add({ itemName, quantity: 1 });
      toast({
        title: "Success",
        description: `${itemName} added to shopping list`,
      });
    } catch (error) {
      console.error("Failed to add to shopping list:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add to shopping list",
      });
    }
  };

  const handleConfirmLocation = async (id: number) => {
    try {
      await backend.item.confirmLocation({ id });
      toast({
        title: "Success",
        description: "Location confirmed",
      });
      loadItems();
    } catch (error) {
      console.error("Failed to confirm location:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to confirm location",
      });
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    
    setIsDeleting(true);
    try {
      await backend.item.deleteItem({ id: itemToDelete });
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
      loadItems();
    } catch (error) {
      console.error("Failed to delete item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete item",
      });
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    try {
      const itemIds = Array.from(selectedIds);
      await backend.item.bulkDelete({ itemIds });
      toast({
        title: "Success",
        description: `${itemIds.length} item(s) deleted successfully`,
      });
      setSelectedIds(new Set());
      loadItems();
    } catch (error) {
      console.error("Failed to delete items:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete items",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleMoveComplete = () => {
    setSelectedIds(new Set());
    loadItems();
    loadCategoryStats();
  };

  const handleConfirmSelected = async () => {
    try {
      const itemIds = Array.from(selectedIds);
      await backend.item.bulkConfirmLocation({ itemIds });
      toast({
        title: "Success",
        description: `${itemIds.length} item(s) location confirmed`,
      });
      setSelectedIds(new Set());
      loadItems();
    } catch (error) {
      console.error("Failed to confirm items:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to confirm items",
      });
    }
  };

  const containerGroups = useMemo(() => {
    const groups: Map<number | null, ContainerGroup> = new Map();
    
    items.forEach((item) => {
      const key = item.containerId ?? null;
      if (!groups.has(key)) {
        groups.set(key, {
          containerId: key,
          containerName: item.containerName || "Uncategorized",
          items: [],
        });
      }
      groups.get(key)!.items.push(item);
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.containerId === null) return 1;
      if (b.containerId === null) return -1;
      return a.containerName.localeCompare(b.containerName);
    });
  }, [items]);

  const filteredContainerGroups = useMemo(() => {
    if (!selectedCategory) return containerGroups;
    
    return containerGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.category === selectedCategory),
      }))
      .filter((group) => group.items.length > 0);
  }, [containerGroups, selectedCategory]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-gray-400" />
            <h1 className="text-3xl font-bold text-[#111827]">{locationName}</h1>
          </div>
        </div>

        <div className="bg-[#F3F4F6] rounded-lg p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-md border border-gray-200 overflow-hidden animate-pulse">
                <div className="h-40 bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-10 w-10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6 text-gray-400" />
          <h1 className="text-3xl font-bold text-[#111827]">{locationName}</h1>
        </div>
      </div>

      <div className="bg-[#F3F4F6] rounded-lg p-6">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-semibold text-[#111827] mb-2">No items in this location</p>
            <p className="text-gray-600">Start adding items to track them here!</p>
          </div>
        ) : (
          <>
            {selectedIds.size > 0 && (
              <div className="mb-4 bg-white rounded-md border border-gray-200 p-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">Bulk Actions ({selectedIds.size} selected)</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConfirmSelected}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Selected
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm text-gray-600">{items.length} item{items.length !== 1 ? 's' : ''} found</p>
            </div>
            
            {categoryStats.length > 0 && (
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedCategory === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className={selectedCategory === null ? "bg-[#FACC15] hover:bg-[#FACC15]/90 text-[#111827]" : ""}
                  >
                    Show All
                  </Button>
                  {categoryStats.map((stat) => (
                    <Button
                      key={stat.category}
                      variant={selectedCategory === stat.category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(stat.category)}
                      className={selectedCategory === stat.category ? "bg-[#FACC15] hover:bg-[#FACC15]/90 text-[#111827]" : ""}
                    >
                      {stat.category} ({stat.count})
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-6">
              {filteredContainerGroups.map((group) => (
                <div key={group.containerId ?? 'uncategorized'} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-300">
                    <Package className="h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-semibold text-[#111827]">
                      {group.containerName}
                    </h3>
                    <span className="text-sm text-gray-500">({group.items.length})</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {group.items.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onToggleFavorite={handleToggleFavorite}
                        onAddToShopping={handleAddToShopping}
                        onItemClick={setSelectedItem}
                        selected={selectedIds.has(item.id)}
                        onSelectionChange={(selected) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (selected) {
                              next.add(item.id);
                            } else {
                              next.delete(item.id);
                            }
                            return next;
                          });
                        }}
                        onDelete={() => setItemToDelete(item.id)}
                        onConfirmLocation={handleConfirmLocation}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <ItemDetailDialog
        item={selectedItem}
        open={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        onItemUpdated={loadItems}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} item(s) from your inventory.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this item from your inventory.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleConfirmSelected}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Selected
              </Button>
              <Button onClick={() => setMoveDialogOpen(true)}>
                <Move className="h-4 w-4 mr-2" />
                Move Selected
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
