'use client';

import { useCallback, useState } from 'react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const BASE_URL = `${API_BASE}/user/custom-application-form-submissions`;

export type AddOnSubmissionAdminStatus =
  | 'pending'
  | 'reviewing'
  | 'rejected'
  | 'approved';

export interface AddOnSubmissionItem {
  id: string;
  _id?: string;
  userId: string;
  customApplicationServiceId: string;
  // Backward compatibility alias
  addOnId?: string;
  status: 'draft' | 'submitted';
  adminStatus?: AddOnSubmissionAdminStatus;
  formData: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListSubmissionsResult {
  items: AddOnSubmissionItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UseAddOnSubmissionsReturn {
  list: (params?: { customApplicationServiceId?: string; addOnId?: string; status?: 'draft' | 'submitted'; page?: number; limit?: number }) => Promise<ListSubmissionsResult>;
  getById: (id: string) => Promise<AddOnSubmissionItem | null>;
  create: (params: { customApplicationServiceId?: string; addOnId?: string; status?: 'draft' | 'submitted'; formData?: Record<string, unknown> }) => Promise<{ data: AddOnSubmissionItem } | { error: string }>;
  update: (id: string, params: { status?: 'draft' | 'submitted'; formData?: Record<string, unknown> }) => Promise<AddOnSubmissionItem | null>;
  remove: (id: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

function withCredentials(): RequestInit['credentials'] {
  return 'include';
}

/**
 * Hook for user add-on submissions (create, list, update, delete) in the user portal.
 */
export function useAddOnSubmissions(): UseAddOnSubmissionsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(
    async (params?: {
      customApplicationServiceId?: string;
      addOnId?: string; // Backward compatibility
      status?: 'draft' | 'submitted';
      page?: number;
      limit?: number;
    }): Promise<ListSubmissionsResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const search = new URLSearchParams();
        // Use new field name, fallback to old for backward compatibility
        const serviceId = params?.customApplicationServiceId || params?.addOnId;
        if (serviceId) search.set('customApplicationServiceId', serviceId);
        if (params?.status) search.set('status', params.status);
        if (params?.page != null) search.set('page', String(params.page));
        if (params?.limit != null) search.set('limit', String(params.limit));
        const url = search.toString() ? `${BASE_URL}?${search}` : BASE_URL;
        const res = await fetch(url, { credentials: withCredentials() });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to list submissions');
        }
        const data: ListSubmissionsResult = await res.json();
        return {
          ...data,
          items: (data.items ?? []).map((i: AddOnSubmissionItem & { _id?: string; addOnId?: string }) => ({
            ...i,
            id: i.id ?? i._id ?? '',
            // Backward compatibility: map customApplicationServiceId to addOnId if not present
            addOnId: i.addOnId || i.customApplicationServiceId,
            customApplicationServiceId: i.customApplicationServiceId || i.addOnId,
          })),
        };
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An error occurred');
        return { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getById = useCallback(async (id: string): Promise<AddOnSubmissionItem | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/${id}`, {
        credentials: withCredentials(),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        ...data,
        id: data.id ?? data._id ?? id,
        // Backward compatibility: map customApplicationServiceId to addOnId if not present
        addOnId: data.addOnId || data.customApplicationServiceId,
        customApplicationServiceId: data.customApplicationServiceId || data.addOnId,
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const create = useCallback(
    async (params: {
      customApplicationServiceId?: string;
      addOnId?: string; // Backward compatibility
      status?: 'draft' | 'submitted';
      formData?: Record<string, unknown>;
    }): Promise<{ data: AddOnSubmissionItem } | { error: string }> => {
      setIsLoading(true);
      setError(null);
      try {
        // Use new field name, fallback to old for backward compatibility
        const serviceId = params.customApplicationServiceId || params.addOnId;
        if (!serviceId) {
          return { error: 'customApplicationServiceId or addOnId is required' };
        }
        const payload = {
          customApplicationServiceId: serviceId,
          status: params.status,
          formData: params.formData ?? {},
        };
        const res = await fetch(BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: withCredentials(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = Array.isArray(err.message) ? err.message.join('; ') : (err.message || res.statusText || 'Failed to create');
          setError(msg);
          return { error: msg };
        }
        const data = await res.json();
        const item: AddOnSubmissionItem = {
          ...data,
          id: data.id ?? data._id ?? data._id?.toString?.(),
          addOnId: data.addOnId || data.customApplicationServiceId,
          customApplicationServiceId: data.customApplicationServiceId || data.addOnId,
        };
        return { data: item };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'An error occurred';
        setError(msg);
        return { error: msg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const update = useCallback(
    async (
      id: string,
      params: {
        status?: 'draft' | 'submitted';
        formData?: Record<string, unknown>;
      }
    ): Promise<AddOnSubmissionItem | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${BASE_URL}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: withCredentials(),
          body: JSON.stringify(params),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to update');
        }
        const data = await res.json();
        return { ...data, id: data.id ?? data._id ?? id };
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An error occurred');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'DELETE',
        credentials: withCredentials(),
      });
      if (!res.ok) return false;
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    list,
    getById,
    create,
    update,
    remove,
    isLoading,
    error,
  };
}
