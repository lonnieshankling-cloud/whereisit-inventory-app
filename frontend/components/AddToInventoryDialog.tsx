import { useState, useEffect } from "react";
import type { ShoppingListItem } from "~backend/shopping/list";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Package } from "lucide-react";
import { useBackend } from "@/lib/backend";

interface AddToInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ShoppingListItem | null;
  onComplete: () => void;
}

export function AddToInventoryDialog({
  open,
  onOpenChange,
  item,
  onComplete,
}: AddToInventoryDialogProps) {
  const backend = useBackend();
  const [quantity, setQuantity] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingItem, setExistingItem] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && item) {
      setQuantity(item.quantity.toString());
      searchForExistingItem();
    }
  }, [open, item]);

  const searchForExistingItem = async () => {
    if (!item) return;

    try {
      setSearching(true);
      const response = await backend.item.search({ query: item.itemName, limit: 10 });
      
      const exactMatch = response.items.find(
        (i: any) => i.name.toLowerCase() === item.itemName.toLowerCase()
      );
      
      setExistingItem(exactMatch || null);
    } catch (error) {
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  const handleNo = () => {
    onOpenChange(false);
    onComplete();
  };

  const handleYes = async () => {
    if (!item) return;

    const qty = parseInt(quantity) || item.quantity;

    try {
      setSaving(true);

      if (existingItem) {
        await backend.item.update({
          id: existingItem.id,
          quantity: existingItem.quantity + qty,
        });

        toast({
          title: "Success",
          description: `Updated ${item.itemName} quantity in inventory`,
        });
      } else {
        await backend.item.create({
          name: item.itemName,
          quantity: qty,
        });

        toast({
          title: "Success",
          description: `Added ${item.itemName} to inventory`,
        });
      }

      onOpenChange(false);
      onComplete();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update inventory",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[#FACC15]" />
            Add to Inventory?
          </DialogTitle>
          <DialogDescription>
            You bought <span className="font-semibold text-foreground">{item.itemName}</span>.
            Would you like to add this to your inventory or update its quantity?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {searching ? (
            <p className="text-sm text-muted-foreground text-center">Checking inventory...</p>
          ) : existingItem ? (
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-foreground mb-2">
                Found in inventory
              </p>
              <p className="text-sm text-muted-foreground">
                Current quantity: <span className="font-semibold">{existingItem.quantity}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                New quantity will be: <span className="font-semibold">{existingItem.quantity + (parseInt(quantity) || item.quantity)}</span>
              </p>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-muted-foreground">
                This item will be added as a new item in your inventory.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity purchased</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleNo}
            disabled={saving}
            className="flex-1 sm:flex-none"
          >
            No, Thanks
          </Button>
          <Button
            onClick={handleYes}
            disabled={saving || searching}
            className="flex-1 sm:flex-none bg-[#FACC15] hover:bg-[#FACC15]/90 text-[#111827]"
          >
            {saving ? "Saving..." : existingItem ? "Update Inventory" : "Add to Inventory"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
