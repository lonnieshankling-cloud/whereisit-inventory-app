import { Skeleton } from "@/components/ui/skeleton";

export function ContainerSkeleton() {
  return (
    <div className="border rounded-md bg-white overflow-hidden">
      <Skeleton className="w-full h-32" />
      <div className="px-4 py-3">
        <Skeleton className="h-5 w-48" />
      </div>
    </div>
  );
}
