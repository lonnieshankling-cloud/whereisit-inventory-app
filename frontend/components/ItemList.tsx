import { useState, memo } from "react";
import type { Item } from "~backend/item/create";
import { EditItemDialog } from "./EditItemDialog";
import { Checkbox } from "@/components/ui/checkbox";

interface ItemListProps {
  items: Item[];
  onItemUpdated?: () => void;
  searchQuery?: string;
}

export const ItemList = memo(function ItemList({ items, onItemUpdated, searchQuery = "" }: ItemListProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleItemUpdated = () => {
    onItemUpdated?.();
  };

  const filteredItems = searchQuery.trim()
    ? items.filter((item) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(searchLower) ||
          (item.description?.toLowerCase().includes(searchLower) ?? false)
        );
      })
    : items;

  return (
    <>
      <ul className="space-y-2">
        {filteredItems.map((item) => (
          <li 
            key={item.id} 
            className="flex items-center gap-2"
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
            />
            <span 
              className="cursor-pointer hover:text-[#FACC15] transition-colors flex-1"
              onClick={() => handleItemClick(item)}
            >
              {item.name}
            </span>
          </li>
        ))}
      </ul>

      <EditItemDialog
        item={selectedItem}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onItemUpdated={handleItemUpdated}
      />
    </>
  );
});
