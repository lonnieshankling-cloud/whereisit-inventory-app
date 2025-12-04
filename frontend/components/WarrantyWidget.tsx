import { Card } from "@/components/ui/card";
import { useBackend } from "@/lib/backend";
import { theme } from "@/lib/theme";
import { AlertTriangle, ChevronRight, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import type { Item } from "~backend/item/create";

interface WarrantyItem extends Item {
  daysUntilExpiry?: number;
}

export function WarrantyWidget() {
  const [expiringItems, setExpiringItems] = useState<WarrantyItem[]>([]);
  const [itemsWithReceipts, setItemsWithReceipts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const backend = useBackend();

  useEffect(() => {
    loadWarrantyData();
  }, []);

  const loadWarrantyData = async () => {
    try {
      const response = await backend.item.listByPlacedStatus("all", {});
      const items = response.items;

      // Count items with receipts (we'll need to add a flag or check)
      const withReceipts = items.filter((item: any) => item.receiptUrl).length;
      setItemsWithReceipts(withReceipts);

      // Find items with expiring warranties (within 30 days)
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const expiring = items
        .filter((item: any) => {
          if (!item.warrantyUntil) return false;
          const warrantyDate = new Date(item.warrantyUntil);
          return warrantyDate >= today && warrantyDate <= thirtyDaysFromNow;
        })
        .map((item: any) => {
          const warrantyDate = new Date(item.warrantyUntil);
          const daysUntilExpiry = Math.ceil(
            (warrantyDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          return { ...item, daysUntilExpiry };
        })
        .sort((a, b) => (a.daysUntilExpiry || 0) - (b.daysUntilExpiry || 0));

      setExpiringItems(expiring.slice(0, 5)); // Show top 5
    } catch (error) {
      console.error("Failed to load warranty data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" style={{ color: theme.colors.brand.primary }} />
          Receipts & Warranties
        </h3>
      </div>

      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Items with Receipts</p>
            <p className="text-2xl font-bold" style={{ color: theme.colors.brand.primary }}>
              {itemsWithReceipts}
            </p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600">Expiring Soon</p>
            <p className="text-2xl font-bold" style={{ color: theme.colors.accent.amber }}>
              {expiringItems.length}
            </p>
          </div>
        </div>

        {/* Expiring Warranties */}
        {expiringItems.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" style={{ color: theme.colors.accent.amber }} />
              Warranties Expiring Soon
            </h4>
            <div className="space-y-2">
              {expiringItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-gray-600">
                      {item.daysUntilExpiry === 0
                        ? "Expires today"
                        : item.daysUntilExpiry === 1
                        ? "Expires tomorrow"
                        : `Expires in ${item.daysUntilExpiry} days`}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {expiringItems.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No warranties expiring soon</p>
          </div>
        )}
      </div>
    </Card>
  );
}
