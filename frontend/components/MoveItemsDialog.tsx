import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useBackend } from "@/lib/backend";

interface MoveItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItemIds: number[];
  onMoveComplete: () => void;
}

export function MoveItemsDialog({
  open,
  onOpenChange,
  selectedItemIds,
  onMoveComplete,
}: MoveItemsDialogProps) {
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);
  const [containers, setContainers] = useState<{ id: number; name: string }[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [selectedContainerId, setSelectedContainerId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingContainers, setIsLoadingContainers] = useState(false);
  const { toast } = useToast();
  const backend = useBackend();

  useEffect(() => {
    if (open) {
      loadLocations();
    } else {
      setSelectedLocationId("");
      setSelectedContainerId("");
      setContainers([]);
    }
  }, [open]);

  useEffect(() => {
    if (selectedLocationId) {
      loadContainers(selectedLocationId);
    } else {
      setContainers([]);
      setSelectedContainerId("");
    }
  }, [selectedLocationId]);

  const loadLocations = async () => {
    try {
      const response = await backend.location.list();
      setLocations(response.locations);
    } catch (error) {
      console.error("Failed to load locations:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load locations",
      });
    }
  };

  const loadContainers = async (locationId: string) => {
    setIsLoadingContainers(true);
    try {
      const response = await backend.container.listByLocation({ locationId });
      setContainers(response.containers);
    } catch (error) {
      console.error("Failed to load containers:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load containers",
      });
    } finally {
      setIsLoadingContainers(false);
    }
  };

  const handleConfirmMove = async () => {
    if (!selectedLocationId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a location",
      });
      return;
    }

    setIsLoading(true);
    try {
      const containerId = selectedContainerId ? parseInt(selectedContainerId) : null;
      await backend.item.bulkUpdateLocation({
        itemIds: selectedItemIds,
        locationId: parseInt(selectedLocationId),
        containerId,
      });

      toast({
        title: "Success",
        description: `${selectedItemIds.length} item(s) moved successfully`,
      });

      onMoveComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to move items:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to move items",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Items</DialogTitle>
          <DialogDescription>
            Move {selectedItemIds.length} selected item(s) to a new location
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Location *</label>
            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id.toString()}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Container (Optional)</label>
            <Select
              value={selectedContainerId}
              onValueChange={setSelectedContainerId}
              disabled={!selectedLocationId || isLoadingContainers}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedLocationId
                    ? "Select a location first"
                    : isLoadingContainers
                    ? "Loading containers..."
                    : containers.length === 0
                    ? "No containers in this location"
                    : "Select a container (or leave empty)"
                } />
              </SelectTrigger>
              <SelectContent>
                {containers.map((container) => (
                  <SelectItem key={container.id} value={container.id.toString()}>
                    {container.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirmMove} disabled={isLoading || !selectedLocationId}>
            {isLoading ? "Moving..." : "Confirm Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
