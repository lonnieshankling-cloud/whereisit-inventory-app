import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AddItemDialog } from "./AddItemDialog";
import { theme } from "@/lib/theme";

export function AddItemButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
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
        <Plus className="h-5 w-5 mr-2" />
        Add Item
      </Button>

      <AddItemDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
