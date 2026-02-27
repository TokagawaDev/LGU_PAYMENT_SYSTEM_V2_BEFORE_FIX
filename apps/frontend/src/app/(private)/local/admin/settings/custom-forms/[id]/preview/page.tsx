'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminHeader from '@/components/molecules/admin-header';
import { ROUTES } from '@/constants/routes';
import { useRouteLoading } from '@/components/molecules/route-loading-context';
import { useUserCustomForms } from '@/hooks/use-user-custom-forms';
import type { UserCustomFormField } from '@/hooks/use-user-custom-forms';
import { CustomFormPreviewRender } from '@/components/organism/custom-form-preview-render';

const ADDONS_RETURN = `${ROUTES.ADMIN.SETTINGS}?tab=addons`;

export default function AdminPreviewCustomFormPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const { getById } = useUserCustomForms();
  const { startRouteTransition } = useRouteLoading();
  const [form, setForm] = React.useState<{
    title: string;
    description: string;
    formFields: UserCustomFormField[];
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (id === 'preview') {
      try {
        const raw = sessionStorage.getItem('custom-form-preview');
        const data = raw ? JSON.parse(raw) : null;
        setForm(
          data
            ? {
                title: data.title ?? 'Preview',
                description: data.description ?? '',
                formFields: data.formFields ?? [],
              }
            : null
        );
      } catch {
        setForm(null);
      }
      setLoading(false);
      return;
    }
    let cancelled = false;
    void getById(id).then((f) => {
      if (cancelled) return;
      setForm(
        f
          ? {
              title: f.title,
              description: f.description ?? '',
              formFields: f.formFields ?? [],
            }
          : null
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id, getById]);

  const handleBack = (): void => {
    if (id === 'preview') {
      window.close();
      return;
    }
    startRouteTransition();
    router.push(ADDONS_RETURN);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader title="Preview" backHref={ADDONS_RETURN} backLabel="Back to Application" />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">
            Form not found.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        title="Preview"
        backHref={id === 'preview' ? undefined : ADDONS_RETURN}
        backLabel={id === 'preview' ? 'Close preview' : 'Back to Application'}
        onBack={id === 'preview' ? handleBack : undefined}
      />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
            <p className="text-xs font-medium text-rose-600 uppercase tracking-wider mb-2">
              Preview
            </p>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl mb-2">
              {form.title}
            </h1>
            {form.description ? (
              <p className="text-sm text-gray-500 mb-6">{form.description}</p>
            ) : null}
            <CustomFormPreviewRender
              title={form.title}
              description={form.description}
              formFields={form.formFields}
              fieldIdPrefix="admin-preview"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
