import { useState, useEffect, useRef, ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useBackend } from "@/lib/backend";
import type { Location } from "~backend/location/create";
import { Upload, X, Loader2 } from "lucide-react";
import { compressImage } from "@/lib/imageCompression";
import { ContainerSelect } from "./ContainerSelect";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
}

export function AddItemDialog({ open, onOpenChange, initialName }: AddItemDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locationId, setLocationId] = useState<string>("");
  const [containerId, setContainerId] = useState<string>("");
  const [quantity, setQuantity] = useState("1");
  const [expirationDate, setExpirationDate] = useState("");
  const [tags, setTags] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState("household");
  const [locations, setLocations] = useState<Location[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const backend = useBackend();

  useEffect(() => {
    if (open) {
      loadLocations();
      if (initialName) {
        setName(initialName);
      }
      setNameError(null);
      setQuantityError(null);
    }
  }, [open, initialName]);

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
      const compressedFile = await compressImage(file);

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        const base64String = base64Data.split(",")[1];

        try {
          const response = await backend.item.uploadPhoto({
            filename: file.name,
            contentType: compressedFile.type,
            data: base64String,
          });

          setPhotoUrl(response.url);
          setThumbnailUrl(response.thumbnailUrl);
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

      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Failed to read file:", error);
      setUploading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to compress or read file",
      });
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(null);
    setThumbnailUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;

    if (!name.trim()) {
      setNameError("Item name is required");
      isValid = false;
    } else {
      setNameError(null);
    }

    const quantityNum = parseInt(quantity);
    if (!quantity || isNaN(quantityNum) || quantityNum < 1) {
      setQuantityError("Quantity must be at least 1");
      isValid = false;
    } else {
      setQuantityError(null);
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const tagsArray = tags
        .split(",")
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0);

      await backend.item.create({
        name: name.trim(),
        description: description.trim() || undefined,
        locationId: locationId && locationId !== "none" ? parseInt(locationId) : undefined,
        containerId: containerId && containerId !== "none" ? parseInt(containerId) : undefined,
        quantity: parseInt(quantity) || 1,
        expirationDate: expirationDate || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        photoUrl: photoUrl || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
      });

      toast({
        title: "Success",
        description: "Item added to inventory",
      });

      setName("");
      setDescription("");
      setLocationId("");
      setContainerId("");
      setQuantity("1");
      setExpirationDate("");
      setTags("");
      setPrivacyLevel("household");
      setPhotoUrl(null);
      setThumbnailUrl(null);
      setSubmitError(null);
      setNameError(null);
      setQuantityError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create item:", error);
      setSubmitError("Could not add item. Please try again.");
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
          <DialogTitle className="text-[#111827]">Add New Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setName(e.target.value);
                if (e.target.value.trim()) {
                  setNameError(null);
                }
              }}
              placeholder="e.g., Passport, Blender"
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
                  <span className="text-xs text-gray-500 mt-1">
                    Max 5MB
                  </span>
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

          <ContainerSelect
            locationId={locationId}
            value={containerId}
            onValueChange={setContainerId}
          />

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setQuantity(e.target.value);
                const num = parseInt(e.target.value);
                if (e.target.value && !isNaN(num) && num >= 1) {
                  setQuantityError(null);
                }
              }}
              min="1"
              className={quantityError ? "border-red-500 focus-visible:ring-red-500" : ""}
              aria-invalid={!!quantityError}
              aria-describedby={quantityError ? "quantity-error" : undefined}
            />
            {quantityError && (
              <p id="quantity-error" className="text-sm text-red-600">
                {quantityError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expirationDate">Expiration Date</Label>
            <Input
              id="expirationDate"
              type="date"
              value={expirationDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setExpirationDate(e.target.value)}
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

          <div className="space-y-2">
            <Label htmlFor="privacy">Sharing</Label>
            <Select value={privacyLevel} onValueChange={setPrivacyLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="household">Household</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {submitError && (
          <div style={{ color: 'red', fontSize: '14px', marginTop: '8px', padding: '8px', backgroundColor: '#fee', borderRadius: '4px' }}>
            {submitError}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#FACC15] hover:bg-[#FACC15]/90 text-[#111827] font-semibold"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? "Adding..." : "Add Item"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
