import { useState, useEffect, ChangeEvent, KeyboardEvent, useRef, useCallback } from "react";
import type { ShoppingListItem } from "~backend/shopping/list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Plus, ShoppingCart, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AddFromLowStockDialog } from "./AddFromLowStockDialog";
import { AddToInventoryDialog } from "./AddToInventoryDialog";
import { useBackend } from "@/lib/backend";
import { useAuth } from "@clerk/clerk-react";

export function ShoppingList() {
  const backend = useBackend();
  const { isLoaded, isSignedIn } = useAuth();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(true);
  const [lowStockDialogOpen, setLowStockDialogOpen] = useState(false);
  const [addToInventoryDialogOpen, setAddToInventoryDialogOpen] = useState(false);
  const [selectedPurchasedItem, setSelectedPurchasedItem] = useState<ShoppingListItem | null>(null);
  const { toast } = useToast();
  const pollIntervalRef = useRef<number | null>(null);

  const fetchItems = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    
    try {
      const response = await backend.shopping.list();
      setItems(response.items);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to fetch shopping list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, backend, toast]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    
    fetchItems();
    
    pollIntervalRef.current = window.setInterval(fetchItems, 3000);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isLoaded, isSignedIn, fetchItems]);

  const handleAdd = async () => {
    if (!itemName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an item name",
        variant: "destructive",
      });
      return;
    }

    try {
      const qty = parseInt(quantity) || 1;
      await backend.shopping.add({ itemName: itemName.trim(), quantity: qty });
      setItemName("");
      setQuantity("1");
      await fetchItems();
      toast({
        title: "Success",
        description: "Item added to shopping list",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await backend.shopping.deleteItem({ id });
      await fetchItems();
      toast({
        title: "Success",
        description: "Item removed from shopping list",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    }
  };

  const handleTogglePurchased = async (item: ShoppingListItem) => {
    try {
      await backend.shopping.update({
        id: item.id,
        isPurchased: !item.isPurchased,
      });
      await fetchItems();

      if (!item.isPurchased) {
        setSelectedPurchasedItem(item);
        setAddToInventoryDialogOpen(true);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    }
  };

  const unpurchasedItems = items.filter(item => !item.isPurchased);
  const purchasedItems = items.filter(item => item.isPurchased);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-foreground mb-6">Shopping List</h2>

      <div className="mb-8 p-6 bg-muted/50 rounded-lg border">
        <div className="flex gap-3 mb-4">
          <Input
            type="text"
            placeholder="Item name"
            value={itemName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setItemName(e.target.value)}
            onKeyDown={(e: KeyboardEvent) => e.key === "Enter" && handleAdd()}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="Qty"
            value={quantity}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)}
            className="w-20"
            min="1"
          />
          <Button
            onClick={handleAdd}
            className="bg-[#FACC15] hover:bg-[#FACC15]/90 text-[#111827] font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
        <Button
          onClick={() => setLowStockDialogOpen(true)}
          variant="outline"
          className="w-full"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add from Low Stock
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Loading...</p>
      ) : (
        <>
          {unpurchasedItems.length === 0 && purchasedItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Your shopping list is empty</p>
          ) : (
            <div className="space-y-6">
              {unpurchasedItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">To Buy</h3>
                  {unpurchasedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-4 bg-background border rounded-lg hover:border-muted-foreground/50 transition-colors"
                    >
                      <Checkbox
                        checked={item.isPurchased}
                        onCheckedChange={() => handleTogglePurchased(item)}
                        className="h-5 w-5"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.itemName}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Qty: {item.quantity}</span>
                          <span>•</span>
                          <span>Added by {item.addedByEmail}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {purchasedItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-muted-foreground">Purchased</h3>
                  {purchasedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-4 bg-muted/30 border border-muted rounded-lg opacity-60"
                    >
                      <Checkbox
                        checked={item.isPurchased}
                        onCheckedChange={() => handleTogglePurchased(item)}
                        className="h-5 w-5"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-muted-foreground line-through">{item.itemName}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Qty: {item.quantity}</span>
                          <span>•</span>
                          <span>Added by {item.addedByEmail}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <AddFromLowStockDialog
        open={lowStockDialogOpen}
        onOpenChange={setLowStockDialogOpen}
        onItemsAdded={fetchItems}
      />

      <AddToInventoryDialog
        open={addToInventoryDialogOpen}
        onOpenChange={setAddToInventoryDialogOpen}
        item={selectedPurchasedItem}
        onComplete={fetchItems}
      />
    </div>
  );
}
