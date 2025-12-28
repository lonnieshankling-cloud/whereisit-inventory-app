import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBackend } from "@/lib/backend";
import { AlertTriangle, CheckCircle2, Clock, Heart, PackageOpen, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";

interface QuickAccessCardsProps {
  onCategorySelect: (category: string | null) => void;
  selectedCategory: string | null;
}

export function QuickAccessCards({ onCategorySelect, selectedCategory }: QuickAccessCardsProps) {
  const backend = useBackend();
  const [counts, setCounts] = useState<Record<string, number>>({
    unplaced: 0,
    recent: 0,
    expiring: 0,
    lowStock: 0,
    favorites: 0,
    needsConfirmation: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [unplaced, recent, expiring, lowStock, favorites, needsConfirmation] = await Promise.all([
          backend.item.listByPlacedStatus("not_placed", { limit: 1, offset: 0 }),
          backend.item.recent({ limit: 1, offset: 0 }),
          backend.item.expiring({ limit: 1, offset: 0 }),
          backend.item.lowStock({ limit: 1, offset: 0 }),
          backend.item.favorites({ limit: 1, offset: 0 }),
          backend.item.needsConfirmation({ limit: 1, offset: 0 }),
        ]);

        setCounts({
          unplaced: unplaced.total,
          recent: recent.total,
          expiring: expiring.total,
          lowStock: lowStock.total,
          favorites: favorites.total,
          needsConfirmation: needsConfirmation.total,
        });
      } catch (error) {
        console.error("Failed to fetch counts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCounts();
  }, [backend]);

  const cards = [
    {
      id: "unplaced",
      title: "Unassigned Items",
      count: counts.unplaced,
      icon: PackageOpen,
      color: "bg-gray-50 hover:bg-gray-100 border-gray-200",
      selectedColor: "bg-gray-100 border-gray-400",
    },
    {
      id: "recent",
      title: "Recently Added",
      count: counts.recent,
      icon: Clock,
      color: "bg-blue-50 hover:bg-blue-100 border-blue-200",
      selectedColor: "bg-blue-100 border-blue-400",
    },
    {
      id: "expiring",
      title: "Expiring Soon",
      count: counts.expiring,
      icon: AlertTriangle,
      color: "bg-amber-50 hover:bg-amber-100 border-amber-200",
      selectedColor: "bg-amber-100 border-amber-400",
    },
    {
      id: "lowStock",
      title: "Low Stock",
      count: counts.lowStock,
      icon: TrendingDown,
      color: "bg-orange-50 hover:bg-orange-100 border-orange-200",
      selectedColor: "bg-orange-100 border-orange-400",
    },
    {
      id: "favorites",
      title: "Favorite Items",
      count: counts.favorites,
      icon: Heart,
      color: "bg-pink-50 hover:bg-pink-100 border-pink-200",
      selectedColor: "bg-pink-100 border-pink-400",
    },
    {
      id: "needsConfirmation",
      title: "Needs Confirmation",
      count: counts.needsConfirmation,
      icon: CheckCircle2,
      color: "bg-purple-50 hover:bg-purple-100 border-purple-200",
      selectedColor: "bg-purple-100 border-purple-400",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedCategory === card.id;
        return (
          <Card
            key={card.id}
            className={`p-4 cursor-pointer transition-all border-2 ${
              isSelected ? card.selectedColor : card.color
            }`}
            onClick={() => onCategorySelect(isSelected ? null : card.id)}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-gray-600" />
                <span className="text-2xl font-bold text-gray-900">{card.count}</span>
              </div>
              <p className="text-sm font-medium text-gray-700">{card.title}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
