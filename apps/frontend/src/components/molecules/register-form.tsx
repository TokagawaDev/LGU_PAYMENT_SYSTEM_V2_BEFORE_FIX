'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Eye,
  EyeOff,
  Mail,
  User,
  Phone,
  Lock,
  Building,
  Users,
} from 'lucide-react';
import { registerUser, checkEmailAvailability } from '@/lib/api';
import { ROUTES } from '@/constants/routes';

interface RegisterFormData {
  accountType: 'individual' | 'business';
  email: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  contact: string;
  password: string;
  confirmPassword: string;
  dataPrivacyConsent: boolean;
}

interface RegisterFormProps {
  onSubmit?: (data: RegisterFormData) => void;
}

export function RegisterForm({ onSubmit }: RegisterFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>({
    accountType: 'individual',
    email: '',
    firstName: '',
    middleName: '',
    lastName: '',
    gender: '',
    contact: '',
    password: '',
    confirmPassword: '',
    dataPrivacyConsent: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [errors, setErrors] = useState<Partial<RegisterFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterFormData> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.contact) {
      newErrors.contact = 'Contact number is required';
    } else if (!/^09\d{9}$/.test(formData.contact)) {
      newErrors.contact =
        'Use a valid PH mobile number (11 digits starting with 09)';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(
        formData.password
      )
    ) {
      newErrors.password =
        'Password must contain uppercase, lowercase, number, and special character';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.dataPrivacyConsent) {
      newErrors.dataPrivacyConsent = true;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setIsLoading(true);

    try {
      await registerUser({
        accountType: formData.accountType,
        email: formData.email,
        firstName: formData.firstName,
        middleName: formData.middleName || undefined,
        lastName: formData.lastName,
        gender: formData.gender as 'male' | 'female',
        contact: formData.contact,
        password: formData.password,
      });

      // Show success toast
      toast.success(
        'Account created successfully! Please check your email for verification code.'
      );

      // Call onSubmit prop if provided
      if (onSubmit) {
        await onSubmit(formData);
      }

      // Redirect to email verification page
      router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
    } catch {
      toast.error('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof RegisterFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleEmailBlur = async () => {
    if (formData.email && /\S+@\S+\.\S+/.test(formData.email)) {
      setIsCheckingEmail(true);
      try {
        const result = await checkEmailAvailability(formData.email);
        if (!result.available) {
          setErrors((prev) => ({
            ...prev,
            email: 'Email is already registered',
          }));
          toast.error('Email is already registered');
        }
      } catch {
        //
      } finally {
        setIsCheckingEmail(false);
      }
    }
  };

  const getFormTitle = () => {
    if (formData.accountType === 'individual') {
      return 'Owner Information';
    }
    return 'Representative Information';
  };

  return (
    <Card className="w-full max-w-4xl bg-white/95 backdrop-blur-sm shadow-xl mb-4">
      <CardHeader className="space-y-1 pb-3 md:pb-4">
        <CardTitle className="text-lg md:text-xl lg:text-2xl font-bold text-center text-gray-900">
          Create Account
        </CardTitle>
        <p className="text-xs md:text-sm text-center text-gray-600">
          Register for LGU Payment System
        </p>
      </CardHeader>
      <CardContent className="px-3 md:px-6 lg:px-8 pb-4 md:pb-6">
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          {/* Account Type Selection and Form Title - Single Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-end">
            <div className="space-y-2 md:space-y-3">
              <label className="text-xs md:text-sm font-medium text-gray-700">
                Account Type
              </label>
              <div className="flex space-x-3 md:space-x-4">
                <label className="flex items-center space-x-1 md:space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="accountType"
                    value="individual"
                    checked={formData.accountType === 'individual'}
                    onChange={(e) =>
                      handleInputChange(
                        'accountType',
                        e.target.value as 'individual' | 'business'
                      )
                    }
                    className="text-blue-600"
                  />
                  <Users className="h-3 w-3 md:h-4 md:w-4 text-gray-500" />
                  <span className="text-xs md:text-sm text-gray-700">
                    Individual
                  </span>
                </label>
                <label className="flex items-center space-x-1 md:space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="accountType"
                    value="business"
                    checked={formData.accountType === 'business'}
                    onChange={(e) =>
                      handleInputChange(
                        'accountType',
                        e.target.value as 'individual' | 'business'
                      )
                    }
                    className="text-blue-600"
                  />
                  <Building className="h-3 w-3 md:h-4 md:w-4 text-gray-500" />
                  <span className="text-xs md:text-sm text-gray-700">
                    Business
                  </span>
                </label>
              </div>
            </div>

            {/* Form Title */}
            <div className="md:text-right">
              <h3 className="text-base md:text-lg font-semibold text-gray-800 border-b pb-1 md:pb-2">
                {getFormTitle()}
              </h3>
            </div>
          </div>

          {/* Personal Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {/* Email */}
            <div className="space-y-1 md:space-y-2 lg:col-span-2">
              <label
                htmlFor="email"
                className="text-xs md:text-sm font-medium text-gray-700"
              >
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onBlur={handleEmailBlur}
                  className={`pl-8 md:pl-10 h-8 md:h-10 text-sm ${
                    errors.email ? 'border-red-500' : ''
                  }`}
                  disabled={isCheckingEmail}
                  required
                />
                {isCheckingEmail && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                  </div>
                )}
              </div>
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email}</p>
              )}
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
                className="h-8 md:h-10 text-sm"
              />
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
                onChange={(e) => handleInputChange('lastName', e.target.value)}
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

          {/* Gender and Password Fields Combined */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {/* Gender */}
            <div className="space-y-1 md:space-y-2">
              <label
                htmlFor="gender"
                className="text-xs md:text-sm font-medium text-gray-700"
              >
                Gender *
              </label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className={`flex h-8 md:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors.gender ? 'border-red-500' : ''
                }`}
                required
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              {errors.gender && (
                <p className="text-xs text-red-500">{errors.gender}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1 md:space-y-2">
              <label
                htmlFor="password"
                className="text-xs md:text-sm font-medium text-gray-700"
              >
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange('password', e.target.value)
                  }
                  className={`pl-8 md:pl-10 pr-8 md:pr-10 h-8 md:h-10 text-sm ${
                    errors.password ? 'border-red-500' : ''
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-3 w-3 md:h-4 md:w-4" />
                  ) : (
                    <Eye className="h-3 w-3 md:h-4 md:w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1 md:space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-xs md:text-sm font-medium text-gray-700"
              >
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange('confirmPassword', e.target.value)
                  }
                  className={`pl-8 md:pl-10 pr-8 md:pr-10 h-8 md:h-10 text-sm ${
                    errors.confirmPassword ? 'border-red-500' : ''
                  }`}
                  required
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
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Data Privacy Consent */}
          <div className="space-y-1 md:space-y-2">
            <div className="flex items-start space-x-2">
              <input
                id="dataPrivacyConsent"
                type="checkbox"
                checked={formData.dataPrivacyConsent}
                onChange={(e) =>
                  handleInputChange('dataPrivacyConsent', e.target.checked)
                }
                className={`mt-0.5 md:mt-1 h-3 w-3 md:h-4 md:w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${
                  errors.dataPrivacyConsent ? 'border-red-500' : ''
                }`}
                required
              />
              <label
                htmlFor="dataPrivacyConsent"
                className="text-xs md:text-sm text-gray-700 leading-tight"
              >
                I agree to the{' '}
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Data Privacy Policy
                </button>{' '}
                and consent to the collection and processing of my personal
                information in accordance with the Data Privacy Act of 2012.
              </label>
            </div>
            {errors.dataPrivacyConsent && (
              <p className="text-xs text-red-500">
                You must agree to the data privacy policy
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-2 md:pt-3">
            <Button
              type="submit"
              className="flex-1 bg-black hover:bg-slate-900 text-white h-8 md:h-10 text-xs md:text-sm"
              disabled={isLoading || isCheckingEmail}
            >
              {isLoading ? 'Creating Account...' : 'Submit'}
            </Button>
          </div>

          {/* Sign in link */}
          <div className="text-center pt-2">
            <p className="text-xs md:text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => router.push(ROUTES.HOME)}
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
              >
                Sign in here
              </button>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
