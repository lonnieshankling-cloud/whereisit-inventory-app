import { useState, useEffect, useRef } from "react";
import { Package, Trash2, Plus, Pencil, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/components/ui/use-toast";
import { useBackend } from "@/lib/backend";
import type { Location } from "~backend/location/create";

interface ManageContainersDialogProps {
  open: boolean;
  onClose: () => void;
  preselectedLocationId?: number;
  onContainerAdded?: () => void;
}

interface Container {
  id: number;
  name: string;
  locationId: number | null;
  locationName: string | null;
  photoUrl: string | null;
}

export function ManageContainersDialog({ open, onClose, preselectedLocationId, onContainerAdded }: ManageContainersDialogProps) {
  const [containers, setContainers] = useState<Container[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newContainerName, setNewContainerName] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [containerToDelete, setContainerToDelete] = useState<Container | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [editingContainer, setEditingContainer] = useState<Container | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocationId, setEditLocationId] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const backend = useBackend();

  useEffect(() => {
    if (open) {
      loadData();
      if (preselectedLocationId) {
        setSelectedLocationId(preselectedLocationId.toString());
      }
      setNameError(null);
      setLocationError(null);
    }
  }, [open, preselectedLocationId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [containersRes, locationsRes] = await Promise.all([
        backend.container.list(),
        backend.location.list(),
      ]);
      setContainers(containersRes.containers);
      setLocations(locationsRes.locations);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load containers and locations",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;

    if (!newContainerName.trim()) {
      setNameError("Container name is required");
      isValid = false;
    } else {
      setNameError(null);
    }

    if (!selectedLocationId) {
      setLocationError("Please select a location");
      isValid = false;
    } else {
      setLocationError(null);
    }

    return isValid;
  };

  const handleAddContainer = async () => {
    if (!validateForm()) {
      return;
    }

    setIsAdding(true);
    try {
      await backend.container.create({
        name: newContainerName.trim(),
        locationId: parseInt(selectedLocationId, 10),
      });
      setNewContainerName("");
      setSelectedLocationId("");
      setNameError(null);
      setLocationError(null);
      await loadData();
      if (onContainerAdded) {
        onContainerAdded();
      }
      toast({
        title: "Success",
        description: "Container added successfully",
      });
    } catch (error) {
      console.error("Failed to add container:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add container",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteContainer = async () => {
    if (!containerToDelete) return;

    setIsDeleting(true);
    try {
      await backend.container.deleteContainer({ id: containerToDelete.id.toString() });
      await loadData();
      toast({
        title: "Success",
        description: "Container deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete container:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete container",
      });
    } finally {
      setIsDeleting(false);
      setContainerToDelete(null);
    }
  };

  const handleEditContainer = (container: Container) => {
    setEditingContainer(container);
    setEditName(container.name);
    setEditLocationId(container.locationId?.toString() || "");
    setEditPhotoUrl(container.photoUrl);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select an image file",
      });
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64String = event.target?.result as string;
          const base64Data = base64String.split(",")[1];

          const response = await backend.container.uploadPhoto({
            filename: file.name,
            contentType: file.type,
            data: base64Data,
          });

          setEditPhotoUrl(response.url);
          toast({
            title: "Success",
            description: "Photo uploaded successfully",
          });
        } catch (error) {
          console.error("Failed to upload photo:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to upload photo",
          });
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Failed to read file:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to read file",
      });
      setIsUploading(false);
    }
  };

  const handleUpdateContainer = async () => {
    if (!editingContainer) return;

    setIsUpdating(true);
    try {
      await backend.container.update({
        id: editingContainer.id.toString(),
        name: editName,
        locationId: editLocationId ? parseInt(editLocationId, 10) : undefined,
        photoUrl: editPhotoUrl || undefined,
      });

      setEditingContainer(null);
      await loadData();
      toast({
        title: "Success",
        description: "Container updated successfully",
      });
    } catch (error) {
      console.error("Failed to update container:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update container",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const groupedContainers = containers.reduce((acc, container) => {
    const locationName = container.locationName || "Unknown Location";
    if (!acc[locationName]) {
      acc[locationName] = [];
    }
    acc[locationName].push(container);
    return acc;
  }, {} as Record<string, Container[]>);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Manage Containers
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-foreground">Add New Container</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="containerName">Container Name *</Label>
                  <Input
                    id="containerName"
                    placeholder="e.g., Top Shelf, Drawer 1, Storage Bin A"
                    value={newContainerName}
                    onChange={(e) => {
                      setNewContainerName(e.target.value);
                      if (e.target.value.trim()) {
                        setNameError(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newContainerName.trim() && selectedLocationId) {
                        handleAddContainer();
                      }
                    }}
                    className={nameError ? "border-red-500 focus-visible:ring-red-500" : ""}
                    aria-invalid={!!nameError}
                    aria-describedby={nameError ? "name-error" : undefined}
                  />
                  {nameError && (
                    <p id="name-error" className="text-sm text-red-600">
                      {nameError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Select 
                    value={selectedLocationId} 
                    onValueChange={(value) => {
                      setSelectedLocationId(value);
                      if (value) {
                        setLocationError(null);
                      }
                    }}
                  >
                    <SelectTrigger 
                      id="location"
                      className={locationError ? "border-red-500 focus:ring-red-500" : ""}
                      aria-invalid={!!locationError}
                      aria-describedby={locationError ? "location-error" : undefined}
                    >
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
                  {locationError && (
                    <p id="location-error" className="text-sm text-red-600">
                      {locationError}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleAddContainer}
                  disabled={isAdding}
                  className="w-full bg-[#FACC15] hover:bg-[#FACC15]/90 text-[#111827] font-semibold"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isAdding ? "Adding..." : "Add Container"}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Existing Containers</h3>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : containers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No containers yet. Add your first container above!
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.keys(groupedContainers)
                    .sort()
                    .map((locationName) => (
                      <div key={locationName} className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          {locationName}
                        </h4>
                        <div className="space-y-2">
                          {groupedContainers[locationName].map((container) => (
                            <div
                              key={container.id}
                              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md"
                            >
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-gray-400" />
                                <span className="font-medium text-foreground">
                                  {container.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditContainer(container)}
                                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setContainerToDelete(container)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!containerToDelete} onOpenChange={() => setContainerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Container</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{containerToDelete?.name}"? Items in this container
              will not be deleted, but they will no longer be associated with a container.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContainer}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingContainer} onOpenChange={() => setEditingContainer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Container</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Container Name</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editLocation">Location</Label>
              <Select value={editLocationId} onValueChange={setEditLocationId}>
                <SelectTrigger id="editLocation">
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
              <Label>Container Photo</Label>
              {editPhotoUrl && (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={editPhotoUrl}
                    alt="Container"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setEditPhotoUrl(null)}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? "Uploading..." : editPhotoUrl ? "Change Photo" : "Upload Photo"}
              </Button>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingContainer(null)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateContainer}
                disabled={isUpdating || !editName.trim()}
                className="bg-[#FACC15] hover:bg-[#FACC15]/90 text-[#111827] font-semibold"
              >
                {isUpdating ? "Updating..." : "Update Container"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
