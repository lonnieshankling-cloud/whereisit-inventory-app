import { useState, memo } from "react";
import type { Location } from "~backend/location/create";
import type { Item } from "~backend/item/create";
import { ContainerList, ContainerWithItems } from "./ContainerList";
import { ItemList } from "./ItemList";
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
import { Trash2, Plus } from "lucide-react";

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
                  {onAddContainer && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddContainerClick}
                      className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600"
                      title="Add container to this location"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteClick}
                      className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
