'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Mail, User, Phone, Lock, Save } from 'lucide-react';

interface SettingsFormData {
  email: string;
  firstName: string;
  middleName: string;
  lastName: string;
  contact: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface SettingsFormProps {
  onSaveProfile?: (
    data: Pick<
      SettingsFormData,
      'firstName' | 'middleName' | 'lastName' | 'contact'
    >
  ) => void | Promise<void>;
  onChangePassword?: (
    data: Pick<
      SettingsFormData,
      'currentPassword' | 'newPassword' | 'confirmNewPassword'
    >
  ) => void | Promise<void>;
  initialData?: Partial<SettingsFormData>;
}

export function SettingsForm({
  onSaveProfile,
  onChangePassword,
  initialData,
}: SettingsFormProps) {
  const [formData, setFormData] = useState<SettingsFormData>({
    email: initialData?.email || '',
    firstName: initialData?.firstName || '',
    middleName: initialData?.middleName || '',
    lastName: initialData?.lastName || '',
    contact: initialData?.contact || '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<SettingsFormData>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const validateProfile = (): boolean => {
    const newErrors: Partial<SettingsFormData> = {};
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.contact) {
      newErrors.contact = 'Contact number is required';
    } else if (!/^09\d{9}$/.test(formData.contact)) {
      newErrors.contact =
        'Use a valid PH mobile number (11 digits starting with 09)';
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = (): boolean => {
    const newErrors: Partial<SettingsFormData> = {};
    if (!formData.currentPassword)
      newErrors.currentPassword = 'Current password is required';
    if (!formData.newPassword)
      newErrors.newPassword = 'New password is required';
    else if (formData.newPassword.length < 8)
      newErrors.newPassword = 'New password must be at least 8 characters';
    if (formData.newPassword !== formData.confirmNewPassword)
      newErrors.confirmNewPassword = 'New passwords do not match';
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProfile()) return;
    setIsSavingProfile(true);
    setFormError(null);
    try {
      if (onSaveProfile) {
        await onSaveProfile({
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          contact: formData.contact,
        });
      }
      toast.success('Profile updated');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An error occurred';
      const serverErrors: Partial<SettingsFormData> = {};
      const lower = message.toLowerCase();
      if (lower.includes('first name') || lower.includes('firstname'))
        serverErrors.firstName = message;
      if (lower.includes('last name') || lower.includes('lastname'))
        serverErrors.lastName = message;
      if (lower.includes('contact')) serverErrors.contact = message;
      if (Object.keys(serverErrors).length > 0)
        setErrors((prev) => ({ ...prev, ...serverErrors }));
      else setFormError(message);
      toast.error(message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;
    setIsChangingPassword(true);
    setFormError(null);
    try {
      if (onChangePassword) {
        await onChangePassword({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          confirmNewPassword: formData.confirmNewPassword,
        });
      }
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      }));
      toast.success('Password changed');
    } catch {
      toast.error('Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleInputChange = (field: keyof SettingsFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Card className="w-full max-w-4xl bg-white/95 backdrop-blur-sm shadow-xl mb-4">
      <CardHeader className="space-y-1 pb-3 md:pb-4">
        <CardTitle className="text-lg md:text-xl lg:text-2xl font-bold text-center text-gray-900">
          Account Settings
        </CardTitle>
        <p className="text-xs md:text-sm text-center text-gray-600">
          Update your profile information and preferences
        </p>
      </CardHeader>
      <CardContent className="px-3 md:px-6 lg:px-8 pb-4 md:pb-6">
        {formError && (
          <p className="mb-3 text-xs md:text-sm text-red-600">{formError}</p>
        )}
        {/* Profile form */}
        <form
          onSubmit={handleSaveProfileSubmit}
          className="space-y-3 md:space-y-4"
        >
          {/* Personal Information Section */}
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 border-b pb-2">
              Personal Information
            </h3>

            {/* Personal Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {/* Email - Read Only */}
              <div className="space-y-1 md:space-y-2 lg:col-span-2">
                <label
                  htmlFor="email"
                  className="text-xs md:text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    className="pl-8 md:pl-10 h-8 md:h-10 text-sm bg-gray-50 text-gray-600"
                    readOnly
                    disabled
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Email address cannot be changed
                </p>
              </div>

              {/* Contact */}
              <div className="space-y-1 md:space-y-2">
                <label
                  htmlFor="contact"
                  className="text-xs md:text-sm font-medium text-gray-700"
                >
                  Contact Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                  <Input
                    id="contact"
                    type="tel"
                    inputMode="numeric"
                    pattern="09[0-9]{9}"
                    title="Enter a valid PH mobile number (11 digits starting with 09)"
                    maxLength={11}
                    placeholder="09xxxxxxxxx"
                    value={formData.contact}
                    onChange={(e) => {
                      const digitsOnly = e.target.value
                        .replace(/\D/g, '')
                        .slice(0, 11);
                      handleInputChange('contact', digitsOnly);
                    }}
                    className={`pl-8 md:pl-10 h-8 md:h-10 text-sm ${
                      errors.contact ? 'border-red-500' : ''
                    }`}
                    required
                  />
                </div>
                {errors.contact && (
                  <p className="text-xs text-red-500">{errors.contact}</p>
                )}
              </div>

              {/* First Name */}
              <div className="space-y-1 md:space-y-2">
                <label
                  htmlFor="firstName"
                  className="text-xs md:text-sm font-medium text-gray-700"
                >
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange('firstName', e.target.value)
                    }
                    className={`pl-8 md:pl-10 h-8 md:h-10 text-sm ${
                      errors.firstName ? 'border-red-500' : ''
                    }`}
                    required
                  />
                </div>
                {errors.firstName && (
                  <p className="text-xs text-red-500">{errors.firstName}</p>
                )}
              </div>

              {/* Middle Name */}
              <div className="space-y-1 md:space-y-2">
                <label
                  htmlFor="middleName"
                  className="text-xs md:text-sm font-medium text-gray-700"
                >
                  Middle Name
                </label>
                <Input
                  id="middleName"
                  type="text"
                  placeholder="Middle name (optional)"
                  value={formData.middleName}
                  onChange={(e) =>
                    handleInputChange('middleName', e.target.value)
                  }
                  className={`h-8 md:h-10 text-sm ${
                    errors.middleName ? 'border-red-500' : ''
                  }`}
                />
                {errors.middleName && (
                  <p className="text-xs text-red-500">{errors.middleName}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-1 md:space-y-2">
                <label
                  htmlFor="lastName"
                  className="text-xs md:text-sm font-medium text-gray-700"
                >
                  Last Name *
                </label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange('lastName', e.target.value)
                  }
                  className={`h-8 md:h-10 text-sm ${
                    errors.lastName ? 'border-red-500' : ''
                  }`}
                  required
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500">{errors.lastName}</p>
                )}
              </div>
            </div>
            {/* Action Buttons for profile */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-2 md:pt-3">
              <Button
                type="submit"
                className="flex-1 bg-black hover:bg-slate-900 text-white h-8 md:h-10 text-xs md:text-sm"
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Password form */}
        <form
          onSubmit={handleChangePasswordSubmit}
          className="space-y-3 md:space-y-4 mt-4"
        >
          {/* Password Change Section */}
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 border-b pb-2">
              Change Password
            </h3>
            <p className="text-xs md:text-sm text-gray-600">
              Leave password fields empty if you don&apos;t want to change your
              password
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {/* Current Password */}
              <div className="space-y-1 md:space-y-2">
                <label
                  htmlFor="currentPassword"
                  className="text-xs md:text-sm font-medium text-gray-700"
                >
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Current password"
                    value={formData.currentPassword}
                    onChange={(e) =>
                      handleInputChange('currentPassword', e.target.value)
                    }
                    className={`pl-8 md:pl-10 pr-8 md:pr-10 h-8 md:h-10 text-sm ${
                      errors.currentPassword ? 'border-red-500' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-3 w-3 md:h-4 md:w-4" />
                    ) : (
                      <Eye className="h-3 w-3 md:h-4 md:w-4" />
                    )}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-xs text-red-500">
                    {errors.currentPassword}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-1 md:space-y-2">
                <label
                  htmlFor="newPassword"
                  className="text-xs md:text-sm font-medium text-gray-700"
                >
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="New password"
                    value={formData.newPassword}
                    onChange={(e) =>
                      handleInputChange('newPassword', e.target.value)
                    }
                    className={`pl-8 md:pl-10 pr-8 md:pr-10 h-8 md:h-10 text-sm ${
                      errors.newPassword ? 'border-red-500' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-3 w-3 md:h-4 md:w-4" />
                    ) : (
                      <Eye className="h-3 w-3 md:h-4 md:w-4" />
                    )}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-xs text-red-500">{errors.newPassword}</p>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1 md:space-y-2">
                <label
                  htmlFor="confirmNewPassword"
                  className="text-xs md:text-sm font-medium text-gray-700"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                  <Input
                    id="confirmNewPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={formData.confirmNewPassword}
                    onChange={(e) =>
                      handleInputChange('confirmNewPassword', e.target.value)
                    }
                    className={`pl-8 md:pl-10 pr-8 md:pr-10 h-8 md:h-10 text-sm ${
                      errors.confirmNewPassword ? 'border-red-500' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-3 w-3 md:h-4 md:w-4" />
                    ) : (
                      <Eye className="h-3 w-3 md:h-4 md:w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmNewPassword && (
                  <p className="text-xs text-red-500">
                    {errors.confirmNewPassword}
                  </p>
                )}
              </div>
            </div>
          </div>
          {/* Action Buttons for password */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-2 md:pt-3">
            <Button
              type="submit"
              className="flex-1 bg-black hover:bg-slate-900 text-white h-8 md:h-10 text-xs md:text-sm"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                'Changing Password...'
              ) : (
                <>
                  <Save className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
