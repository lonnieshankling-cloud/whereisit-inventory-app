import { useState } from "react";
import { ScanLine, Camera, ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScanShelfDialog } from "./ScanShelfDialog";
import { ScanBarcodeDialog } from "./ScanBarcodeDialog";

export const ScanButton = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scanShelfDialogOpen, setScanShelfDialogOpen] = useState(false);
  const [scanBarcodeDialogOpen, setScanBarcodeDialogOpen] = useState(false);

  const handleScanShelf = () => {
    setSheetOpen(false);
    setScanShelfDialogOpen(true);
  };

  const handleScanBarcode = () => {
    setSheetOpen(false);
    setScanBarcodeDialogOpen(true);
  };

  const handleProductFound = (productName: string) => {
    console.log("Product found:", productName);
  };

  const handleProductNotFound = () => {
    console.log("Product not found");
  };

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline">
            <ScanLine className="h-4 w-4 mr-2" />
            Scan
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-w-md mx-auto rounded-t-lg">
          <SheetHeader>
            <SheetTitle>Choose Scan Type</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              variant="outline"
              size="lg"
              className="justify-start h-auto py-4"
              onClick={handleScanShelf}
            >
              <Camera className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Scan Shelf</div>
                <div className="text-sm text-muted-foreground">
                  Take a photo of your shelf to add multiple items
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="justify-start h-auto py-4"
              onClick={handleScanBarcode}
            >
              <ScanBarcode className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Scan Barcode</div>
                <div className="text-sm text-muted-foreground">
                  Scan a product barcode to quickly add an item
                </div>
              </div>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ScanShelfDialog
        open={scanShelfDialogOpen}
        onOpenChange={setScanShelfDialogOpen}
      />
      <ScanBarcodeDialog
        open={scanBarcodeDialogOpen}
        onOpenChange={setScanBarcodeDialogOpen}
        onProductFound={handleProductFound}
        onProductNotFound={handleProductNotFound}
      />
    </>
  );
};
