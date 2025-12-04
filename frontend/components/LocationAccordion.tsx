import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useBackend } from "@/lib/backend";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { memo, useState } from "react";
import type { Item } from "~backend/item/create";
import type { Location } from "~backend/location/create";
import { ContainerList, ContainerWithItems } from "./ContainerList";
import { ItemList } from "./ItemList";

export type LocationWithContainers = Location & {
  containers: ContainerWithItems[];
  directItems?: Item[];
};

interface LocationAccordionProps {
  location: LocationWithContainers;
  onDelete?: (locationId: number) => void;
  onAddContainer?: (locationId: number) => void;
  onItemUpdated?: () => void;
  searchQuery?: string;
}

export const LocationAccordion = memo(function LocationAccordion({ location, onDelete, onAddContainer, onItemUpdated, searchQuery = "" }: LocationAccordionProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newName, setNewName] = useState(location.name);
  const [isRenaming, setIsRenaming] = useState(false);
  const { toast } = useToast();
  const backend = useBackend();
  const isNotPlaced = location.id === -1;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleAddContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddContainer) {
      onAddContainer(location.id);
    }
  };

  const handleRenameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNewName(location.name);
    setShowRenameDialog(true);
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === location.name) {
      setShowRenameDialog(false);
      return;
    }

    setIsRenaming(true);
    try {
      await backend.location.update(location.id, { name: newName.trim() });
      toast({
        title: "Success",
        description: "Location renamed successfully",
      });
      setShowRenameDialog(false);
      if (onItemUpdated) {
        onItemUpdated();
      }
    } catch (error) {
      console.error("Failed to rename location:", error);
      toast({
        title: "Error",
        description: "Failed to rename location",
        variant: "destructive",
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(location.id);
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={location.id.toString()}>
          <AccordionTrigger className="hover:no-underline">
            <div className="flex justify-between w-full pr-4">
              <span className="font-semibold text-lg">{location.name}</span>
              {!isNotPlaced && (
                <div className="flex gap-2">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={handleRenameClick}
                    onKeyDown={(e) => e.key === 'Enter' && handleRenameClick(e as any)}
                    className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md hover:bg-blue-100 hover:text-blue-600 cursor-pointer"
                    title="Rename this location"
                  >
                    <Edit2 className="h-4 w-4" />
                  </div>
                  {onAddContainer && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={handleAddContainerClick}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddContainerClick(e as any)}
                      className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md hover:bg-green-100 hover:text-green-600 cursor-pointer"
                      title="Add container to this location"
                    >
                      <Plus className="h-4 w-4" />
                    </div>
                  )}
                  {onDelete && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={handleDeleteClick}
                      onKeyDown={(e) => e.key === 'Enter' && handleDeleteClick(e as any)}
                      className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md hover:bg-red-100 hover:text-red-600 cursor-pointer"
                      title="Delete this location"
                    >
                      <Trash2 className="h-4 w-4" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pl-4">
            <div className="space-y-4">
              {location.directItems && location.directItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Items in this location</h4>
                  <ItemList items={location.directItems} onItemUpdated={onItemUpdated} searchQuery={searchQuery} />
                </div>
              )}
              {location.containers && location.containers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Containers</h4>
                  <ContainerList containers={location.containers} onItemUpdated={onItemUpdated} searchQuery={searchQuery} />
                </div>
              )}
              {(!location.directItems || location.directItems.length === 0) && (!location.containers || location.containers.length === 0) && (
                <p className="text-sm text-gray-500">No items or containers in this location</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Location</DialogTitle>
            <DialogDescription>
              Enter a new name for "{location.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="location-name">Location Name</Label>
            <Input
              id="location-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              placeholder="Enter location name"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isRenaming || !newName.trim()}>
              {isRenaming ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{location.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
