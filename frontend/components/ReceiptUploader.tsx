import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useBackend } from "@/lib/backend";
import imageCompression from "browser-image-compression";
import { Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

interface ReceiptUploaderProps {
  itemId: number;
  onReceiptAdded: () => void;
}

export function ReceiptUploader({ itemId, onReceiptAdded }: ReceiptUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [receiptType, setReceiptType] = useState("purchase");
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const backend = useBackend();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) return;

    const file = fileInputRef.current.files[0];
    
    setIsUploading(true);
    try {
      // Compress image
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });

      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(compressed);
      
      reader.onloadend = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          
          // Step 1: Upload image and get URLs
          const { receiptUrl, thumbnailUrl } = await backend.item.uploadReceipt({
            base64Image: base64,
          });

          // Step 2: Extract data with OCR
          const extractedData = await backend.item.extractReceiptData({
            imageUrl: receiptUrl,
          });

          // Step 3: Save receipt with extracted data
          await backend.item.addReceipt({
            itemId,
            receiptUrl,
            thumbnailUrl,
            receiptType: receiptType as "purchase" | "warranty" | "repair" | "upgrade",
            description: description || undefined,
            extractedDate: extractedData.extractedDate || undefined,
            extractedPrice: extractedData.extractedPrice || undefined,
            extractedStore: extractedData.extractedStore || undefined,
          });

          toast({
            title: "Receipt saved",
            description: extractedData.extractedStore 
              ? `Receipt from ${extractedData.extractedStore} added successfully`
              : "Receipt has been added to this item",
          });

          // Reset form
          setPreview(null);
          setDescription("");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }

          onReceiptAdded();
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          throw uploadError;
        }
      };
    } catch (error) {
      console.error("Failed to upload receipt:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload receipt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Receipt Type</Label>
        <Select value={receiptType} onValueChange={setReceiptType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="purchase">Purchase Receipt</SelectItem>
            <SelectItem value="warranty">Warranty Document</SelectItem>
            <SelectItem value="repair">Repair Receipt</SelectItem>
            <SelectItem value="upgrade">Upgrade Receipt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="receipt-description">Description (Optional)</Label>
        <Textarea
          id="receipt-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add notes about this receipt..."
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="receipt-file">Select Receipt Image</Label>
        <Input
          id="receipt-file"
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="mt-2"
        />
      </div>

      {preview && (
        <div className="relative">
          <img 
            src={preview} 
            alt="Receipt preview" 
            className="w-full max-h-64 object-contain rounded-lg border"
          />
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => {
              setPreview(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={!preview || isUploading}
        className="w-full"
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload Receipt
          </>
        )}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        Images are automatically compressed and processed with OCR to extract purchase details
      </p>
    </div>
  );
}
