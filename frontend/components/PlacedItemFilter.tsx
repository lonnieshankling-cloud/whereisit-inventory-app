import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PlacedItemFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function PlacedItemFilter({ value, onChange }: PlacedItemFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-[220px]">
        <SelectValue placeholder="Show All Items" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Show All Items</SelectItem>
        <SelectItem value="placed">Show Placed Items</SelectItem>
        <SelectItem value="not_placed">Show Unassigned Items</SelectItem>
      </SelectContent>
    </Select>
  );
}
