import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBackend } from "@/lib/backend";
import { theme } from "@/lib/theme";
import { AlertTriangle, Clock, MapPin, Package, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";

interface DashboardStats {
  totalItems: number;
  totalLocations: number;
  totalMembers: number;
  recentlyAdded: number;
  expiringSoon: number;
  lowStock: number;
}

export function DashboardStats() {
  const backend = useBackend();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [items, locations, household, recent, expiring, lowStock] = await Promise.all([
        backend.item.listByPlacedStatus("all", {}),
        backend.location.list(),
        backend.household.get(),
        backend.item.recent({ limit: 1, offset: 0 }),
        backend.item.expiring({ limit: 1, offset: 0 }),
        backend.item.lowStock({ limit: 1, offset: 0 }),
      ]);

      let memberCount = 1;
      if (household.household) {
        const members = await backend.household.getMembers();
        memberCount = members.members.length;
      }

      // Extract first name from user ID (typically email)
      const userId = household.current_user_id || "";
      const name = userId.split("@")[0] || userId;
      setUserName(name.charAt(0).toUpperCase() + name.slice(1));

      setStats({
        totalItems: items.items.length,
        totalLocations: locations.locations.length,
        totalMembers: memberCount,
        recentlyAdded: recent.total,
        expiringSoon: expiring.total,
        lowStock: lowStock.total,
      });
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Items",
      value: stats?.totalItems || 0,
      icon: Package,
      color: theme.colors.brand.primary,
      bg: theme.colors.brand.lightest,
    },
    {
      title: "Locations",
      value: stats?.totalLocations || 0,
      icon: MapPin,
      color: theme.colors.accent.emerald,
      bg: "#D1FAE5",
    },
    {
      title: "Household Members",
      value: stats?.totalMembers || 0,
      icon: Users,
      color: theme.colors.accent.purple,
      bg: "#F3E8FF",
    },
    {
      title: "Recently Added",
      value: stats?.recentlyAdded || 0,
      icon: Clock,
      color: theme.colors.accent.blue,
      bg: "#DBEAFE",
    },
    {
      title: "Expiring Soon",
      value: stats?.expiringSoon || 0,
      icon: AlertTriangle,
      color: theme.colors.status.warning,
      bg: "#FEF3C7",
    },
    {
      title: "Low Stock",
      value: stats?.lowStock || 0,
      icon: TrendingUp,
      color: theme.colors.status.error,
      bg: "#FEE2E2",
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {getGreeting()}, {userName}!
        </h2>
        <p className="text-gray-600">
          Here's an overview of your inventory
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer border-0"
              style={{ boxShadow: theme.shadows.base }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-sm font-medium">
                    {stat.title}
                  </CardDescription>
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: stat.bg }}
                  >
                    <Icon className="h-5 w-5" style={{ color: stat.color }} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" style={{ color: theme.colors.text.primary }}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
