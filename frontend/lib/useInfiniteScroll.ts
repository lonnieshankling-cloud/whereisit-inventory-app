import { useState, useEffect, useCallback, useRef } from "react";

interface UseInfiniteScrollOptions<T> {
  fetchItems: (limit: number, offset: number) => Promise<{ items: T[]; total: number; hasMore: boolean }>;
  limit?: number;
}

export function useInfiniteScroll<T>({ fetchItems, limit = 50 }: UseInfiniteScrollOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const offset = useRef(0);
  const isFetching = useRef(false);

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    offset.current = 0;
    isFetching.current = true;
    
    try {
      const result = await fetchItems(limit, 0);
      setItems(result.items);
      setTotal(result.total);
      setHasMore(result.hasMore);
      offset.current = result.items.length;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load items"));
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [fetchItems, limit]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || isFetching.current) return;

    setIsLoadingMore(true);
    isFetching.current = true;
    
    try {
      const result = await fetchItems(limit, offset.current);
      setItems((prev) => [...prev, ...result.items]);
      setTotal(result.total);
      setHasMore(result.hasMore);
      offset.current += result.items.length;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load more items"));
    } finally {
      setIsLoadingMore(false);
      isFetching.current = false;
    }
  }, [fetchItems, limit, hasMore, isLoadingMore]);

  const reset = useCallback(() => {
    setItems([]);
    setIsLoading(true);
    setIsLoadingMore(false);
    setHasMore(false);
    setTotal(0);
    setError(null);
    offset.current = 0;
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  return {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    total,
    error,
    loadMore,
    reload: loadInitial,
    reset,
  };
}
