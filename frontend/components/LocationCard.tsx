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
import { Card } from "@/components/ui/card";
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
import { theme } from "@/lib/theme";
import { Edit2, MapPin, Package, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { EmojiPicker } from "./EmojiPicker";
import type { LocationWithContainers } from "./LocationAccordion";

interface LocationCardProps {
  location: LocationWithContainers;
  icon?: string;
  onIconChange: (icon: string) => void;
  onDelete: (locationId: number) => void;
  onAddContainer: (locationId: number) => void;
  onItemUpdated: () => void;
}

export function LocationCard({
  location,
  icon,
  onIconChange,
  onDelete,
  onAddContainer,
  onItemUpdated,
}: LocationCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [newName, setNewName] = useState(location.name);
  const [isRenaming, setIsRenaming] = useState(false);
  const { toast } = useToast();
  const backend = useBackend();
  const isNotPlaced = location.id === -1;

  const totalItems = (location.directItems?.length || 0) +
    location.containers.reduce((sum, c) => sum + (c.items?.length || 0), 0);

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
      onItemUpdated();
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

  const handleDelete = () => {
    onDelete(location.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card
        className="relative overflow-hidden cursor-pointer group"
        style={{
          transition: `all ${theme.transitions.base}`,
          borderColor: theme.colors.surface.gray200,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = theme.shadows.md;
          e.currentTarget.style.borderColor = theme.colors.brand.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = theme.shadows.sm;
          e.currentTarget.style.borderColor = theme.colors.surface.gray200;
        }}
      >
        <div className="p-6">
          {/* Header with Icon and Actions */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => !isNotPlaced && setShowEmojiPicker(true)}
                className={`text-4xl ${!isNotPlaced ? "hover:scale-110 transition-transform" : ""}`}
                disabled={isNotPlaced}
                title={isNotPlaced ? "" : "Change icon"}
              >
                {icon || "📍"}
              </button>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: theme.colors.text.primary }}>
                  {location.name}
                </h3>
                <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                  {totalItems} {totalItems === 1 ? "item" : "items"}
                </p>
              </div>
            </div>
            {!isNotPlaced && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNewName(location.name);
                    setShowRenameDialog(true);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                  className="h-8 w-8 p-0 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" style={{ color: theme.colors.text.secondary }} />
              <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                {location.containers.length} {location.containers.length === 1 ? "container" : "containers"}
              </span>
            </div>
            {location.directItems && location.directItems.length > 0 && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" style={{ color: theme.colors.text.secondary }} />
                <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                  {location.directItems.length} direct
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min((totalItems / 50) * 100, 100)}%`,
                  background: theme.colors.gradient.primary,
                }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: theme.colors.text.muted }}>
              {totalItems} / 50 capacity
            </p>
          </div>

          {/* Actions */}
          {!isNotPlaced && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAddContainer(location.id);
              }}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Container
            </Button>
          )}
        </div>
      </Card>

      {/* Rename Dialog */}
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

      {/* Delete Dialog */}
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
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Emoji Picker */}
      <EmojiPicker
        open={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={onIconChange}
        currentEmoji={icon}
      />
    </>
  );
}
