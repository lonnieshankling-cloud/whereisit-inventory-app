import { useState, ChangeEvent } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FiltersDialog, FilterOptions } from "./FiltersDialog";

interface StickySearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableTags?: string[];
  availableLocations?: Array<{ id: number; name: string }>;
  availableContainers?: Array<{ id: number; name: string }>;
  className?: string;
}

export function StickySearchFilterBar({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  availableTags = [],
  availableLocations = [],
  availableContainers = [],
  className = "",
}: StickySearchFilterBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = Object.values(filters).filter((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined;
  }).length;

  return (
    <>
      <div
        className={`sticky top-0 z-10 bg-white border-b border-gray-200 py-3 px-4 -mx-4 mb-4 ${className}`}
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name or description..."
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-2 relative"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FACC15] text-[#111827] text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      <FiltersDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onApplyFilters={onFiltersChange}
        availableTags={availableTags}
        availableLocations={availableLocations}
        availableContainers={availableContainers}
      />
    </>
  );
}
