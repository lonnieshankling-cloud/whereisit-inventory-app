import { useState, memo } from "react";
import type { Container } from "~backend/container/api";
import type { Item } from "~backend/item/create";
import { ItemList } from "./ItemList";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Package } from "lucide-react";
import { useBackend } from "@/lib/backend";
import { LazyImage } from "./LazyImage";
import { Skeleton } from "@/components/ui/skeleton";

export type ContainerWithItems = Container & { items: Item[] };

interface ContainerListProps {
  containers: ContainerWithItems[];
  onItemUpdated?: () => void;
  searchQuery?: string;
}

export const ContainerList = memo(function ContainerList({ containers, onItemUpdated, searchQuery = "" }: ContainerListProps) {
  const [containerItems, setContainerItems] = useState<Record<number, Item[]>>({});
  const [loadingContainers, setLoadingContainers] = useState<Record<number, boolean>>({});
  const backend = useBackend();

  const handleAccordionChange = async (value: string) => {
    if (!value) return;
    
    const containerId = parseInt(value);
    if (containerId === -1 || containerItems[containerId] || loadingContainers[containerId]) {
      return;
    }

    setLoadingContainers(prev => ({ ...prev, [containerId]: true }));
    try {
      const response = await backend.item.listByContainer({ containerId: containerId.toString() });
      setContainerItems(prev => ({ ...prev, [containerId]: response.items }));
    } catch (error) {
      console.error('Failed to load container items:', error);
    } finally {
      setLoadingContainers(prev => ({ ...prev, [containerId]: false }));
    }
  };

  const handleItemUpdated = async () => {
    const openContainerIds = Object.keys(containerItems).map(id => parseInt(id));
    
    setContainerItems({});
    
    onItemUpdated?.();
    
    if (openContainerIds.length > 0) {
      try {
        const responses = await Promise.all(
          openContainerIds.map(containerId =>
            backend.item.listByContainer({ containerId: containerId.toString() })
          )
        );
        
        const updatedContainerItems: Record<number, Item[]> = {};
        openContainerIds.forEach((containerId, index) => {
          updatedContainerItems[containerId] = responses[index].items;
        });
        
        setContainerItems(updatedContainerItems);
      } catch (error) {
        console.error('Failed to refresh container items:', error);
      }
    }
  };

  return (
    <div className="space-y-2">
      {containers.map((container) => {
        const items = containerItems[container.id] || container.items || [];
        const itemCount = items.length;
        const isLoading = loadingContainers[container.id];

        return (
          <Accordion 
            key={container.id} 
            type="single" 
            collapsible 
            className="w-full"
            onValueChange={handleAccordionChange}
          >
            <AccordionItem value={container.id.toString()} className="border rounded-md bg-white overflow-hidden">
              {container.photoUrl && (
                <div className="relative w-full h-32 overflow-hidden bg-gray-100">
                  <LazyImage
                    src={container.photoUrl}
                    alt={container.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <AccordionTrigger className="hover:no-underline px-4 py-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-900">{container.name}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({itemCount} {itemCount === 1 ? "item" : "items"})
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3">
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 flex-1" />
                      </div>
                    ))}
                  </div>
                ) : items.length > 0 ? (
                  <ItemList 
                    items={items} 
                    onItemUpdated={handleItemUpdated}
                    searchQuery={searchQuery}
                  />
                ) : (
                  <p className="text-sm text-gray-500">No items in this container</p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      })}
    </div>
  );
});
