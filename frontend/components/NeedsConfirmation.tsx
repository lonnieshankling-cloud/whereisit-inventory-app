import { useState, useCallback, useRef, useEffect } from "react";
import { CheckCircle2, Trash2, Move, CheckCircle } from "lucide-react";
import { MoveItemsDialog } from "./MoveItemsDialog";
import { useToast } from "@/components/ui/use-toast";
import { useBackend } from "@/lib/backend";
import { useInfiniteScroll } from "@/lib/useInfiniteScroll";
import type { Item } from "~backend/item/create";
import { ItemCard } from "./ItemCard";
import { ItemCardSkeleton } from "./ItemCardSkeleton";
import { EditItemDialog } from "./EditItemDialog";
import { Button } from "@/components/ui/button";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function NeedsConfirmation() {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const { toast } = useToast();
  const backend = useBackend();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(async (limit: number, offset: number) => {
    return await backend.item.needsConfirmation({ limit, offset });
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

  const toggleFavorite = async (id: number) => {
    try {
      await backend.item.toggleFavorite({ id });
      reload();
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update favorite",
      });
    }
  };

  const addToShopping = async (itemName: string) => {
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

  const confirmLocation = async (id: number) => {
    try {
      await backend.item.confirmLocation({ id });
      toast({
        title: "Success",
        description: "Location confirmed",
      });
      reload();
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
      reload();
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
      reload();
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

  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  const handleMoveComplete = () => {
    setSelectedIds(new Set());
    reload();
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
      reload();
    } catch (error) {
      console.error("Failed to confirm items:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to confirm items",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#F3F4F6] rounded-lg p-6">
        <Accordion type="single" collapsible defaultValue="confirmation">
          <AccordionItem value="confirmation" className="border-none">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-xl font-semibold text-[#111827]">Needs Confirmation</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i: number) => (
                  <ItemCardSkeleton key={i} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  }

  return (
    <div className="bg-[#F3F4F6] rounded-lg p-6">
      <Accordion type="single" collapsible defaultValue="confirmation">
        <AccordionItem value="confirmation" className="border-none">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-xl font-semibold text-[#111827]">
                Needs Confirmation ({items.length})
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
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

            {items.length === 0 ? (
              <p className="text-gray-600">All items are confirmed!</p>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((item: any) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onToggleFavorite={toggleFavorite}
                      onAddToShopping={addToShopping}
                      onItemClick={handleItemClick}
                      selected={selectedIds.has(item.id)}
                      onSelectionChange={(selected) => {
                        setSelectedIds((prev: Set<number>) => {
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
                      onConfirmLocation={confirmLocation}
                    />
                  ))}
                </div>
                {hasMore && (
                  <div ref={loadMoreRef} className="mt-4 text-center">
                    {isLoadingMore && (
                      <p className="text-sm text-gray-500">Loading more...</p>
                    )}
                  </div>
                )}
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <EditItemDialog
        item={selectedItem}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onItemUpdated={reload}
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
