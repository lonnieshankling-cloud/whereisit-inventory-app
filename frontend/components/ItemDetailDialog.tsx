import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useBackend } from "@/lib/backend";
import { Edit2, FileText, Loader2, Minus, Package, Save, Shield, X } from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";
import type { ItemReceipt } from "~backend/item/add_receipt";
import type { Item } from "~backend/item/create";
import { ConsumptionHistory } from "./ConsumptionHistory";
import { LazyImage } from "./LazyImage";
import { ReceiptUploader } from "./ReceiptUploader";
import { ReceiptViewer } from "./ReceiptViewer";

interface ItemDetailDialogProps {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  onItemUpdated: () => void;
}

export function ItemDetailDialog({ item, open, onClose, onItemUpdated }: ItemDetailDialogProps) {
  const [consumedQuantity, setConsumedQuantity] = useState<string>("1");
  const [isRecording, setIsRecording] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editExpirationDate, setEditExpirationDate] = useState("");
  const [editPrivacyLevel, setEditPrivacyLevel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [receipts, setReceipts] = useState<ItemReceipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<ItemReceipt | null>(null);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseStore, setPurchaseStore] = useState("");
  const [warrantyUntil, setWarrantyUntil] = useState("");
  const backend = useBackend();
  const { toast } = useToast();

  useEffect(() => {
    if (item) {
      setEditName(item.name);
      setEditDescription(item.description || "");
      setEditQuantity(item.quantity.toString());
      setEditExpirationDate(item.expirationDate ? new Date(item.expirationDate).toISOString().split('T')[0] : "");
      setEditPrivacyLevel("household");
      setPurchaseDate((item as any).purchaseDate ? new Date((item as any).purchaseDate).toISOString().split('T')[0] : "");
      setPurchasePrice((item as any).purchasePrice?.toString() || "");
      setPurchaseStore((item as any).purchaseStore || "");
      setWarrantyUntil((item as any).warrantyUntil ? new Date((item as any).warrantyUntil).toISOString().split('T')[0] : "");
      loadReceipts();
    }
  }, [item]);

  const loadReceipts = async () => {
    if (!item) return;
    try {
      const response = await backend.item.listReceipts({ itemId: item.id });
      setReceipts(response.receipts);
    } catch (error) {
      console.error("Failed to load receipts:", error);
      setReceipts([]);
    }
  };

  if (!item) return null;

  const handleRecordConsumption = async () => {
    const quantity = parseInt(consumedQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid quantity greater than 0",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRecording(true);
      await backend.item.recordConsumption({
        itemId: item.id,
        consumedQuantity: quantity,
      });

      toast({
        title: "Consumption recorded",
        description: `Recorded ${quantity} item(s) consumed`,
      });

      setConsumedQuantity("1");
      onItemUpdated();
    } catch (error) {
      console.error("Failed to record consumption:", error);
      toast({
        title: "Error",
        description: "Failed to record consumption",
        variant: "destructive",
      });
    } finally {
      setIsRecording(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      toast({
        title: "Validation error",
        description: "Item name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      await backend.item.update({
        id: item.id,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        quantity: parseInt(editQuantity) || item.quantity,
        expirationDate: editExpirationDate ? new Date(editExpirationDate) : undefined,
      });

      toast({
        title: "Success",
        description: "Item updated successfully",
      });

      setIsEditing(false);
      onItemUpdated();
    } catch (error) {
      console.error("Failed to update item:", error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(item.name);
    setEditDescription(item.description || "");
    setEditQuantity(item.quantity.toString());
    setEditExpirationDate(item.expirationDate ? new Date(item.expirationDate).toISOString().split('T')[0] : "");
    setEditPrivacyLevel("household");
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle>{item.name}</DialogTitle>
              {item.description && (
                <DialogDescription>{item.description}</DialogDescription>
              )}
            </div>
            {!isEditing && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
            {item.photoUrl ? (
              <LazyImage
                src={item.photoUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="h-16 w-16 text-gray-300" />
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Item Name *</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-quantity">Quantity</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    min="0"
                    value={editQuantity}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditQuantity(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-expiration">Expiration Date</Label>
                  <Input
                    id="edit-expiration"
                    type="date"
                    value={editExpirationDate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditExpirationDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-privacy">Sharing</Label>
                <Select value={editPrivacyLevel} onValueChange={setEditPrivacyLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="household">Household</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="bg-[#FACC15] hover:bg-[#EAB308] text-[#111827]"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Current Quantity</Label>
                  <div className="text-2xl font-semibold text-[#111827]">{item.quantity}</div>
                </div>
                {item.expirationDate && (
                  <div>
                    <Label className="text-sm text-gray-600">Expiration Date</Label>
                    <div className="text-sm text-[#111827]">
                      {new Date(item.expirationDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>

              {(item.locationName || item.containerName) && (
                <div>
                  <Label className="text-sm text-gray-600">Location</Label>
                  <div className="text-sm text-[#111827]">
                    {item.locationName}
                    {item.containerName && ` > ${item.containerName}`}
                  </div>
                </div>
              )}
            </>
          )}

          {!isEditing && item.tags.length > 0 && (
            <div>
              <Label className="text-sm text-gray-600 mb-2">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!isEditing && (
            <div className="border-t pt-4">
              <Label className="text-sm font-semibold text-[#111827] mb-3">
                Record Consumption
              </Label>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label htmlFor="consumed-quantity" className="text-sm text-gray-600">
                    Quantity Used
                  </Label>
                  <Input
                    id="consumed-quantity"
                    type="number"
                    min="1"
                    value={consumedQuantity}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setConsumedQuantity(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleRecordConsumption}
                  disabled={isRecording}
                  className="bg-[#FACC15] hover:bg-[#EAB308] text-[#111827]"
                >
                  <Minus className="h-4 w-4 mr-2" />
                  Record
                </Button>
              </div>
            </div>
          )}

          {!isEditing && (
            <Accordion type="single" collapsible className="border-t">
              <AccordionItem value="receipts">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-semibold">Receipts & Warranty</span>
                    {receipts.length > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {receipts.length}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  {/* Purchase Details */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Purchase Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="purchase-date" className="text-xs">Purchase Date</Label>
                        <Input
                          id="purchase-date"
                          type="date"
                          value={purchaseDate}
                          onChange={(e) => setPurchaseDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="purchase-price" className="text-xs">Purchase Price</Label>
                        <Input
                          id="purchase-price"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={purchasePrice}
                          onChange={(e) => setPurchasePrice(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="purchase-store" className="text-xs">Store</Label>
                        <Input
                          id="purchase-store"
                          placeholder="e.g., Amazon, Best Buy"
                          value={purchaseStore}
                          onChange={(e) => setPurchaseStore(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="warranty-until" className="text-xs">Warranty Until</Label>
                        <Input
                          id="warranty-until"
                          type="date"
                          value={warrantyUntil}
                          onChange={(e) => setWarrantyUntil(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    {warrantyUntil && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700">
                          Warranty {new Date(warrantyUntil) > new Date() ? "active" : "expired"} until{" "}
                          {new Date(warrantyUntil).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Receipt Gallery */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Receipt Images</h4>
                    {receipts.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {receipts.map((receipt) => (
                          <div
                            key={receipt.id}
                            className="relative group cursor-pointer"
                            onClick={() => setSelectedReceipt(receipt)}
                          >
                            <img
                              src={receipt.thumbnailUrl || receipt.receiptUrl}
                              alt="Receipt"
                              className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:border-blue-500 transition-colors"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                              <FileText className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="absolute top-2 left-2 text-xs bg-black bg-opacity-60 text-white px-2 py-1 rounded capitalize">
                              {receipt.receiptType}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <ReceiptUploader itemId={item.id} onReceiptAdded={loadReceipts} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {!isEditing && (
            <div className="border-t pt-4">
              <ConsumptionHistory itemId={item.id} backend={backend} key={item.id} />
            </div>
          )}
        </div>
      </DialogContent>

      <ReceiptViewer
        receipt={selectedReceipt}
        open={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        onDeleted={loadReceipts}
      />
    </Dialog>
  );
}
