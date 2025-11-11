import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBackend } from "@/lib/backend";
import { useToast } from "@/components/ui/use-toast";
import type { Item } from "~backend/item/create";
import type { Container } from "~backend/container/api";
import type { Location } from "~backend/location/create";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface EditItemDialogProps {
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemUpdated: () => void;
}

export function EditItemDialog({ item, open, onOpenChange, onItemUpdated }: EditItemDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [tags, setTags] = useState("");
  const [locationId, setLocationId] = useState<string>("");
  const [containerId, setContainerId] = useState<string>("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewContainer, setShowNewContainer] = useState(false);
  const [newContainerName, setNewContainerName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const backend = useBackend();
  const { toast } = useToast();

  useEffect(() => {
    if (item && open) {
      setName(item.name);
      setDescription(item.description || "");
      setQuantity(item.quantity);
      setTags(item.tags.join(", "));
      setLocationId(item.locationId?.toString() || "unplaced");
      setContainerId(item.containerId?.toString() || "none");
      loadLocations();
      loadContainers();
    }
  }, [item, open]);

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

  const loadContainers = async () => {
    try {
      const response = await backend.container.list();
      setContainers(response.containers);
    } catch (error) {
      console.error("Failed to load containers:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load containers",
      });
    }
  };

  const handleCreateContainer = async () => {
    if (!newContainerName.trim() || !item) return;

    try {
      if (!locationId || locationId === "unplaced") {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Item must be assigned to a location before adding a container",
        });
        return;
      }

      const newContainer = await backend.container.create({
        name: newContainerName.trim(),
        locationId: parseInt(locationId, 10),
      });

      setContainers([...containers, newContainer]);
      setContainerId(newContainer.id.toString());
      setNewContainerName("");
      setShowNewContainer(false);

      toast({
        title: "Success",
        description: "Container created successfully",
      });
    } catch (error) {
      console.error("Failed to create container:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create container",
      });
    }
  };

  const handleSubmit = async () => {
    if (!item) return;

    setIsLoading(true);
    try {
      const tagArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      await backend.item.update({
        id: item.id,
        name,
        description,
        quantity,
        tags: tagArray,
        locationId: locationId === "unplaced" ? null : parseInt(locationId, 10),
        containerId: containerId === "none" ? null : parseInt(containerId, 10),
      });

      toast({
        title: "Success",
        description: "Item updated successfully",
      });

      onItemUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update item",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    setIsDeleting(true);
    try {
      await backend.item.deleteItem({ id: item.id });
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
      onItemUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete item",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Item description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select
              value={locationId}
              onValueChange={(value) => {
                setLocationId(value);
                if (value === "unplaced") {
                  setContainerId("none");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unplaced">Unplaced</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id.toString()}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="container">Container</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1"
                onClick={() => setShowNewContainer(!showNewContainer)}
              >
                <Plus className="h-4 w-4" />
                {showNewContainer ? "Cancel" : "Add New"}
              </Button>
            </div>

            {showNewContainer ? (
              <div className="flex gap-2">
                <Input
                  value={newContainerName}
                  onChange={(e) => setNewContainerName(e.target.value)}
                  placeholder="New container name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateContainer();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleCreateContainer}
                  disabled={!newContainerName.trim()}
                >
                  Create
                </Button>
              </div>
            ) : (
              <Select
                value={containerId}
                onValueChange={setContainerId}
                disabled={locationId === "unplaced"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select container" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {containers
                    .filter((container) => {
                      if (locationId === "unplaced") return false;
                      return container.locationId?.toString() === locationId;
                    })
                    .map((container) => (
                      <SelectItem key={container.id} value={container.id.toString()}>
                        {container.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            className="mr-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || !name.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{item?.name}" from your inventory.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
