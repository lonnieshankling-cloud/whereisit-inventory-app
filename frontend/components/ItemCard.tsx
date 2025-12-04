import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { theme } from "@/lib/theme";
import { Box, Check, Heart, MapPin, Minus, Plus, ShoppingCart, Trash2, ZoomIn } from "lucide-react";
import { MouseEvent, memo, useState } from "react";
import type { Item } from "~backend/item/create";
import { ImageZoomDialog } from "./ImageZoomDialog";
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
  onQuantityChange?: (id: number, newQuantity: number) => void;
}

export const ItemCard = memo(function ItemCard({ item, onToggleFavorite, onAddToShopping, onItemClick, selected = false, onSelectionChange, onDelete, onConfirmLocation, onQuantityChange }: ItemCardProps) {
  const [showZoom, setShowZoom] = useState(false);
  const isUnconfirmed = !item.lastConfirmedAt || 
    (new Date().getTime() - new Date(item.lastConfirmedAt).getTime()) > 7 * 24 * 60 * 60 * 1000;

  return (
    <>
      <div 
        className="bg-white rounded-lg border transition-all duration-200 overflow-hidden cursor-pointer relative group"
        style={{
          borderColor: theme.colors.surface.gray200,
          boxShadow: theme.shadows.sm,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = theme.colors.brand.primary;
          e.currentTarget.style.boxShadow = theme.shadows.md;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = theme.colors.surface.gray200;
          e.currentTarget.style.boxShadow = theme.shadows.sm;
        }}
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
      <div className="relative h-40 w-full bg-gray-100 overflow-hidden">
        {item.photoUrl ? (
          <>
            <LazyImage
              src={item.photoUrl}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <button
              className="absolute bottom-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
                setShowZoom(true);
              }}
            >
              <ZoomIn className="h-4 w-4 text-gray-700" />
            </button>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Box className="h-12 w-12 text-gray-300" />
          </div>
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
                className="h-4 w-4 transition-colors"
                style={{
                  color: item.isFavorite ? theme.colors.accent.rose : theme.colors.text.muted,
                  fill: item.isFavorite ? theme.colors.accent.rose : "none",
                }}
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
        {item.notes && (
          <p className="text-xs text-gray-500 mb-2 line-clamp-1 italic">
            Note: {item.notes}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {onQuantityChange ? (
              <div className="flex items-center gap-1 bg-gray-100 rounded overflow-hidden">
                <button
                  className="px-2 py-1 hover:bg-gray-200 transition-colors"
                  onClick={(e: MouseEvent) => {
                    e.stopPropagation();
                    if (item.quantity > 0) {
                      onQuantityChange(item.id, item.quantity - 1);
                    }
                  }}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-xs px-2">Qty: {item.quantity}</span>
                <button
                  className="px-2 py-1 hover:bg-gray-200 transition-colors"
                  onClick={(e: MouseEvent) => {
                    e.stopPropagation();
                    onQuantityChange(item.id, item.quantity + 1);
                  }}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                Qty: {item.quantity}
              </span>
            )}
            {item.tags.map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>

    {item.photoUrl && (
      <ImageZoomDialog
        imageUrl={item.photoUrl}
        alt={item.name}
        open={showZoom}
        onOpenChange={setShowZoom}
      />
    )}
  </>
  );
});
