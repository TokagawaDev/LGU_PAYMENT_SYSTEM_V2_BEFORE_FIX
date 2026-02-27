'use client';

import { useCallback, useState } from 'react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const FORMS_BASE = `${API_BASE}/admin/custom-forms`;

const creds = (): RequestInit['credentials'] => 'include';

export interface FormFieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface UserCustomFormField {
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
}

export interface UserCustomForm {
  id: string;
  _id?: string;
  userId: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
  formFields: UserCustomFormField[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserCustomFormSubmission {
  id: string;
  _id?: string;
  userId: string;
  userFormId: string;
  status: 'draft' | 'submitted';
  formData: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface UseAdminCustomFormsReturn {
  list: (status?: 'draft' | 'published') => Promise<AdminCustomForm[]>;
  listPublished: () => Promise<AdminCustomForm[]>;
  getById: (id: string) => Promise<AdminCustomForm | null>;
  getPublishedById: (id: string) => Promise<AdminCustomForm | null>;
  create: (dto: {
    title: string;
    description?: string;
    status?: 'draft' | 'published';
    formFields?: AdminCustomFormField[];
  }) => Promise<AdminCustomForm | null>;
  update: (
    id: string,
    dto: Partial<{
      title: string;
      description: string;
      status: 'draft' | 'published';
      formFields: AdminCustomFormField[];
    }>
  ) => Promise<AdminCustomForm | null>;
  remove: (id: string) => Promise<boolean>;
  listSubmissions: (
    formId: string,
    status?: 'draft' | 'submitted'
  ) => Promise<AdminCustomFormSubmission[]>;
  getSubmission: (
    formId: string,
    subId: string
  ) => Promise<AdminCustomFormSubmission | null>;
  createSubmission: (
    formId: string,
    dto: { status?: 'draft' | 'submitted'; formData?: Record<string, unknown> }
  ) => Promise<AdminCustomFormSubmission | null>;
  updateSubmission: (
    formId: string,
    subId: string,
    dto: { status?: 'draft' | 'submitted'; formData?: Record<string, unknown> }
  ) => Promise<AdminCustomFormSubmission | null>;
  removeSubmission: (formId: string, subId: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

// Backward compatibility alias
export type UseUserCustomFormsReturn = UseAdminCustomFormsReturn;

function withId<T extends { _id?: unknown }>(item: T, id: string): T & { id: string } {
  return { ...item, id: (item as T & { id?: string }).id ?? id };
}

export function useAdminCustomForms(): UseAdminCustomFormsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(
    async (status?: 'draft' | 'published'): Promise<AdminCustomForm[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const url = status ? `${FORMS_BASE}?status=${status}` : FORMS_BASE;
        const res = await fetch(url, { credentials: creds() });
        if (!res.ok) throw new Error('Failed to list forms');
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const listPublished = useCallback(async (): Promise<AdminCustomForm[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${FORMS_BASE}/published`, { credentials: creds() });
      if (!res.ok) throw new Error('Failed to list published forms');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getById = useCallback(async (id: string): Promise<UserCustomForm | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${FORMS_BASE}/${id}`, { credentials: creds() });
      if (!res.ok) return null;
      const data = await res.json();
      return withId(data, data.id ?? data._id ?? id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPublishedById = useCallback(async (id: string): Promise<AdminCustomForm | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${FORMS_BASE}/published/${id}`, { credentials: creds() });
      if (!res.ok) return null;
      const data = await res.json();
      return withId(data, data.id ?? data._id ?? id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const create = useCallback(
    async (dto: {
      title: string;
      description?: string;
      status?: 'draft' | 'published';
      formFields?: AdminCustomFormField[];
    }): Promise<AdminCustomForm | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(FORMS_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: creds(),
          body: JSON.stringify(dto),
        });
        if (!res.ok) throw new Error('Failed to create form');
        const data = await res.json();
        return withId(data, data._id?.toString?.() ?? data.id ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const update = useCallback(
    async (
      id: string,
      dto: Partial<{
        title: string;
        description: string;
        status: 'draft' | 'published';
      formFields: AdminCustomFormField[];
    }>
  ): Promise<AdminCustomForm | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${FORMS_BASE}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: creds(),
          body: JSON.stringify(dto),
        });
        if (!res.ok) throw new Error('Failed to update form');
        const data = await res.json();
        return withId(data, id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
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
      const res = await fetch(`${FORMS_BASE}/${id}`, {
        method: 'DELETE',
        credentials: creds(),
      });
      return res.status === 204;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listSubmissions = useCallback(
    async (
      formId: string,
      status?: 'draft' | 'submitted'
    ): Promise<AdminCustomFormSubmission[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const url = status
          ? `${FORMS_BASE}/${formId}/submissions?status=${status}`
          : `${FORMS_BASE}/${formId}/submissions`;
        const res = await fetch(url, { credentials: creds() });
        if (!res.ok) return [];
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        return arr.map((s: AdminCustomFormSubmission & { _id?: string }) =>
          withId(s, s.id ?? s._id ?? '')
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getSubmission = useCallback(
    async (
      formId: string,
      subId: string
    ): Promise<AdminCustomFormSubmission | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${FORMS_BASE}/${formId}/submissions/${subId}`,
          { credentials: creds() }
        );
        if (!res.ok) return null;
        const data = await res.json();
        return withId(data, subId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const createSubmission = useCallback(
    async (
      formId: string,
      dto: {
        status?: 'draft' | 'submitted';
        formData?: Record<string, unknown>;
      }
    ): Promise<AdminCustomFormSubmission | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${FORMS_BASE}/${formId}/submissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: creds(),
          body: JSON.stringify(dto),
        });
        if (!res.ok) throw new Error('Failed to create submission');
        const data = await res.json();
        return withId(data, data._id?.toString?.() ?? data.id ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updateSubmission = useCallback(
    async (
      formId: string,
      subId: string,
      dto: {
        status?: 'draft' | 'submitted';
        formData?: Record<string, unknown>;
      }
    ): Promise<AdminCustomFormSubmission | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${FORMS_BASE}/${formId}/submissions/${subId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: creds(),
            body: JSON.stringify(dto),
          }
        );
        if (!res.ok) return null;
        const data = await res.json();
        return withId(data, subId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const removeSubmission = useCallback(
    async (formId: string, subId: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${FORMS_BASE}/${formId}/submissions/${subId}`,
          { method: 'DELETE', credentials: creds() }
        );
        return res.status === 204;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    list,
    listPublished,
    getById,
    getPublishedById,
    create,
    update,
    remove,
    listSubmissions,
    getSubmission,
    createSubmission,
    updateSubmission,
    removeSubmission,
    isLoading,
    error,
  };
}

// Backward compatibility export
export const useUserCustomForms = useAdminCustomForms;

// Backward compatibility export
export const useUserCustomForms = useAdminCustomForms;
