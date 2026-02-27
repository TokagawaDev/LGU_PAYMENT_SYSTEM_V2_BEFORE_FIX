'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import AdminHeader from '@/components/molecules/admin-header';
import { ROUTES } from '@/constants/routes';
import { useUserCustomForms } from '@/hooks/use-user-custom-forms';
import type { UserCustomFormField } from '@/hooks/use-user-custom-forms';
import { CustomFormBuilder } from '@/components/organism/custom-form-builder';
import { toast } from 'react-hot-toast';

const ADDONS_RETURN = `${ROUTES.ADMIN.SETTINGS}?tab=addons`;

export default function AdminEditCustomFormPage(): React.JSX.Element {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { getById, update } = useUserCustomForms();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [formFields, setFormFields] = React.useState<UserCustomFormField[]>([]);
  const [status, setStatus] = React.useState<'draft' | 'published'>('draft');
  const [loaded, setLoaded] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void getById(id).then((form) => {
      if (cancelled || !form) return;
      setTitle(form.title);
      setDescription(form.description ?? '');
      setFormFields(form.formFields ?? []);
      setStatus(form.status);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [id, getById]);



  const handleSaveDraft = async (): Promise<void> => {
    if (!title.trim()) {
      toast.error('Enter a form title.');
      return;
    }
    setIsSaving(true);
    const updated = await update(id, {
      title: title.trim(),
      description: description.trim(),
      status: 'draft',
      formFields,
    });
    setIsSaving(false);
    if (updated) {
      toast.success('Draft saved.');
      setStatus('draft');
    } else {
      toast.error('Failed to save draft.');
    }
  };

  const handlePublish = async (): Promise<void> => {
    if (!title.trim()) {
      toast.error('Enter a form title.');
      return;
    }
    setIsSaving(true);
    const updated = await update(id, {
      title: title.trim(),
      description: description.trim(),
      status: 'published',
      formFields,
    });
    setIsSaving(false);
    if (updated) {
      toast.success('Form published.');
      setStatus('published');
    } else {
      toast.error('Failed to publish.');
    }
  };

  if (!loaded && id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        title="Edit custom form"
        backHref={ADDONS_RETURN}
        backLabel="Back to Application"
      />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            Status: <span className="font-medium">{status}</span>
          </p>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
            <CustomFormBuilder
              title={title}
              description={description}
              formFields={formFields}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              onFormFieldsChange={setFormFields}
              onPreview={() => {
                // Preview is handled by the dialog in CustomFormBuilder
              }}
              onSaveDraft={handleSaveDraft}
              onPublish={handlePublish}
              isSaving={isSaving}
              isNew={false}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
