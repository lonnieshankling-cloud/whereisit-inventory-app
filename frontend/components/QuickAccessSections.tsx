import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ExpiringItems } from "./ExpiringItems";
import { LowStockItems } from "./LowStockItems";
import { RecentItems } from "./RecentItems";
import { FavoriteItems } from "./FavoriteItems";
import { UnplacedItems } from "./UnplacedItems";

export const QuickAccessSections = () => {
  return (
    <Accordion type="multiple" className="w-full space-y-2">
      <AccordionItem value="recent">
        <AccordionTrigger className="text-xl font-bold hover:no-underline">
          Recently Added
        </AccordionTrigger>
        <AccordionContent>
          <RecentItems />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="unplaced">
        <AccordionTrigger className="text-xl font-bold hover:no-underline">
          Unplaced Items
        </AccordionTrigger>
        <AccordionContent>
          <UnplacedItems />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="expiring">
        <AccordionTrigger className="text-xl font-bold hover:no-underline">
          Expiring Soon
        </AccordionTrigger>
        <AccordionContent>
          <ExpiringItems />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="low-stock">
        <AccordionTrigger className="text-xl font-bold hover:no-underline">
          Low Stock
        </AccordionTrigger>
        <AccordionContent>
          <LowStockItems />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="favorites">
        <AccordionTrigger className="text-xl font-bold hover:no-underline">
          Favorite Items
        </AccordionTrigger>
        <AccordionContent>
          <FavoriteItems />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
