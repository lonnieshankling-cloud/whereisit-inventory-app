import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { theme } from "@/lib/theme";
import { ClerkProvider, SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import { useState } from "react";
import type { Item } from "~backend/item/create";
import { AddItemButton } from "./components/AddItemButton";
import { Breadcrumbs } from "./components/Breadcrumbs";
import { DashboardStats } from "./components/DashboardStats";
import { ExpiringItems } from "./components/ExpiringItems";
import { FavoriteItems } from "./components/FavoriteItems";
import { Header } from "./components/Header";
import { ItemDetailDialog } from "./components/ItemDetailDialog";
import { LocationsList } from "./components/LocationsList";
import { LowStockItems } from "./components/LowStockItems";
import { MyHousehold } from "./components/MyHousehold";
import { NeedsConfirmation } from "./components/NeedsConfirmation";
import { PlacedItemFilter } from "./components/PlacedItemFilter";
import { QuickAccessCards } from "./components/QuickAccessCards";
import { RecentItems } from "./components/RecentItems";
import { ScanButton } from "./components/ScanButton";
import { SearchBar } from "./components/SearchBar";
import { Settings } from "./components/Settings";
import { ShoppingList } from "./components/ShoppingList";
import { UnplacedItems } from "./components/UnplacedItems";

const PUBLISHABLE_KEY = "pk_test_bm9ybWFsLWFwaGlkLTY1LmNsZXJrLmFjY291bnRzLmRldiQ";

function AppInner() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const isFiltered = filterStatus !== 'all';

  const getBreadcrumbs = () => {
    const breadcrumbs = [];
    if (currentPage !== "dashboard") {
      breadcrumbs.push({ label: "Dashboard", onClick: () => setCurrentPage("dashboard") });
    }
    
    const pageNames: Record<string, string> = {
      "shopping-list": "Shopping List",
      "my-household": "My Household",
      "settings": "Settings",
      "locations": "Locations",
      "unassigned-items": "Unassigned Items",
      "recent-items": "Recently Added",
      "expiring-items": "Expiring Items",
      "low-stock": "Low Stock",
      "favorites": "Favorites",
      "needs-confirmation": "Needs Confirmation",
      "all-items": "All Items",
    };

    if (currentPage in pageNames) {
      breadcrumbs.push({ label: pageNames[currentPage] });
    }

    return breadcrumbs;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.colors.surface.gray50 }}>
      <Header onNavigate={setCurrentPage} />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <SignedOut>
          <>
            <div className="flex flex-col items-center justify-center py-24">
              <h1 
                className="font-bold mb-4"
                style={{ 
                  fontSize: theme.typography.fontSize['4xl'],
                  color: theme.colors.text.primary,
                  fontWeight: theme.typography.fontWeight.bold
                }}
              >
                Welcome to WhereIsIt?
              </h1>
              <p 
                className="mb-8"
                style={{ 
                  fontSize: theme.typography.fontSize.lg,
                  color: theme.colors.text.secondary
                }}
              >
                Sign in to start tracking your home inventory
              </p>
              <SignInButton mode="modal">
                <Button 
                  className="font-semibold"
                  style={{
                    backgroundColor: theme.colors.brand.primary,
                    color: theme.colors.text.primary,
                    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
                    fontSize: theme.typography.fontSize.lg,
                    fontWeight: theme.typography.fontWeight.semibold
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.brand.primaryHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.brand.primary}
                >
                  Sign In
                </Button>
              </SignInButton>
            </div>
          </>
        </SignedOut>

        <SignedIn>
          <>
            <Breadcrumbs items={getBreadcrumbs()} />
            {currentPage === "shopping-list" ? (
              <ShoppingList />
            ) : currentPage === "my-household" ? (
              <MyHousehold />
            ) : currentPage === "settings" ? (
              <Settings />
            ) : currentPage === "locations" ? (
              <>
                <h2 className="text-2xl font-bold mb-4">Locations</h2>
                <LocationsList externalSearchQuery={searchQuery} />
              </>
            ) : currentPage === "unassigned-items" ? (
              <>
                <h2 className="text-2xl font-bold mb-4">Unassigned Items</h2>
                <UnplacedItems />
              </>
            ) : currentPage === "recent-items" ? (
              <>
                <h2 className="text-2xl font-bold mb-4">Recently Added Items</h2>
                <RecentItems />
              </>
            ) : currentPage === "expiring-items" ? (
              <>
                <h2 className="text-2xl font-bold mb-4">Expiring Items</h2>
                <ExpiringItems />
              </>
            ) : currentPage === "low-stock" ? (
              <>
                <h2 className="text-2xl font-bold mb-4">Low Stock Items</h2>
                <LowStockItems />
              </>
            ) : currentPage === "favorites" ? (
              <>
                <h2 className="text-2xl font-bold mb-4">Favorite Items</h2>
                <FavoriteItems />
              </>
            ) : currentPage === "needs-confirmation" ? (
              <>
                <h2 className="text-2xl font-bold mb-4">Needs Confirmation</h2>
                <NeedsConfirmation />
              </>
            ) : (
              <>
                <DashboardStats />

                <div className="mt-8 mb-6">
                  <SearchBar query={searchQuery} onQueryChange={setSearchQuery} />
                </div>

                <div className="mb-6">
                  <PlacedItemFilter value={filterStatus} onChange={setFilterStatus} />
                </div>

                <div className="mb-8 flex justify-end gap-3">
                  <ScanButton />
                  <AddItemButton />
                </div>

                {isFiltered ? (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">
                      {filterStatus === "placed" ? "Placed Items" : "Unplaced Items"}
                    </h2>
                    {filterStatus === "not_placed" && <UnplacedItems />}
                  </div>
                ) : selectedCategory ? (
                  <div className="space-y-4">
                    <QuickAccessCards
                      onCategorySelect={setSelectedCategory}
                      selectedCategory={selectedCategory}
                    />
                    <div className="mt-6">
                      {selectedCategory === "unplaced" && <UnplacedItems />}
                      {selectedCategory === "recent" && <RecentItems />}
                      {selectedCategory === "expiring" && <ExpiringItems />}
                      {selectedCategory === "lowStock" && <LowStockItems />}
                      {selectedCategory === "favorites" && <FavoriteItems />}
                      {selectedCategory === "needsConfirmation" && <NeedsConfirmation />}
                    </div>
                  </div>
                ) : (
                  <>
                    <QuickAccessCards
                      onCategorySelect={setSelectedCategory}
                      selectedCategory={selectedCategory}
                    />
                    <h2 className="text-2xl font-bold mt-6 mb-4">Inventory</h2>
                    <LocationsList externalSearchQuery={searchQuery} />
                  </>
                )}
              </>
            )}
          </>
        </SignedIn>
      </main>

      <Toaster />
      
      {selectedItem && (
        <ItemDetailDialog
          item={selectedItem}
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onItemUpdated={() => {
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <AppInner />
    </ClerkProvider>
  );
}
