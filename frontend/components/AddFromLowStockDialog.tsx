import { useState, useEffect } from "react";
import type { LowStockItem } from "~backend/shopping/low_stock_items";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, Package } from "lucide-react";
import { useBackend } from "@/lib/backend";

interface AddFromLowStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemsAdded: () => void;
}

export function AddFromLowStockDialog({
  open,
  onOpenChange,
  onItemsAdded,
}: AddFromLowStockDialogProps) {
  const backend = useBackend();
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchLowStockItems();
    }
  }, [open]);

  const fetchLowStockItems = async () => {
    try {
      setLoading(true);
      const response = await backend.shopping.lowStockItems();
      setItems(response.items);
      setSelectedItems(new Set());
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to fetch low stock items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemId: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleAddSelected = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to add",
        variant: "destructive",
      });
      return;
    }

    try {
      setAdding(true);
      const itemsToAdd = items.filter(item => selectedItems.has(item.id));
      
      await Promise.all(
        itemsToAdd.map(item =>
          backend.shopping.add({
            itemName: item.name,
            quantity: Math.max(1, (item.minQuantity || 1) - item.quantity),
          })
        )
      );

      toast({
        title: "Success",
        description: `Added ${itemsToAdd.length} item(s) to shopping list`,
      });

      onItemsAdded();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to add items to shopping list",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Low Stock Items</DialogTitle>
          <DialogDescription>
            Select items from your inventory that are low or out of stock to add to your shopping list.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No low stock items found</p>
              <p className="text-sm text-muted-foreground mt-1">
                All your items are well stocked!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedItems.has(item.id)}
                    onCheckedChange={() => toggleItem(item.id)}
                    className="h-5 w-5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{item.name}</p>
                      {item.stockStatus === "out" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                          <AlertCircle className="h-3 w-3" />
                          Out of Stock
                        </span>
                      )}
                      {item.stockStatus === "low" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 text-xs font-medium">
                          <AlertCircle className="h-3 w-3" />
                          Low Stock
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Current: {item.quantity}</span>
                      <span>•</span>
                      <span>Min: {item.minQuantity}</span>
                      {item.locationName && (
                        <>
                          <span>•</span>
                          <span>{item.locationName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddSelected}
            disabled={selectedItems.size === 0 || adding}
            className="bg-[#FACC15] hover:bg-[#FACC15]/90 text-[#111827]"
          >
            {adding ? "Adding..." : `Add ${selectedItems.size} Item(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
