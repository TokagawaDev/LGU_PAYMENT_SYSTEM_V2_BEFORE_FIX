'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/molecules/admin-header';
import { ROUTES } from '@/constants/routes';
import { useRouteLoading } from '@/components/molecules/route-loading-context';
import { useUserCustomForms } from '@/hooks/use-user-custom-forms';
import type { UserCustomFormField } from '@/hooks/use-user-custom-forms';
import { CustomFormBuilder } from '@/components/organism/custom-form-builder';
import { toast } from 'react-hot-toast';

const ADDONS_RETURN = `${ROUTES.ADMIN.SETTINGS}?tab=addons`;

export default function AdminNewCustomFormPage(): React.JSX.Element {
  const router = useRouter();
  const { startRouteTransition } = useRouteLoading();
  const { create } = useUserCustomForms();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [formFields, setFormFields] = React.useState<UserCustomFormField[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);



  const handleSaveDraft = async (): Promise<void> => {
    if (!title.trim()) {
      toast.error('Enter a form title.');
      return;
    }
    setIsSaving(true);
    const created = await create({
      title: title.trim(),
      description: description.trim(),
      status: 'draft',
      formFields,
    });
    setIsSaving(false);
    if (created?.id) {
      toast.success('Draft saved.');
      startRouteTransition();
      router.push(ROUTES.ADMIN.CUSTOM_FORM_EDIT(created.id));
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
    const created = await create({
      title: title.trim(),
      description: description.trim(),
      status: 'published',
      formFields,
    });
    setIsSaving(false);
    if (created?.id) {
      toast.success('Form published.');
      startRouteTransition();
      router.push(ADDONS_RETURN);
    } else {
      toast.error('Failed to publish.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        title="Create custom form"
        backHref={ADDONS_RETURN}
        backLabel="Back to Application"
      />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            Build a form with the fields you need. Preview before publishing.
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
              isNew
            />
          </div>
        </div>
      </main>
    </div>
  );
}
