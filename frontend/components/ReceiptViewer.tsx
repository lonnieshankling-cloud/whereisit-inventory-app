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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useBackend } from "@/lib/backend";
import { Calendar, DollarSign, Download, Store, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import type { ItemReceipt } from "~backend/item/add_receipt";

interface ReceiptViewerProps {
  receipt: ItemReceipt | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function ReceiptViewer({ receipt, open, onClose, onDeleted }: ReceiptViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const backend = useBackend();

  if (!receipt) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = receipt.receiptUrl;
    link.download = `receipt-${receipt.id}.webp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await backend.item.deleteReceipt(receipt.id);
      toast({
        title: "Receipt deleted",
        description: "Receipt has been removed",
      });
      setShowDeleteConfirm(false);
      onDeleted();
      onClose();
    } catch (error) {
      console.error("Failed to delete receipt:", error);
      toast({
        title: "Error",
        description: "Failed to delete receipt",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Extracted Data */}
            {(receipt.extractedStore || receipt.extractedDate || receipt.extractedPrice) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                {receipt.extractedStore && (
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-600">Store</p>
                      <p className="font-semibold">{receipt.extractedStore}</p>
                    </div>
                  </div>
                )}
                {receipt.extractedDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-600">Date</p>
                      <p className="font-semibold">
                        {new Date(receipt.extractedDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                {receipt.extractedPrice && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-600">Price</p>
                      <p className="font-semibold">${receipt.extractedPrice.toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Receipt Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Type:</span>
                <span className="text-sm capitalize px-2 py-1 bg-gray-100 rounded">
                  {receipt.receiptType}
                </span>
              </div>
              {receipt.description && (
                <div>
                  <span className="text-sm font-medium">Description:</span>
                  <p className="text-sm text-gray-600 mt-1">{receipt.description}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uploaded:</span>
                <span className="text-sm text-gray-600">
                  {new Date(receipt.uploadedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Image Controls */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.max(50, zoom - 25))}
                  disabled={zoom <= 50}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm px-3 py-2">{zoom}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.min(200, zoom + 25))}
                  disabled={zoom >= 200}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Receipt Image */}
            <div className="overflow-auto max-h-[500px] border rounded-lg p-4 bg-gray-50">
              <img
                src={receipt.receiptUrl}
                alt="Receipt"
                style={{ width: `${zoom}%` }}
                className="mx-auto"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this receipt. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
