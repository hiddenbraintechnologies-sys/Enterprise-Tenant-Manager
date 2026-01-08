import { useState, useCallback, useMemo } from "react";

export interface PaginationState {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface FilterState {
  search?: string;
  status?: string;
  productType?: string;
  materialType?: string;
  orderType?: string;
  priority?: string;
  [key: string]: string | undefined;
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
  initialSortBy?: string;
  initialSortOrder?: "asc" | "desc";
}

export function usePagination(options: UsePaginationOptions = {}) {
  const [state, setState] = useState<PaginationState>({
    page: options.initialPage ?? 1,
    limit: options.initialLimit ?? 20,
    sortBy: options.initialSortBy ?? "createdAt",
    sortOrder: options.initialSortOrder ?? "desc",
  });

  const [filters, setFiltersState] = useState<FilterState>({});

  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, page: Math.max(1, page) }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setState((prev) => ({ ...prev, limit, page: 1 }));
  }, []);

  const setSort = useCallback((sortBy: string, sortOrder?: "asc" | "desc") => {
    setState((prev) => ({
      ...prev,
      sortBy,
      sortOrder: sortOrder ?? (prev.sortBy === sortBy && prev.sortOrder === "asc" ? "desc" : "asc"),
      page: 1,
    }));
  }, []);

  const setFilters = useCallback((newFilters: FilterState) => {
    setFiltersState(newFilters);
    setState((prev) => ({ ...prev, page: 1 }));
  }, []);

  const setFilter = useCallback((key: string, value: string | undefined) => {
    setFiltersState((prev) => {
      const updated = { ...prev };
      if (value === undefined || value === "" || value === "all") {
        delete updated[key];
      } else {
        updated[key] = value;
      }
      return updated;
    });
    setState((prev) => ({ ...prev, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
    setState((prev) => ({ ...prev, page: 1 }));
  }, []);

  const nextPage = useCallback(() => {
    setState((prev) => ({ ...prev, page: prev.page + 1 }));
  }, []);

  const prevPage = useCallback(() => {
    setState((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }));
  }, []);

  const reset = useCallback(() => {
    setState({
      page: options.initialPage ?? 1,
      limit: options.initialLimit ?? 20,
      sortBy: options.initialSortBy ?? "createdAt",
      sortOrder: options.initialSortOrder ?? "desc",
    });
    setFiltersState({});
  }, [options]);

  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).length > 0;
  }, [filters]);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      page: String(state.page),
      limit: String(state.limit),
      sortBy: state.sortBy,
      sortOrder: state.sortOrder,
    };
    
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== "" && value !== "all") {
        params[key] = value;
      }
    }
    
    return params;
  }, [state, filters]);

  return {
    ...state,
    filters,
    hasActiveFilters,
    setPage,
    setLimit,
    setSort,
    setFilter,
    setFilters,
    clearFilters,
    nextPage,
    prevPage,
    reset,
    queryParams,
  };
}

export function buildQueryKey(baseKey: string, params: Record<string, string | undefined>): (string | Record<string, string | undefined>)[] {
  return [baseKey, params];
}

export const ALL_ITEMS_PARAMS = { limit: "1000" };

export function unwrapPaginatedData<T>(response: T[] | PaginationResponse<T> | undefined): T[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  return response.data ?? [];
}
