import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Barcode } from "lucide-react";
import { ScanBarcodeDialog } from "./ScanBarcodeDialog";
import { AddItemDialog } from "./AddItemDialog";
import { useToast } from "@/components/ui/use-toast";
import { theme } from "@/lib/theme";

export function ScanBarcodeButton() {
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [productName, setProductName] = useState<string>("");
  const { toast } = useToast();

  const handleProductFound = (name: string) => {
    setProductName(name);
    setAddDialogOpen(true);
  };

  const handleProductNotFound = () => {
    toast({
      title: "Product not found",
      duration: 3000,
    });
  };

  return (
    <>
      <Button
        onClick={() => setScanDialogOpen(true)}
        className="font-semibold"
        style={{
          backgroundColor: theme.colors.brand.primary,
          color: theme.colors.text.primary,
          height: theme.layout.buttonHeight.large,
          padding: theme.layout.buttonPadding.default,
          fontWeight: theme.typography.fontWeight.semibold
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.brand.primaryHover}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.brand.primary}
      >
        <Barcode className="mr-2 h-5 w-5" />
        Scan Barcode
      </Button>
      
      <ScanBarcodeDialog 
        open={scanDialogOpen} 
        onOpenChange={setScanDialogOpen}
        onProductFound={handleProductFound}
        onProductNotFound={handleProductNotFound}
      />
      
      <AddItemDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen}
        initialName={productName}
      />
    </>
  );
}
