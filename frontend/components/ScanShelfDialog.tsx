import { ContainerSelect } from "@/components/ContainerSelect";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useBackend } from "@/lib/backend";
import { useAuth } from "@clerk/clerk-react";
import { AlertCircle, Camera, Info, Loader2, Upload, X } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import type { Location } from "~backend/location/create";

interface AnalyzedItem {
  name: string;
  description: string;
  brand: string | null;
  color: string | null;
  size: string | null;
  quantity: number;
  expirationDate: string | null;
  category: string | null;
  notes: string | null;
  containerId?: number | null;
}

interface BookAnalysis {
  guessed_title: string;
  guessed_author: string;
  visual_signature: string;
  shelf_location: string;
  search_query: string;
}

interface ScanShelfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SelectedImage {
  file: File;
  previewUrl: string;
}

type AnalysisMode = 'items' | 'bookshelf';

export function ScanShelfDialog({ open, onOpenChange }: ScanShelfDialogProps) {
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('items');
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedItems, setDetectedItems] = useState<AnalyzedItem[]>([]);
  const [editedItems, setEditedItems] = useState<AnalyzedItem[]>([]);
  const [detectedBooks, setDetectedBooks] = useState<BookAnalysis[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [locationId, setLocationId] = useState<string>("");
  const [containerId, setContainerId] = useState<string>("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();
  const backend = useBackend();
  const { getToken } = useAuth();
  
  const API_BASE_URL = import.meta.env.VITE_CLIENT_TARGET || 'http://localhost:4000';

  const startCamera = async () => {
    setCameraError(null);
    setShowPermissionHelp(false);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("NotSupportedError: Camera API not supported");
      }
      
      let mediaStream: MediaStream | null = null;
      
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
        });
      } catch (envErr) {
        console.warn("Environment camera not available, trying default:", envErr);
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
        });
      }
      
      setStream(mediaStream);
      setShowCamera(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      
      let errorMsg = "Unable to access camera";
      let showHelp = false;
      
      if (err.name === "NotAllowedError") {
        alert("Camera access was denied. To use this feature, please allow camera permissions in your browser settings.");
        errorMsg = "Camera permission denied. Please allow camera access to take photos.";
        showHelp = true;
      } else if (err.message?.includes("Permission")) {
        errorMsg = "Camera permission denied. Please allow camera access to take photos.";
        showHelp = true;
      } else if (err.name === "NotFoundError") {
        errorMsg = "No camera found on this device.";
      } else if (err.name === "NotReadableError") {
        errorMsg = "Camera is already in use by another application.";
      } else if (err.name === "OverconstrainedError") {
        errorMsg = "Camera does not meet requirements. Try using the gallery instead.";
      } else if (err.message?.includes("not supported")) {
        errorMsg = "Camera not supported on this browser. Please use the gallery option.";
      } else if (err.message?.includes("Requested device not found")) {
        errorMsg = "No camera found on this device.";
      }
      
      setCameraError(errorMsg);
      setShowPermissionHelp(showHelp);
      
      toast({
        title: "Camera Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (open) {
      loadLocations();
    }
  }, [open]);

  useEffect(() => {
    if (stream && videoRef.current && showCamera) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.error("Error playing video:", err);
      });
    }
  }, [stream, showCamera]);

  useEffect(() => {
    return () => {
      selectedImages.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    };
  }, [selectedImages]);

  const loadLocations = async () => {
    try {
      const response = await backend.location.list();
      setLocations(response.locations);
    } catch (error) {
      console.error("Failed to load locations:", error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
            const previewUrl = URL.createObjectURL(blob);
            setSelectedImages((prev) => [...prev, { file, previewUrl }]);
          }
        }, "image/jpeg", 0.9);

        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      fileArray.forEach((file) => {
        const previewUrl = URL.createObjectURL(file);
        setSelectedImages((prev) => [...prev, { file, previewUrl }]);
      });
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const analyzeImages = async () => {
    if (selectedImages.length === 0) return;

    setIsAnalyzing(true);
    try {
      const imageUrls: string[] = [];
      
      for (const { file } of selectedImages) {
        const { uploadUrl, fileUrl } = await backend.image.getUploadUrl({
          filename: `shelf-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`,
          contentType: file.type,
        });
        
        await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });
        
        imageUrls.push(fileUrl);
      }

      if (analysisMode === 'bookshelf') {
        // Analyze as bookshelf
        const token = await getToken();
        const response = await fetch(`${API_BASE_URL}/items/analyze-bookshelf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ imageUrls }),
        });

        if (!response.ok) {
          throw new Error('Failed to analyze bookshelf');
        }

        const { books } = await response.json();
        
        if (books.length === 0) {
          toast({
            title: "No Books Found",
            description: "Could not identify any books in the images. Try clearer photos.",
            variant: "destructive",
          });
        } else {
          setDetectedBooks(books);
          toast({
            title: "Books Detected",
            description: `Found ${books.length} book${books.length !== 1 ? 's' : ''} on the shelf`,
          });
        }
      } else {
        // Analyze as regular items
        const response = await backend.item.analyzeShelf({ imageUrls });

        if (response.items.length === 0) {
          toast({
            title: "No Items Found",
            description: "Could not identify any items in the images. Try clearer photos.",
            variant: "destructive",
          });
        } else {
          setDetectedItems(response.items);
          setEditedItems(response.items);
        }
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Image Analysis Failed",
        description: "Image analysis failed. Please try a clearer picture.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAddItems = async () => {
    if (detectedItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const itemsWithContainer = editedItems.map(item => ({
        ...item,
        containerId: containerId && containerId !== "none" ? parseInt(containerId) : null,
      }));

      await backend.item.batchCreate({
        items: itemsWithContainer,
        locationId: locationId && locationId !== "none" ? parseInt(locationId) : undefined,
      });

      toast({
        title: "Success",
        description: `${detectedItems.length} item(s) added to inventory`,
      });

      resetDialog();
      onOpenChange(false);
      window.location.reload();
    } catch (error) {
      console.error("Failed to create items:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add items. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetDialog = () => {
    selectedImages.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    setSelectedImages([]);
    setDetectedItems([]);
    setEditedItems([]);
    setDetectedBooks([]);
    setLocationId("");
    setContainerId("");
    setCameraError(null);
    setShowPermissionHelp(false);
    setAnalysisMode('items');
    stopCamera();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetDialog();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scan a Shelf</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selector */}
          {detectedItems.length === 0 && detectedBooks.length === 0 && (
            <div className="space-y-2">
              <Label>Analysis Type</Label>
              <Select value={analysisMode} onValueChange={(value: AnalysisMode) => setAnalysisMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="items">General Items (food, supplies, etc.)</SelectItem>
                  <SelectItem value="bookshelf">Bookshelf (identify books by title/author)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {analysisMode === 'items' 
                  ? 'AI will identify items like food, cleaning supplies, and other household items.'
                  : 'AI will identify books by their title, author, and position on the shelf.'}
              </p>
            </div>
          )}

          {/* Bookshelf Results */}
          {detectedBooks.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  Found {detectedBooks.length} book{detectedBooks.length !== 1 ? 's' : ''}
                </p>
                <Button variant="outline" size="sm" onClick={resetDialog}>
                  Start Over
                </Button>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3">
                {detectedBooks.map((book, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-white shadow-sm space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {book.guessed_title || 'Unknown Title'}
                        </h4>
                        {book.guessed_author && (
                          <p className="text-sm text-gray-600 mt-1">
                            by {book.guessed_author}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded whitespace-nowrap">
                        {book.shelf_location}
                      </span>
                    </div>

                    {book.visual_signature && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-medium">Visual:</span>
                        <span>{book.visual_signature}</span>
                      </div>
                    )}
                    
                    {book.search_query && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-medium">Search:</span>
                        <span className="italic">{book.search_query}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : detectedItems.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Detected {detectedItems.length} item(s). Select a location and confirm to add them to your inventory:
              </p>

              <div className="max-h-96 overflow-y-auto space-y-4">
                {editedItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50 space-y-3">
                    <div className="font-semibold text-base">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.description}</div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`quantity-${index}`} className="text-xs">Quantity</Label>
                        <input
                          id={`quantity-${index}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[index].quantity = parseInt(e.target.value) || 1;
                            setEditedItems(newItems);
                          }}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`expiration-${index}`} className="text-xs">Expiration Date</Label>
                        <input
                          id={`expiration-${index}`}
                          type="date"
                          value={item.expirationDate || ""}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[index].expirationDate = e.target.value || null;
                            setEditedItems(newItems);
                          }}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`category-${index}`} className="text-xs">Category</Label>
                        <input
                          id={`category-${index}`}
                          type="text"
                          value={item.category || ""}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[index].category = e.target.value || null;
                            setEditedItems(newItems);
                          }}
                          placeholder="e.g., Dairy, Cleaning"
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <Label htmlFor={`notes-${index}`} className="text-xs">Notes</Label>
                        <input
                          id={`notes-${index}`}
                          type="text"
                          value={item.notes || ""}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[index].notes = e.target.value || null;
                            setEditedItems(newItems);
                          }}
                          placeholder="e.g., Top shelf, next to the milk"
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No location</SelectItem>
                    {locations.map((loc) => (
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

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={resetDialog}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmAddItems}
                  disabled={isSubmitting}
                  className="flex-1 bg-[#FACC15] hover:bg-[#FACC15]/90 text-[#111827] font-semibold"
                >
                  {isSubmitting ? "Adding..." : "Confirm & Add Items"}
                </Button>
              </div>
            </div>
          ) : !showCamera && selectedImages.length === 0 ? (
              <div className="flex flex-col gap-4">
                <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                    Camera access is needed to take photos of your shelf and identify items using AI.
                  </AlertDescription>
                </Alert>
                
                {cameraError && (
                  <div className="space-y-3">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {cameraError}
                      </AlertDescription>
                    </Alert>
                    
                    {showPermissionHelp && (
                      <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <AlertDescription className="text-sm text-yellow-900 dark:text-yellow-100">
                          <p className="font-semibold mb-2">To enable camera access:</p>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>Click the camera icon in your browser's address bar</li>
                            <li>Select "Allow" for camera permissions</li>
                            <li>Try taking a photo again</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
                
                <Button onClick={startCamera} className="w-full">
                  <Camera className="mr-2 h-5 w-5" />
                  Take Photo
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Select from Gallery
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            ) : showCamera ? (
              <div className="space-y-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 rounded-lg bg-black object-cover"
                />
                <div className="flex gap-2">
                  <Button onClick={capturePhoto} className="flex-1">
                    <Camera className="mr-2 h-5 w-5" />
                    Capture Photo
                  </Button>
                  <Button onClick={stopCamera} variant="outline">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : selectedImages.length > 0 && !showCamera ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {selectedImages.map(({ previewUrl }, index) => (
                    <div key={index} className="relative">
                      <img
                        src={previewUrl}
                        alt={`Selected ${index + 1}`}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={startCamera}
                    variant="outline"
                    className="flex-1"
                  >
                    <Camera className="mr-2 h-5 w-5" />
                    Add More
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="flex-1"
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Add from Gallery
                  </Button>
                </div>

                <Button
                  onClick={analyzeImages}
                  disabled={isAnalyzing}
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing {selectedImages.length} {selectedImages.length === 1 ? "photo" : "photos"}...
                    </>
                  ) : (
                    `Submit ${selectedImages.length} ${selectedImages.length === 1 ? "Photo" : "Photos"}`
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    );
}
