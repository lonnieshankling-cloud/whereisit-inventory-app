import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface FilterOptions {
  minQuantity?: number;
  maxQuantity?: number;
  tags?: string[];
  locationIds?: number[];
  containerIds?: number[];
  isFavorite?: boolean;
  hasPhoto?: boolean;
  expirationDateFrom?: string;
  expirationDateTo?: string;
}

interface FiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterOptions;
  onApplyFilters: (filters: FilterOptions) => void;
  availableTags?: string[];
  availableLocations?: Array<{ id: number; name: string }>;
  availableContainers?: Array<{ id: number; name: string }>;
}

export function FiltersDialog({
  open,
  onOpenChange,
  filters,
  onApplyFilters,
  availableTags = [],
  availableLocations = [],
  availableContainers = [],
}: FiltersDialogProps) {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    const resetFilters: FilterOptions = {};
    setLocalFilters(resetFilters);
    onApplyFilters(resetFilters);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filter Items</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-base font-semibold">Quantity Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minQty" className="text-sm">Min Quantity</Label>
                <Input
                  id="minQty"
                  type="number"
                  min={0}
                  placeholder="Min"
                  value={localFilters.minQuantity ?? ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      minQuantity: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="maxQty" className="text-sm">Max Quantity</Label>
                <Input
                  id="maxQty"
                  type="number"
                  min={0}
                  placeholder="Max"
                  value={localFilters.maxQuantity ?? ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      maxQuantity: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">Location</Label>
            <Select
              value={localFilters.locationIds?.[0]?.toString() || ""}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  locationIds: value ? [parseInt(value)] : undefined,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Locations</SelectItem>
                {availableLocations.map((location) => (
                  <SelectItem key={location.id} value={location.id.toString()}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">Container</Label>
            <Select
              value={localFilters.containerIds?.[0]?.toString() || ""}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  containerIds: value ? [parseInt(value)] : undefined,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Containers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Containers</SelectItem>
                {availableContainers.map((container) => (
                  <SelectItem key={container.id} value={container.id.toString()}>
                    {container.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">Expiration Date Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expFrom" className="text-sm">From</Label>
                <Input
                  id="expFrom"
                  type="date"
                  value={localFilters.expirationDateFrom ?? ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      expirationDateFrom: e.target.value || undefined,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="expTo" className="text-sm">To</Label>
                <Input
                  id="expTo"
                  type="date"
                  value={localFilters.expirationDateTo ?? ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      expirationDateTo: e.target.value || undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Options</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="favorite"
                checked={localFilters.isFavorite ?? false}
                onCheckedChange={(checked) =>
                  setLocalFilters({
                    ...localFilters,
                    isFavorite: checked === true ? true : undefined,
                  })
                }
              />
              <Label htmlFor="favorite" className="text-sm font-normal cursor-pointer">
                Favorites only
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasPhoto"
                checked={localFilters.hasPhoto ?? false}
                onCheckedChange={(checked) =>
                  setLocalFilters({
                    ...localFilters,
                    hasPhoto: checked === true ? true : undefined,
                  })
                }
              />
              <Label htmlFor="hasPhoto" className="text-sm font-normal cursor-pointer">
                Has photo
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset All
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
