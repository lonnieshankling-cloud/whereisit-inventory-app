import { useState, ChangeEvent, KeyboardEvent, useEffect, useRef } from "react";
import { Search, Heart, ShoppingCart, Package, Trash2, Move } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { MoveItemsDialog } from "./MoveItemsDialog";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useBackend } from "@/lib/backend";
import type { Item } from "~backend/item/create";
import { theme } from "@/lib/theme";

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
}

export function SearchBar({ query, onQueryChange }: SearchBarProps) {
  const [results, setResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const { toast } = useToast();
  const backend = useBackend();
  const debounceTimerRef = useRef<number | null>(null);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await backend.item.search({ query: searchQuery });
      setResults(response.items);
    } catch (error) {
      console.error("Search error:", error);
      toast({
        variant: "destructive",
        title: "Search failed",
        description: "Unable to search items. Please try again.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.trim()) {
      debounceTimerRef.current = window.setTimeout(() => {
        handleSearch(query);
      }, 400);
    } else {
      setResults([]);
    }

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  const toggleFavorite = async (id: number) => {
    try {
      await backend.item.toggleFavorite({ id });
      const response = await backend.item.search({ query });
      setResults(response.items);
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update favorite status",
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

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      await backend.item.deleteItem({ id: itemToDelete });
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
      handleSearch(query);
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

  const handleMoveComplete = () => {
    setSelectedIds(new Set());
    if (query.trim()) {
      handleSearch(query);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search for items..."
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onQueryChange(e.target.value)}
            onKeyDown={(e: KeyboardEvent) => e.key === "Enter" && handleSearch(query)}
            className="pl-10 h-12 text-base"
          />
        </div>
        <Button
          onClick={() => handleSearch(query)}
          disabled={isSearching}
          className="font-semibold"
          style={{
            height: theme.layout.buttonHeight.large,
            padding: `0 ${theme.spacing.xl}`,
            backgroundColor: theme.colors.brand.primary,
            color: theme.colors.text.primary,
            fontWeight: theme.typography.fontWeight.semibold
          }}
          onMouseEnter={(e) => !isSearching && (e.currentTarget.style.backgroundColor = theme.colors.brand.primaryHover)}
          onMouseLeave={(e) => !isSearching && (e.currentTarget.style.backgroundColor = theme.colors.brand.primary)}
        >
          {isSearching ? "Searching..." : "Search"}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="mt-4 rounded-lg p-4" style={{ backgroundColor: theme.colors.surface.gray100 }}>
          <h3 className="font-semibold mb-3" style={{ color: theme.colors.text.primary, fontWeight: theme.typography.fontWeight.semibold }}>Search Results ({results.length})</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {results.map((item: any) => (
              <div
                key={item.id}
                className="bg-white rounded-md border border-gray-200 transition-colors overflow-hidden relative"
                onMouseEnter={(e) => e.currentTarget.style.borderColor = theme.colors.brand.primary}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = ''}
              >
                <div className="absolute top-2 left-2 z-10">
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
                    className="bg-white border-gray-300"
                  />
                </div>
                <Trash2
                  size={16}
                  className="absolute top-2 right-2 z-10 cursor-pointer text-gray-400 hover:text-red-500 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setItemToDelete(item.id);
                  }}
                />
                {item.photoUrl ? (
                  <div className="relative h-32 w-full">
                    <img
                      src={item.photoUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="relative h-32 w-full bg-gray-100 flex items-center justify-center">
                    <Package className="h-10 w-10 text-gray-300" />
                  </div>
                )}
                <div className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium" style={{ color: theme.colors.text.primary, fontWeight: theme.typography.fontWeight.medium }}>{item.name}</h4>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleFavorite(item.id)}
                      >
                        <Heart
                          className="h-3.5 w-3.5"
                          style={{
                            fill: item.isFavorite ? theme.colors.brand.primary : 'none',
                            color: item.isFavorite ? theme.colors.brand.primary : '#9CA3AF'
                          }}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => addToShopping(item.name)}
                      >
                        <ShoppingCart className="h-3.5 w-3.5 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      Qty: {item.quantity}
                    </span>
                    {item.tags.map((tag: string) => (
                      <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
