import { theme } from "@/lib/theme";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm mb-6">
      <button
        onClick={() => items[0]?.onClick?.()}
        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Home className="h-4 w-4" />
      </button>
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <ChevronRight className="h-4 w-4 text-gray-400" />
          {index === items.length - 1 ? (
            <span
              className="font-medium"
              style={{ color: theme.colors.text.primary }}
            >
              {item.label}
            </span>
          ) : (
            <button
              onClick={item.onClick}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {item.label}
            </button>
          )}
        </div>
      ))}
    </nav>
  );
}
