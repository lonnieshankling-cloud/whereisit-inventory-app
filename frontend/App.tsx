import { ClerkProvider, SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import { useState } from "react";
import { Header } from "./components/Header";
import { SearchBar } from "./components/SearchBar";
import { QuickAccessCards } from "./components/QuickAccessCards";
import { LocationsList } from "./components/LocationsList";
import { AddItemButton } from "./components/AddItemButton";
import { ScanButton } from "./components/ScanButton";
import { ShoppingList } from "./components/ShoppingList";
import { MyHousehold } from "./components/MyHousehold";
import { Settings } from "./components/Settings";
import { PlacedItemFilter } from "./components/PlacedItemFilter";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { UnplacedItems } from "./components/UnplacedItems";
import { RecentItems } from "./components/RecentItems";
import { ExpiringItems } from "./components/ExpiringItems";
import { LowStockItems } from "./components/LowStockItems";
import { FavoriteItems } from "./components/FavoriteItems";
import { NeedsConfirmation } from "./components/NeedsConfirmation";
import { ItemDetailDialog } from "./components/ItemDetailDialog";
import type { Item } from "~backend/item/create";
import { theme } from "@/lib/theme";

const PUBLISHABLE_KEY = "pk_test_bm9ybWFsLWFwaGlkLTY1LmNsZXJrLmFjY291bnRzLmRldiQ";

function AppInner() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const isFiltered = filterStatus !== 'all';

  return (
    <div className="min-h-screen bg-white">
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
            ) : (
              <>
                <div className="mb-12">
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
