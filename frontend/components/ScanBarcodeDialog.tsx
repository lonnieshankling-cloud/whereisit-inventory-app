import { useState } from "react";
import Scanner from "react-qr-barcode-scanner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useBackend } from "@/lib/backend";

interface ScanBarcodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductFound: (productName: string) => void;
  onProductNotFound: () => void;
}

export function ScanBarcodeDialog({ 
  open, 
  onOpenChange, 
  onProductFound, 
  onProductNotFound 
}: ScanBarcodeDialogProps) {
  const backend = useBackend();
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);

  const handleScan = async (err: any, result: any) => {
    if (result && !scanned) {
      setScanned(true);
      setError(null);
      
      try {
        const data = await backend.item.lookupBarcode({ upc: result.text });
        onOpenChange(false);
        onProductFound(data.name);
      } catch (e: any) {
        setError(e.message || "Item not found for that barcode.");
        setScanned(false);
      }
    }
  };

  const handleClose = () => {
    setScanned(false);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="min-h-[300px] flex items-center justify-center">
            {!scanned && (
              <Scanner
                onUpdate={handleScan}
                width="100%"
                height={300}
              />
            )}
            {scanned && !error && (
              <p className="text-muted-foreground">Processing...</p>
            )}
          </div>
          <Button onClick={handleClose} variant="outline" className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
