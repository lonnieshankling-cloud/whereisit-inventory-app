import { useState, useEffect, useRef, ChangeEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useBackend } from "@/lib/backend";
import { Upload, X } from "lucide-react";
import type { Location } from "~backend/location/create";

interface ItemChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: string[];
}

export function ItemChecklistDialog({
  open,
  onOpenChange,
  items,
}: ItemChecklistDialogProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [itemsToAdd, setItemsToAdd] = useState<string[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const toggleItem = (item: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(item)) {
      newSelected.delete(item);
    } else {
      newSelected.add(item);
    }
    setSelectedItems(newSelected);
  };

  const handleConfirm = () => {
    const selected = Array.from(selectedItems);
    if (selected.length === 0) {
      onOpenChange(false);
      resetDialog();
      return;
    }
    
    setItemsToAdd(selected);
    setCurrentItemIndex(0);
    setShowAddDialog(true);
    onOpenChange(false);
  };

  const handleAddDialogClose = (dialogOpen: boolean) => {
    if (!dialogOpen) {
      if (currentItemIndex < itemsToAdd.length - 1) {
        setCurrentItemIndex(currentItemIndex + 1);
        setShowAddDialog(true);
      } else {
        resetDialog();
      }
    }
    setShowAddDialog(dialogOpen);
  };

  const resetDialog = () => {
    setSelectedItems(new Set());
    setItemsToAdd([]);
    setCurrentItemIndex(0);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detected Items</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select the items you want to add to your inventory:
            </p>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {items.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`item-${index}`}
                    checked={selectedItems.has(item)}
                    onCheckedChange={() => toggleItem(item)}
                  />
                  <Label
                    htmlFor={`item-${index}`}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {item}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetDialog();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedItems.size === 0}
              className="bg-[#FACC15] hover:bg-[#FACC15]/90 text-[#111827] font-semibold"
            >
              Add Selected ({selectedItems.size})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {itemsToAdd.length > 0 && (
        <AddItemDialogWithPrefill
          open={showAddDialog}
          onOpenChange={handleAddDialogClose}
          prefillName={itemsToAdd[currentItemIndex]}
          currentIndex={currentItemIndex}
          totalItems={itemsToAdd.length}
        />
      )}
    </>
  );
}

interface AddItemDialogWithPrefillProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillName: string;
  currentIndex: number;
  totalItems: number;
}

function AddItemDialogWithPrefill({
  open,
  onOpenChange,
  prefillName,
  currentIndex,
  totalItems,
}: AddItemDialogWithPrefillProps) {
  const [name, setName] = useState(prefillName);
  const [description, setDescription] = useState("");
  const [locationId, setLocationId] = useState<string>("");
  const [quantity, setQuantity] = useState("1");
  const [tags, setTags] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const backend = useBackend();

  useEffect(() => {
    if (open) {
      setName(prefillName);
      loadLocations();
    }
  }, [open, prefillName]);

  const loadLocations = async () => {
    try {
      const response = await backend.location.list();
      setLocations(response.locations);
    } catch (error) {
      console.error("Failed to load locations:", error);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please select an image file",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Image must be less than 5MB",
      });
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        const base64String = base64Data.split(",")[1];

        try {
          const response = await backend.item.uploadPhoto({
            filename: file.name,
            contentType: file.type,
            data: base64String,
          });

          setPhotoUrl(response.url);
          toast({
            title: "Success",
            description: "Photo uploaded successfully",
          });
        } catch (error) {
          console.error("Failed to upload photo:", error);
          toast({
            variant: "destructive",
            title: "Upload failed",
            description: "Failed to upload photo. Please try again.",
          });
        } finally {
          setUploading(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Failed to read file:", error);
      setUploading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to read file",
      });
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Item name is required",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsArray = tags
        .split(",")
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0);

      await backend.item.create({
        name: name.trim(),
        description: description.trim() || undefined,
        locationId: locationId && locationId !== "none" ? parseInt(locationId) : undefined,
        quantity: parseInt(quantity) || 1,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        photoUrl: photoUrl || undefined,
      });

      toast({
        title: "Success",
        description: `Item ${currentIndex + 1} of ${totalItems} added to inventory`,
      });

      setName("");
      setDescription("");
      setLocationId("");
      setQuantity("1");
      setTags("");
      setPhotoUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add item. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#111827]">
            Add Item {currentIndex + 1} of {totalItems}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder="e.g., Passport, Blender"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Photo</Label>
            {photoUrl ? (
              <div className="relative">
                <img
                  src={photoUrl}
                  alt="Item preview"
                  className="w-full h-32 object-cover rounded-md"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={handleRemovePhoto}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-md p-4 hover:border-gray-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="photo"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="photo"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    {uploading ? "Uploading..." : "Click to upload photo"}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">Max 5MB</span>
                </label>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No location</SelectItem>
                {locations.map((loc: any) => (
                  <SelectItem key={loc.id} value={loc.id.toString()}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)}
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTags(e.target.value)}
              placeholder="Comma separated tags"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#FACC15] hover:bg-[#FACC15]/90 text-[#111827] font-semibold"
          >
            {isSubmitting ? "Adding..." : "Add Item"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
