import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBackend } from "@/lib/backend";
import type { Container } from "~backend/container/api";

interface ContainerSelectProps {
  locationId: string;
  value: string;
  onValueChange: (value: string) => void;
}

export function ContainerSelect({ locationId, value, onValueChange }: ContainerSelectProps) {
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const backend = useBackend();

  useEffect(() => {
    if (locationId && locationId !== "none") {
      loadContainers();
    } else {
      setContainers([]);
      onValueChange("");
    }
  }, [locationId]);

  const loadContainers = async () => {
    if (!locationId || locationId === "none") {
      return;
    }

    setIsLoading(true);
    try {
      const response = await backend.container.listByLocation({ locationId });
      setContainers(response.containers);
    } catch (error) {
      console.error("Failed to load containers:", error);
      setContainers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = !locationId || locationId === "none" || containers.length === 0;

  return (
    <div className="space-y-2">
      <Label htmlFor="container">Container</Label>
      <Select 
        value={value} 
        onValueChange={onValueChange}
        disabled={isDisabled}
      >
        <SelectTrigger>
          <SelectValue 
            placeholder={
              !locationId || locationId === "none" 
                ? "Select a location first" 
                : isLoading 
                  ? "Loading containers..." 
                  : containers.length === 0 
                    ? "No containers" 
                    : "Select container (optional)"
            } 
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No container</SelectItem>
          {containers.map((container) => (
            <SelectItem key={container.id} value={container.id.toString()}>
              {container.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
