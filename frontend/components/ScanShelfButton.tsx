import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { ScanShelfDialog } from "./ScanShelfDialog";
import { theme } from "@/lib/theme";

export function ScanShelfButton() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        className="font-semibold"
        style={{
          backgroundColor: theme.colors.brand.primary,
          color: theme.colors.text.primary,
          fontWeight: theme.typography.fontWeight.semibold
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.brand.primaryHover}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.brand.primary}
      >
        <Camera className="mr-2 h-5 w-5" />
        Scan Shelf
      </Button>
      
      <ScanShelfDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
