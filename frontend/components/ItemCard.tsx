import { Heart, ShoppingCart, Trash2, MapPin, Box, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Item } from "~backend/item/create";
import { MouseEvent, memo } from "react";
import { LazyImage } from "./LazyImage";

interface ItemCardProps {
  item: Item;
  onToggleFavorite: (id: number) => void;
  onAddToShopping: (itemName: string) => void;
  onItemClick?: (item: Item) => void;
  selected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  onDelete?: () => void;
  onConfirmLocation?: (id: number) => void;
}

export const ItemCard = memo(function ItemCard({ item, onToggleFavorite, onAddToShopping, onItemClick, selected = false, onSelectionChange, onDelete, onConfirmLocation }: ItemCardProps) {
  const isUnconfirmed = !item.lastConfirmedAt || 
    (new Date().getTime() - new Date(item.lastConfirmedAt).getTime()) > 7 * 24 * 60 * 60 * 1000;

  return (
    <div 
      className="bg-white rounded-md border border-gray-200 hover:border-[#FACC15] transition-colors overflow-hidden cursor-pointer relative"
      onClick={() => onItemClick?.(item)}
    >
      {onSelectionChange && (
        <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onCheckedChange={onSelectionChange}
            className="bg-white border-gray-300"
          />
        </div>
      )}
      {onDelete && (
        <Trash2
          size={16}
          className="absolute top-2 right-2 cursor-pointer text-gray-400 hover:text-red-500 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        />
      )}
      <div className="relative h-40 w-full bg-gray-100">
        {item.photoUrl && (
          <LazyImage
            src={item.photoUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {isUnconfirmed && (
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FFC107' }} />
              )}
              <h3 className="font-semibold text-[#111827]">{item.name}</h3>
            </div>
            {onConfirmLocation && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e: MouseEvent) => {
                  e.stopPropagation();
                  onConfirmLocation(item.id);
                }}
              >
                <Check className="h-4 w-4 text-gray-400 hover:text-green-600" />
              </Button>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
                onToggleFavorite(item.id);
              }}
            >
              <Heart
                className={`h-4 w-4 ${
                  item.isFavorite ? "fill-[#FACC15] text-[#FACC15]" : "text-gray-400"
                }`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
                onAddToShopping(item.name);
              }}
            >
              <ShoppingCart className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
        </div>
        {item.description && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
        )}
        {item.locationName && (
          <div className="flex items-center gap-1 mb-1">
            <MapPin className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-sm text-gray-500">{item.locationName}</span>
          </div>
        )}
        {item.containerName && (
          <div className="flex items-center gap-1 mb-2">
            <Box className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-sm text-gray-500">{item.containerName}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
            Qty: {item.quantity}
          </span>
          {item.tags.map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});
