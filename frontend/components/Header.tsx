import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { theme } from "@/lib/theme";
import { SignedIn, UserButton } from "@clerk/clerk-react";
import { Menu } from "lucide-react";

interface HeaderProps {
  onNavigate?: (page: string) => void;
}

export function Header({ onNavigate }: HeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-6xl">
        <h1 
          className="font-bold"
          style={{ 
            fontSize: theme.typography.fontSize['2xl'],
            color: theme.colors.text.primary,
            fontWeight: theme.typography.fontWeight.bold
          }}
        >
          WhereIsIt?
        </h1>

        <div className="flex items-center gap-4">
          <SignedIn>
            <>
              <UserButton afterSignOutUrl="/" />
            </>
          </SignedIn>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" style={{ color: theme.colors.text.primary }} />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-4">
                <button 
                  onClick={() => onNavigate?.("dashboard")} 
                  className="text-left transition-colors"
                  style={{ 
                    color: theme.colors.text.primary,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.brand.primary}
                  onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.text.primary}
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => onNavigate?.("all-items")} 
                  className="text-left transition-colors"
                  style={{ 
                    color: theme.colors.text.primary,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.brand.primary}
                  onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.text.primary}
                >
                  All Items
                </button>
                <button 
                  onClick={() => onNavigate?.("unassigned-items")} 
                  className="text-left transition-colors"
                  style={{ 
                    color: theme.colors.text.primary,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.brand.primary}
                  onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.text.primary}
                >
                  Unassigned Items
                </button>
                <button 
                  onClick={() => onNavigate?.("recent-items")} 
                  className="text-left transition-colors"
                  style={{ 
                    color: theme.colors.text.primary,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.brand.primary}
                  onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.text.primary}
                >
                  Recently Added Items
                </button>
                <button 
                  onClick={() => onNavigate?.("expiring-items")} 
                  className="text-left transition-colors"
                  style={{ 
                    color: theme.colors.text.primary,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.brand.primary}
                  onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.text.primary}
                >
                  Expiring Items
                </button>
                <button 
                  onClick={() => onNavigate?.("low-stock")} 
                  className="text-left transition-colors"
                  style={{ 
                    color: theme.colors.text.primary,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.brand.primary}
                  onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.text.primary}
                >
                  Low Stock
                </button>
                <button 
                  onClick={() => onNavigate?.("favorites")} 
                  className="text-left transition-colors"
                  style={{ 
                    color: theme.colors.text.primary,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.brand.primary}
                  onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.text.primary}
                >
                  Favorite Items
                </button>
                <button 
                  onClick={() => onNavigate?.("needs-confirmation")} 
                  className="text-left transition-colors"
                  style={{ 
                    color: theme.colors.text.primary,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.brand.primary}
                  onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.text.primary}
                >
                  Needs Confirmation
                </button>
                <button 
                  onClick={() => onNavigate?.("locations")} 
                  className="text-left transition-colors"
                  style={{ 
                    color: theme.colors.text.primary,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.brand.primary}
                  onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.text.primary}
                >
                  Locations
                </button>
                <button 
                  onClick={() => onNavigate?.("shopping-list")} 
                  className="text-left transition-colors"
                  style={{ 
                    color: theme.colors.text.primary,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.brand.primary}
                  onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.text.primary}
                >
                  Shopping List
                </button>
                <button 
                  onClick={() => onNavigate?.("my-household")} 
                  className="text-left transition-colors"
                  style={{ 
                    color: theme.colors.text.primary,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.brand.primary}
                  onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.text.primary}
                >
                  My Household
                </button>
                <button 
                  onClick={() => onNavigate?.("settings")} 
                  className="text-left transition-colors"
                  style={{ 
                    color: theme.colors.text.primary,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.brand.primary}
                  onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.text.primary}
                >
                  Settings
                </button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
