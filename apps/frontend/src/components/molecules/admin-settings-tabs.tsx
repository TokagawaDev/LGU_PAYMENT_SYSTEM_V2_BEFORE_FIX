'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SERVICES, ServiceId } from '@shared/constants/services';
import { toast } from 'react-hot-toast';
import { 
  getPaymentServiceFormConfig,
  getCustomPaymentServices,
  createCustomPaymentService,
  updateCustomPaymentService,
  deleteCustomPaymentService,
  updateCustomPaymentServiceEnabled,
  getCustomPaymentService,
  getCustomApplicationServices,
  createCustomApplicationService,
  updateCustomApplicationService,
  deleteCustomApplicationService,
  updateCustomApplicationServiceVisible,
  type CustomApplicationService,
} from '@/lib/api/admin';
import {
  Trash2,
  Building2,
  FileText,
  Settings,
  Eye,
  EyeOff,
  Edit,
  Plus,
  GripVertical,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { BusinessPermitCustomizationCard } from '@/components/molecules/application-form-customization-card';
import { PaymentServiceCustomizationCard } from '@/components/molecules/payment-service-customization-card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export type AdminSettings = {
  city: { name: string; fullName: string };
  branding: {
    systemName: string;
    systemDescription: string;
  };
  assets: {
    headerBackgroundUrl: string;
    sealLogoUrl: string;
    faviconUrl: string;
  };
  contact: {
    address: string;
    phone: string;
    email: string;
    website: string;
  };
  faq: Array<{
    question: string;
    answer: string;
    category: 'general' | 'payment' | 'technical' | 'account';
  }>;
  enabledServices?: Record<ServiceId, boolean>;
  customPaymentServices?: Array<{
    id: string;
    title: string;
    description: string;
    baseAmount: number;
    processingFee: number;
    enabled?: boolean;
    formFields?: Array<{
      id: string;
      label: string;
      type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea' | 'file' | 'date' | 'cost' | 'password' | 'radio' | 'checkbox';
      required?: boolean;
      placeholder?: string;
      reminder?: string;
      options?: Array<{ value: string; label: string }>;
      validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        message?: string;
      };
    }>;
  }>;
  addOnServices?: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    visible?: boolean; // Controls visibility in citizen portal (default hidden)
    formFields?: Array<{
      type: string;
      label: string;
      placeholder?: string;
      required?: boolean;
      options?: Array<{ value: string; label: string }>;
      stepIndex?: number;
    }>;
    formSteps?: Array<{
      index: number;
      letter: string;
      label: string;
      buttonTexts?: {
        back?: string;
        next?: string;
        submit?: string;
        saveAsDraft?: string;
        cancel?: string;
      };
      buttonVisibility?: {
        back?: boolean;
        next?: boolean;
        submit?: boolean;
        saveAsDraft?: boolean;
        cancel?: boolean;
      };
    }>;
    buttonTexts?: {
      back?: string;
      next?: string;
      submit?: string;
      saveAsDraft?: string;
      cancel?: string;
    };
    buttonVisibility?: {
      back?: boolean;
      next?: boolean;
      submit?: boolean;
      saveAsDraft?: boolean;
      cancel?: boolean;
    };
  }>;
  convenienceFee?: {
    card?: { percent?: number; fixed?: number; min?: number };
    digitalWallets?: { percent?: number; fixed?: number; min?: number };
    dob?: { percent?: number; fixed?: number; min?: number };
    qrph?: { percent?: number; fixed?: number; min?: number };
  };
};

interface TabComponentProps {
  settings: AdminSettings;
  onSettingsChange: (settings: AdminSettings) => void;
  onSave: () => void | Promise<void>;
  onSaveWithAddOns?: (addOnServices: NonNullable<AdminSettings['addOnServices']>) => void | Promise<void>; // Optional: save with specific addOnServices
  onSaveWithCustomPaymentServices?: (customPaymentServices: NonNullable<AdminSettings['customPaymentServices']>) => void | Promise<void>; // Optional: save with specific customPaymentServices
  isSaving: boolean;
}

export function BrandingTab({ settings, onSettingsChange }: TabComponentProps) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Branding Settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">City Name</label>
          <Input
            value={settings.city.name}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                city: { ...settings.city, name: e.target.value },
              })
            }
            placeholder="Enter city name"
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">City Full Name</label>
          <Input
            value={settings.city.fullName}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                city: { ...settings.city, fullName: e.target.value },
              })
            }
            placeholder="Enter full city name"
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">System Name</label>
          <Input
            value={settings.branding.systemName}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                branding: {
                  ...settings.branding,
                  systemName: e.target.value,
                },
              })
            }
            placeholder="Enter system name"
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">System Description</label>
          <Input
            value={settings.branding.systemDescription}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                branding: {
                  ...settings.branding,
                  systemDescription: e.target.value,
                },
              })
            }
            placeholder="Enter system description"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

export function ContactTab({ settings, onSettingsChange }: TabComponentProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Address</label>
        <Input
          value={settings.contact?.address || ''}
          onChange={(e) =>
            onSettingsChange({
              ...settings,
              contact: {
                ...(settings.contact || {
                  address: '',
                  phone: '',
                  email: '',
                  website: '',
                }),
                address: e.target.value,
              },
            })
          }
          placeholder="Enter address"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Phone</label>
        <Input
          value={settings.contact?.phone || ''}
          onChange={(e) =>
            onSettingsChange({
              ...settings,
              contact: {
                ...(settings.contact || {
                  address: '',
                  phone: '',
                  email: '',
                  website: '',
                }),
                phone: e.target.value,
              },
            })
          }
          placeholder="Enter phone number"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Email</label>
        <Input
          value={settings.contact?.email || ''}
          onChange={(e) =>
            onSettingsChange({
              ...settings,
              contact: {
                ...(settings.contact || {
                  address: '',
                  phone: '',
                  email: '',
                  website: '',
                }),
                email: e.target.value,
              },
            })
          }
          placeholder="Enter email address"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Website</label>
        <Input
          value={settings.contact?.website || ''}
          onChange={(e) =>
            onSettingsChange({
              ...settings,
              contact: {
                ...(settings.contact || {
                  address: '',
                  phone: '',
                  email: '',
                  website: '',
                }),
                website: e.target.value,
              },
            })
          }
          placeholder="Enter website URL"
        />
      </div>
    </div>
  );
}

const FAQ_CATEGORIES = ['general', 'payment', 'technical', 'account'] as const;

export function FaqTab({ settings, onSettingsChange }: TabComponentProps) {
  const faq = settings.faq ?? [];
  const updateFaq = (next: AdminSettings['faq']) =>
    onSettingsChange({ ...settings, faq: next });
  const addItem = () =>
    updateFaq([...faq, { question: '', answer: '', category: 'general' }]);
  const updateItem = (index: number, field: 'question' | 'answer' | 'category', value: string) => {
    const next = faq.slice();
    next[index] = { ...next[index], [field]: value };
    updateFaq(next);
  };
  const removeItem = (index: number) =>
    updateFaq(faq.filter((_, i) => i !== index));

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">FAQ</h2>
      <div className="space-y-4">
        {faq.map((item, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">FAQ {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Input
              value={item.question}
              onChange={(e) => updateItem(index, 'question', e.target.value)}
              placeholder="Question"
            />
            <Input
              value={item.answer}
              onChange={(e) => updateItem(index, 'answer', e.target.value)}
              placeholder="Answer"
            />
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={item.category}
              onChange={(e) => updateItem(index, 'category', e.target.value)}
            >
              {FAQ_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addItem}>
          Add FAQ Item
        </Button>
      </div>
    </div>
  );
}

export function ServicesTab({
  settings,
  onSettingsChange,
  onSave: _onSave,
  onSaveWithCustomPaymentServices: _onSaveWithCustomPaymentServices,
}: TabComponentProps) {
  const enabledServices: Record<ServiceId, boolean> = settings.enabledServices ?? ({} as Record<ServiceId, boolean>);
  const [customPaymentServices, setCustomPaymentServices] = useState<NonNullable<AdminSettings['customPaymentServices']>>([]);
  const [loadingCustomServices, setLoadingCustomServices] = useState(true);
  const setEnabled = (id: ServiceId, enabled: boolean) =>
    onSettingsChange({
      ...settings,
      enabledServices: { ...enabledServices, [id]: enabled } as Record<ServiceId, boolean>,
    });
  const [editingServiceId, setEditingServiceId] = useState<ServiceId | null>(null);
  const [editingCustomServiceId, setEditingCustomServiceId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomServiceModalOpen, setIsCustomServiceModalOpen] = useState(false);
  const [customTitles, setCustomTitles] = useState<Partial<Record<ServiceId, string>>>({});

  // Load custom payment services from the new endpoint
  useEffect(() => {
    const loadCustomServices = async () => {
      setLoadingCustomServices(true);
      try {
        const services = await getCustomPaymentServices();
        // Convert to AdminSettings format
        const formattedServices = services.map(s => ({
          id: s.id,
          title: s.title,
          description: s.description,
          baseAmount: s.baseAmount,
          processingFee: s.processingFee,
          enabled: s.enabled,
          formFields: s.formFields,
        }));
        setCustomPaymentServices(formattedServices);
      } catch (error) {
        console.error('Failed to load custom payment services:', error);
        toast.error('Failed to load custom payment services');
      } finally {
        setLoadingCustomServices(false);
      }
    };
    void loadCustomServices();
  }, []);

  // Fetch custom titles for all services
  useEffect(() => {
    const fetchCustomTitles = async () => {
      const titles: Partial<Record<ServiceId, string>> = {} as Partial<Record<ServiceId, string>>;
      await Promise.all(
        SERVICES.map(async (service) => {
          try {
            const config = await getPaymentServiceFormConfig(service.id);
            if (config?.title) {
              titles[service.id] = config.title;
            }
          } catch {
            // Ignore errors, use default title
          }
        })
      );
      setCustomTitles(titles);
    };
    void fetchCustomTitles();
  }, [isModalOpen]); // Refetch when modal closes to get updated titles

  const handleEditService = (serviceId: ServiceId) => {
    setEditingServiceId(serviceId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingServiceId(null);
  };

  const handleCreateNewCustomService = () => {
    // Clean up any existing temp forms before creating new one
    const cleanedServices = customPaymentServices.filter(s => s.id === 'temp-new-service');
    if (cleanedServices.length !== customPaymentServices.length) {
      onSettingsChange({ ...settings, customPaymentServices: cleanedServices });
    }
    
    setEditingCustomServiceId(null);
    setIsCustomServiceModalOpen(true);
    
    toast.success('Payment service builder opened! Add a title, fields, and amounts, then click "Apply" to save.');
  };

  const handleEditCustomService = (serviceId: string) => {
    setEditingCustomServiceId(serviceId);
    setIsCustomServiceModalOpen(true);
  };

  const handleCloseCustomServiceModal = () => {
    // Clean up temp services when closing modal
    const cleanedServices = customPaymentServices.filter(s => s.id === 'temp-new-service');
    if (cleanedServices.length !== customPaymentServices.length) {
      onSettingsChange({ ...settings, customPaymentServices: cleanedServices });
    }
    
    setIsCustomServiceModalOpen(false);
    setEditingCustomServiceId(null);
  };

  const handleDeleteCustomService = async (serviceId: string) => {
    const serviceToDelete = customPaymentServices.find(s => s.id === serviceId);
    if (!serviceToDelete) {
      toast.error('Service not found');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${serviceToDelete.title || serviceId}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await deleteCustomPaymentService(serviceId);
      // Remove from local state
      const updated = customPaymentServices.filter(s => s.id !== serviceId);
      setCustomPaymentServices(updated);
      toast.success(`Service "${serviceToDelete.title}" deleted successfully`);
    } catch (error) {
      console.error('Failed to delete service:', error);
      toast.error('Failed to delete service. Please try again.');
    }
  };

  const handleToggleCustomServiceEnabled = async (serviceId: string) => {
    const service = customPaymentServices.find(s => s.id === serviceId);
    if (!service) {
      toast.error('Service not found');
      return;
    }

    const currentEnabled = service.enabled !== undefined ? service.enabled : true;
    const newEnabled = !currentEnabled;

    try {
      await updateCustomPaymentServiceEnabled(serviceId, newEnabled);
      // Update local state
      const updated = customPaymentServices.map((item) =>
        item.id === serviceId ? { ...item, enabled: newEnabled } : item
      );
      setCustomPaymentServices(updated);
      toast.success(
        newEnabled
          ? `Service "${service.title}" is now enabled`
          : `Service "${service.title}" is now disabled`
      );
    } catch (error) {
      console.error('Failed to update service status:', error);
      toast.error('Failed to update service status. Please try again.');
    }
  };

  // Filter out temp services and ensure valid services
  const createdCustomServices = customPaymentServices
    .filter(s => {
      // Exclude temp services
      if (s.id === 'temp-new-service') return false;
      // Must have valid id
      if (!s.id || typeof s.id !== 'string') return false;
      // Must have valid title (non-empty after trim)
      const title = s.title?.trim();
      if (!title || title.length === 0) return false;
      return true;
    })
    .filter((service, index, self) => 
      // Keep only the first occurrence of each ID to prevent duplicates
      index === self.findIndex(s => s.id === service.id)
    );

  // Show loading state
  if (loadingCustomServices) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading payment services...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-6 border border-blue-100 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Payment Management Setting
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Manage payment services and customize their form fields. Enable or disable services and configure 
              form fields, base amounts, and processing fees for each service. Create, edit, or delete custom payment services.
            </p>
          </div>
        </div>
      </div>

      {/* Predefined Payment Services */}
      <Card className="border-2 border-gray-200 bg-white shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-gray-900">
            Predefined Payment Services
          </CardTitle>
          <CardDescription className="text-sm text-gray-600 mt-1">
            Manage predefined payment services. Toggle availability and customize form fields for each service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map((service) => {
              const isEnabled = enabledServices[service.id] !== false;
              return (
                <Card
                  key={service.id}
                  className="group border-2 border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg transition-all duration-200"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-500 text-white flex-shrink-0 shadow-sm">
                        <Settings className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold text-gray-900 truncate">
                          {customTitles[service.id] || service.name}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-col gap-3">
                      {/* Enable/Disable Toggle */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200">
                        <div className="flex items-center gap-2">
                          {isEnabled ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-xs font-medium text-gray-700">
                            {isEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => setEnabled(service.id, checked)}
                        />
                      </div>
                      {/* Customize Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditService(service.id)}
                        className="w-full gap-1 text-xs hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Customize Fields
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom Payment Services */}
      <Card className="border-2 border-gray-200 bg-white shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                Custom Payment Services
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-1">
                Create and manage custom payment services with full CRUD functionality.
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={handleCreateNewCustomService}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {createdCustomServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {createdCustomServices.map((service) => {
                const isEnabled = service.enabled !== false;
                return (
                  <Card
                    key={service.id}
                    className="group border-2 border-gray-200 bg-white hover:border-indigo-300 hover:shadow-lg transition-all duration-200"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500 text-white flex-shrink-0 shadow-sm">
                          <Settings className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-semibold text-gray-900 truncate">
                            {service.title}
                          </CardTitle>
                          {service.description && (
                            <p className="text-xs text-gray-600 truncate mt-1 line-clamp-2">
                              {service.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">
                              {service.formFields?.length || 0} fields
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              Base: ₱{((service.baseAmount || 0) / 100).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-col gap-3">
                        {/* Enable/Disable Toggle */}
                        <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200">
                          <div className="flex items-center gap-2">
                            {isEnabled ? (
                              <Eye className="h-4 w-4 text-green-600" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-xs font-medium text-gray-700">
                              {isEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={() => handleToggleCustomServiceEnabled(service.id)}
                          />
                        </div>
                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCustomService(service.id)}
                            className="flex-1 gap-1 text-xs hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCustomService(service.id)}
                            className="flex-1 gap-1 text-xs hover:bg-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 rounded-full bg-gray-100">
                  <Settings className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">No custom payment services yet</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Click &quot;Create New Service&quot; above to create your first custom payment service.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Dialog for Service Customization */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseModal();
        }
      }}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
                    <Settings className="h-5 w-5" />
                  </span>
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Customize: {editingServiceId 
                      ? (customTitles[editingServiceId] || SERVICES.find(s => s.id === editingServiceId)?.name || 'Service')
                      : 'Service'}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-2">
                  Configure form fields, base amount, and processing fee for this payment service.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {editingServiceId && (
              <PaymentServiceCustomizationCard
                serviceId={editingServiceId}
                onClose={handleCloseModal}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog for Custom Payment Service Form Builder */}
      <Dialog open={isCustomServiceModalOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseCustomServiceModal();
        }
      }}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
                    <Settings className="h-5 w-5" />
                  </span>
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {editingCustomServiceId ? 'Edit Custom Payment Service' : 'Create'}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-2">
                  {editingCustomServiceId 
                    ? 'Edit and customize your custom payment service. Changes will be saved when you click "Apply".'
                    : 'Create, customize, and manage custom payment services. Configure title, description, form fields, base amount, and processing fee.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <CustomPaymentServiceFormBuilder
              customPaymentServices={customPaymentServices}
              editingServiceId={editingCustomServiceId}
              onUpdateServices={(next) => {
                setCustomPaymentServices(next);
              }}
              onServiceCreated={async () => {
                // Reload custom services after creation
                const services = await getCustomPaymentServices();
                const formattedServices = services.map(s => ({
                  id: s.id,
                  title: s.title,
                  description: s.description,
                  baseAmount: s.baseAmount,
                  processingFee: s.processingFee,
                  enabled: s.enabled,
                  formFields: s.formFields,
                }));
                setCustomPaymentServices(formattedServices);
              }}
              onServiceUpdated={async () => {
                // Reload custom services after update
                const services = await getCustomPaymentServices();
                const formattedServices = services.map(s => ({
                  id: s.id,
                  title: s.title,
                  description: s.description,
                  baseAmount: s.baseAmount,
                  processingFee: s.processingFee,
                  enabled: s.enabled,
                  formFields: s.formFields,
                }));
                setCustomPaymentServices(formattedServices);
              }}
              onClose={handleCloseCustomServiceModal}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Custom Payment Service Form Builder Component
interface CustomPaymentServiceFormBuilderProps {
  customPaymentServices: NonNullable<AdminSettings['customPaymentServices']>;
  editingServiceId: string | null;
  onUpdateServices: (services: NonNullable<AdminSettings['customPaymentServices']>) => void;
  onServiceCreated?: () => void | Promise<void>;
  onServiceUpdated?: () => void | Promise<void>;
  onClose: () => void;
}

function CustomPaymentServiceFormBuilder({
  customPaymentServices,
  editingServiceId,
  onUpdateServices,
  onServiceCreated,
  onServiceUpdated,
  onClose,
}: CustomPaymentServiceFormBuilderProps): React.JSX.Element {
  const isNewService = editingServiceId === null;
  const targetId = editingServiceId || 'temp-new-service';
  const index = customPaymentServices.findIndex((s) => s.id === targetId);
  const service = index >= 0 ? customPaymentServices[index] : null;
  const [lastSavedState, setLastSavedState] = useState<string>('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const prevEditingServiceIdRef = useRef<string | null>(editingServiceId);

  const FIELD_TYPES = [
    'text',
    'number',
    'email',
    'password',
    'date',
    'radio',
    'checkbox',
    'file',
    'tel',
    'select',
    'textarea',
    'cost',
  ] as const;

  const [selectedFieldType, setSelectedFieldType] = useState<typeof FIELD_TYPES[number] | ''>('');

  // Load service data when editing
  useEffect(() => {
    if (!isNewService && editingServiceId && !service) {
      const loadService = async () => {
        try {
          const loadedService = await getCustomPaymentService(editingServiceId);
          const formattedService: NonNullable<AdminSettings['customPaymentServices']>[number] = {
            id: loadedService.id,
            title: loadedService.title,
            description: loadedService.description,
            baseAmount: loadedService.baseAmount,
            processingFee: loadedService.processingFee,
            enabled: loadedService.enabled,
            formFields: loadedService.formFields,
          };
          // Add to local state if not already present
          const existingIndex = customPaymentServices.findIndex(s => s.id === editingServiceId);
          if (existingIndex === -1) {
            onUpdateServices([...customPaymentServices, formattedService]);
          }
        } catch (error) {
          console.error('Failed to load service:', error);
          toast.error('Failed to load service data');
        }
      };
      void loadService();
    }
  }, [isNewService, editingServiceId, service, customPaymentServices, onUpdateServices]);

  // Initialize new service when modal opens for new service creation
  useEffect(() => {
    if (isNewService && !service) {
      const tempServiceExists = customPaymentServices.some(s => s.id === 'temp-new-service');
      if (!tempServiceExists) {
        const cleanedServices = customPaymentServices.filter(s => s.id !== 'temp-new-service');
        
        const newService: NonNullable<AdminSettings['customPaymentServices']>[number] = {
          id: 'temp-new-service',
          title: '',
          description: '',
          baseAmount: 0,
          processingFee: 0,
          enabled: true,
          formFields: [],
        };
        onUpdateServices([...cleanedServices, newService]);
      }
    }
  }, [isNewService, editingServiceId, service, customPaymentServices, onUpdateServices]);

  // Reset lastSavedState when switching between services or when service is first loaded
  useEffect(() => {
    // Check if editingServiceId actually changed
    const serviceIdChanged = prevEditingServiceIdRef.current !== editingServiceId;
    
    if (serviceIdChanged) {
      // Service ID changed, reset lastSavedState
      prevEditingServiceIdRef.current = editingServiceId;
      if (service) {
        setLastSavedState(JSON.stringify(service));
      } else {
        setLastSavedState('');
      }
    } else if (service && !lastSavedState) {
      // Same service ID but service just loaded (was null, now has value)
      setLastSavedState(JSON.stringify(service));
    }
  }, [editingServiceId, service, lastSavedState]);

  if (!service) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Loading service...</p>
        </div>
      </div>
    );
  }

  const updateService = (updates: Partial<typeof service>) => {
    const updated = customPaymentServices.map((s) =>
      s.id === targetId ? { ...s, ...updates } : s
    );
    onUpdateServices(updated);
  };

  const addField = (type?: typeof FIELD_TYPES[number]) => {
    const fieldType = type || selectedFieldType;
    if (!fieldType) {
      toast.error('Please select a field type');
      return;
    }
    
    // Check if title is set
    const title = (service.title || '').trim();
    if (!title) {
      toast.error('Please enter a service title first');
      return;
    }
    
    const formFields = service.formFields || [];
    if (fieldType === 'cost') {
      const hasCost = formFields.some((f) => f.type === 'cost');
      if (hasCost) {
        toast.error('Only one cost field is allowed');
        return;
      }
    }
    
    // Auto-generate ID based on Title, type, and count
    // Format: slugified_title_type_count
    const slugify = (s: string): string =>
      String(s)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'service';
    
    const titleSlug = slugify(title);
    const typeSlug = fieldType;
    
    // Count existing fields of the same type
    const sameTypeFields = formFields.filter(f => f.type === fieldType);
    const count = sameTypeFields.length + 1;
    
    const fieldId = `${titleSlug}_${typeSlug}_${count}`;
    
    const newField = {
      id: fieldId,
      label: `New ${fieldType} field`,
      type: fieldType,
      required: false,
    };
    updateService({
      formFields: [...formFields, newField] as typeof service.formFields,
    });
    
    // Reset selection after adding
    setSelectedFieldType('');
  };

  const updateField = (fieldIndex: number, updates: Partial<NonNullable<typeof service.formFields>[number]>) => {
    const formFields = service.formFields || [];
    const updated = [...formFields];
    updated[fieldIndex] = { ...updated[fieldIndex], ...updates };
    updateService({ formFields: updated });
  };

  const removeField = (fieldIndex: number) => {
    const formFields = service.formFields || [];
    updateService({
      formFields: formFields.filter((_, i) => i !== fieldIndex),
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = draggedIndex;
    
    if (dragIndex === null || dragIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const formFields = service.formFields || [];
    const updated = [...formFields];
    const [removed] = updated.splice(dragIndex, 1);
    updated.splice(dropIndex, 0, removed);
    
    updateService({ formFields: updated });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleApply = async () => {
    const title = (service.title || '').trim();
    if (!title) {
      toast.error('Service title is required');
      return;
    }

    const formFields = service.formFields || [];
    const costCount = formFields.filter((f) => f.type === 'cost').length;
    if (costCount > 1) {
      toast.error('Only one cost field is allowed');
      return;
    }

    // Generate a proper ID if it's a new service
    const slugify = (s: string): string =>
      String(s)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'payment';

    let finalId = service.id;
    if (isNewService) {
      // Auto-generate ID: title_date_time_count
      const titleSlug = slugify(title);
      const now = new Date();
      const date = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
      const time = now.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS
      
      // Count existing services with the same title created today
      const todayServices = customPaymentServices.filter(s => {
        if (s.id === 'temp-new-service') return false;
        // Check if service ID starts with title and date
        const idParts = s.id.split('_');
        return idParts[0] === titleSlug && idParts[1] === date;
      });
      const count = todayServices.length + 1;
      
      finalId = `${titleSlug}_${date}_${time}_${count}`;
    }

    // Auto-generate field IDs based on Title, type, and count
    const titleSlugForFields = slugify(title);
    const fieldTypeCounts: Record<string, number> = {};
    
    // Validate and auto-generate IDs for form fields
    const sanitizedFields = formFields.map((field, index) => {
      const fieldLabel = (field.label || '').trim();
      
      if (!fieldLabel) {
        throw new Error(`Field label is required for field at index ${index}`);
      }
      
      // Auto-generate ID: title_type_count
      const fieldType = field.type;
      if (!fieldTypeCounts[fieldType]) {
        fieldTypeCounts[fieldType] = 0;
      }
      fieldTypeCounts[fieldType]++;
      const count = fieldTypeCounts[fieldType];
      const fieldId = `${titleSlugForFields}_${fieldType}_${count}`;
      
      const sanitized: NonNullable<typeof service.formFields>[number] = {
        id: fieldId,
        label: fieldLabel,
        type: field.type,
        required: Boolean(field.required),
      };
      if (field.placeholder) sanitized.placeholder = (field.placeholder || '').trim();
      if (field.reminder) sanitized.reminder = (field.reminder || '').trim();
      if ((field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && field.options && field.options.length > 0) {
        sanitized.options = field.options.filter((o) => o && o.label && o.label.trim().length > 0);
      }
      if (field.validation) sanitized.validation = field.validation;
      return sanitized;
    });

    const hasCost = costCount === 1;
    const baseAmount = hasCost ? 0 : Math.max(0, service.baseAmount || 0);
    const processingFee = Math.max(0, service.processingFee || 0);

    const finalService: NonNullable<AdminSettings['customPaymentServices']>[number] = {
      id: finalId,
      title,
      description: (service.description || '').trim(),
      baseAmount,
      processingFee,
      enabled: service.enabled !== false,
      formFields: sanitizedFields,
    };

    // Remove temp service from local state
    const cleanedServices = customPaymentServices.filter((s) => s.id !== 'temp-new-service');
    onUpdateServices(cleanedServices);

    try {
      if (isNewService) {
        // Create new service via API
        await createCustomPaymentService({
          title: finalService.title,
          description: finalService.description,
          baseAmount: finalService.baseAmount,
          processingFee: finalService.processingFee,
          enabled: finalService.enabled,
          formFields: finalService.formFields,
        });
        toast.success('Custom payment service created successfully!');
        if (onServiceCreated) {
          await onServiceCreated();
        }
      } else {
        // Update existing service via API
        await updateCustomPaymentService(finalId, {
          title: finalService.title,
          description: finalService.description,
          baseAmount: finalService.baseAmount,
          processingFee: finalService.processingFee,
          enabled: finalService.enabled,
          formFields: finalService.formFields,
        });
        toast.success('Custom payment service updated successfully!');
        if (onServiceUpdated) {
          await onServiceUpdated();
        }
      }
      setLastSavedState(JSON.stringify(finalService));
      onClose();
    } catch (error) {
      console.error('Failed to save service:', error);
      toast.error('Failed to save service. Please try again.');
    }
  };

  const hasChanges = JSON.stringify(service) !== lastSavedState;
  const hasTitle = !!(service.title || '').trim();
  const canCreate = isNewService ? hasTitle : (hasChanges && hasTitle);

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Title *</label>
            <Input
              value={service.title || ''}
              onChange={(e) => updateService({ title: e.target.value })}
              placeholder="Service title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Description</label>
            <Input
              value={service.description || ''}
              onChange={(e) => updateService({ description: e.target.value })}
              placeholder="Service description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Base Amount (in centavos)
            </label>
            <Input
              type="number"
              value={service.baseAmount ?? ''}
              disabled={(service.formFields || []).some((f) => f.type === 'cost')}
              onChange={(e) =>
                updateService({
                  baseAmount: Number(e.target.value) || 0,
                })
              }
            />
            {(service.formFields || []).some((f) => f.type === 'cost') && (
              <p className="text-xs text-gray-500 mt-1">
                Base amount disabled when cost field is present
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Processing Fee (in centavos)
            </label>
            <Input
              type="number"
              value={service.processingFee ?? ''}
              onChange={(e) =>
                updateService({
                  processingFee: Number(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Form Fields</h3>
            <p className="text-sm text-gray-500 mt-1">
              Add and configure form fields for this payment service
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedFieldType}
              onChange={(e) => setSelectedFieldType(e.target.value as typeof FIELD_TYPES[number] | '')}
              className="flex h-9 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select field type...</option>
              {FIELD_TYPES.map((type) => {
                const isCost = type === 'cost';
                const hasCost = (service.formFields || []).some((f) => f.type === 'cost');
                const disabled = isCost && hasCost;
                return (
                  <option 
                    key={type} 
                    value={type}
                    disabled={disabled}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}{disabled ? ' (already added)' : ''}
                  </option>
                );
              })}
            </select>
            <Button
              variant="default"
              size="sm"
              onClick={() => addField()}
              disabled={!selectedFieldType || !(service.title || '').trim()}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {(service.formFields || []).length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-sm text-gray-500">No fields yet. Select a field type and click &apos;Add&apos; to create a new field.</p>
            </div>
          ) : (
            (service.formFields || []).map((field, index) => (
              <div
                key={field.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-all cursor-move ${
                  draggedIndex === index ? 'opacity-50' : ''
                } ${
                  dragOverIndex === index && draggedIndex !== index ? 'border-blue-500 border-2 bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center pt-1">
                    <GripVertical className="h-5 w-5 text-gray-400 cursor-grab active:cursor-grabbing" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-gray-700">Label *</label>
                        <Input
                          value={field.label || ''}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                          placeholder="Field label"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-gray-700">Placeholder</label>
                        <Input
                          value={field.placeholder || ''}
                          onChange={(e) => updateField(index, { placeholder: e.target.value })}
                          placeholder="Placeholder text"
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={field.required || false}
                          onChange={(e) => updateField(index, { required: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-gray-700">Required</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700">
                        Reminder <span className="text-red-500 text-xs">(Optional)</span>
                      </label>
                      <Input
                        value={field.reminder || ''}
                        onChange={(e) => updateField(index, { reminder: e.target.value })}
                        placeholder="Enter reminder text (displayed in red)"
                        className="text-sm"
                      />
                      {field.reminder && (
                        <p className="text-xs text-red-500 mt-1">{field.reminder}</p>
                      )}
                    </div>
                    {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                      <div className="mt-2 space-y-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <label className="block text-xs font-medium text-gray-700">
                            Options
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const currentOptions = field.options ?? [];
                              const newOption = { value: '', label: '' };
                              updateField(index, {
                                options: [...currentOptions, newOption],
                              });
                            }}
                            className="gap-1 h-7 text-xs w-full sm:w-auto"
                          >
                            <Plus className="h-3 w-3 shrink-0" />
                            Add Option
                          </Button>
                        </div>
                        {field.options && field.options.length > 0 ? (
                          <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-2 sm:p-3">
                            {field.options.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-md bg-white p-2 sm:p-3 border border-gray-200"
                              >
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="mb-0.5 block text-xs text-gray-500">
                                      Value <span className="text-gray-400">(optional - auto-generated)</span>
                                    </label>
                                    <Input
                                      value={option.value ?? ''}
                                      onChange={(e) => {
                                        const newOptions = [...(field.options || [])];
                                        newOptions[optIndex] = {
                                          ...newOptions[optIndex],
                                          value: e.target.value,
                                        };
                                        updateField(index, { options: newOptions });
                                      }}
                                      className="h-8 text-xs"
                                      placeholder="e.g., yes, no, or leave empty"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-0.5 block text-xs text-gray-500">
                                      Label (what users see)
                                    </label>
                                    <Input
                                      value={option.label ?? ''}
                                      onChange={(e) => {
                                        const newOptions = [...(field.options || [])];
                                        const newLabel = e.target.value;
                                        const currentValue = newOptions[optIndex]?.value ?? '';
                                        const oldLabel = newOptions[optIndex]?.label ?? '';
                                        const wasAutoGenerated =
                                          currentValue === '' ||
                                          currentValue === oldLabel.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                                        const autoValue =
                                          wasAutoGenerated && newLabel.trim() !== ''
                                            ? newLabel.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                                            : currentValue;
                                        newOptions[optIndex] = {
                                          value: autoValue,
                                          label: newLabel,
                                        };
                                        updateField(index, { options: newOptions });
                                      }}
                                      className="h-8 text-xs"
                                      placeholder="Display Label"
                                    />
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newOptions = (field.options || []).filter((_, i) => i !== optIndex);
                                    updateField(index, { options: newOptions });
                                  }}
                                  className="h-8 w-full sm:w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 shrink-0 justify-center"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 sm:p-4 text-center">
                            <p className="text-xs text-gray-500">
                              No options added yet. Click &quot;Add Option&quot; to create options for this field.
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 leading-relaxed">
                          <strong>Tip:</strong> Value is used internally (e.g., &quot;yes&quot;), Label is what users see
                          (e.g., &quot;Yes&quot;). If you leave value empty, it will be auto-generated from the label.
                        </p>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleApply}
          disabled={!canCreate}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          {isNewService ? 'Create' : 'Apply Changes'}
        </Button>
      </div>
    </div>
  );
}

export function AssetsTab({
  settings,
  onSettingsChange: _onSettingsChange,
  onUpload,
  uploading,
}: TabComponentProps & {
  onUpload: (file: File, type: 'header' | 'seal' | 'favicon') => Promise<void>;
  uploading: 'header' | 'seal' | 'favicon' | null;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Assets</h2>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">Header Background</label>
          {settings.assets?.headerBackgroundUrl && (
            <div className="mb-2 relative w-full h-32 rounded-lg overflow-hidden border border-gray-200">
              <Image
                src={settings.assets.headerBackgroundUrl}
                alt="Header background"
                fill
                className="object-cover"
              />
            </div>
          )}
          <Input
            type="file"
            accept="image/*"
            onChange={(e) =>
              e.target.files && onUpload(e.target.files[0], 'header')
            }
            disabled={uploading !== null}
            className="w-full"
          />
          {uploading === 'header' && (
            <p className="text-xs text-blue-600 mt-1">Uploading...</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">Seal Logo</label>
          {settings.assets?.sealLogoUrl && (
            <div className="mb-2 relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
              <Image
                src={settings.assets.sealLogoUrl}
                alt="Seal logo"
                fill
                className="object-contain"
              />
            </div>
          )}
          <Input
            type="file"
            accept="image/*"
            onChange={(e) =>
              e.target.files && onUpload(e.target.files[0], 'seal')
            }
            disabled={uploading !== null}
            className="w-full"
          />
          {uploading === 'seal' && (
            <p className="text-xs text-blue-600 mt-1">Uploading...</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">Favicon</label>
          {settings.assets?.faviconUrl && (
            <div className="mb-2 relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
              <Image
                src={settings.assets.faviconUrl}
                alt="Favicon"
                fill
                className="object-contain"
              />
            </div>
          )}
          <Input
            type="file"
            accept="image/png,image/x-icon,image/vnd.microsoft.icon"
            onChange={(e) =>
              e.target.files && onUpload(e.target.files[0], 'favicon')
            }
            disabled={uploading !== null}
            className="w-full"
          />
          {uploading === 'favicon' && (
            <p className="text-xs text-blue-600 mt-1">Uploading...</p>
          )}
        </div>
      </div>
    </div>
  );
}


/**
 * Application tab for admin settings.
 * Generate and manage application forms with full CRUD functionality.
 */
export function AddOnsTab({
  settings: _settings,
  onSettingsChange: _onSettingsChange,
  onSave,
  onSaveWithAddOns,
}: TabComponentProps): React.JSX.Element {
  const [customApplicationServices, setCustomApplicationServices] = useState<CustomApplicationService[]>([]);
  const [loadingCustomApplicationServices, setLoadingCustomApplicationServices] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);

  // Load custom application services from the new endpoint
  useEffect(() => {
    const loadCustomApplicationServices = async () => {
      setLoadingCustomApplicationServices(true);
      try {
        const services = await getCustomApplicationServices();
        setCustomApplicationServices(services);
      } catch (error) {
        console.error('Failed to load custom application services:', error);
        toast.error('Failed to load custom application services');
      } finally {
        setLoadingCustomApplicationServices(false);
      }
    };
    void loadCustomApplicationServices();
  }, []);

  const handleDeleteAddOn = async (addOnId: string) => {
    const serviceToDelete = customApplicationServices.find(a => a.id === addOnId);
    if (!serviceToDelete) {
      toast.error('Service not found');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${serviceToDelete.title || addOnId}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await deleteCustomApplicationService(addOnId);
      // Remove from local state
      setCustomApplicationServices(prev => prev.filter(a => a.id !== addOnId));
      toast.success(`Service "${serviceToDelete.title}" deleted successfully`);
    } catch (error) {
      console.error('Failed to delete service:', error);
      toast.error('Failed to delete service. Please try again.');
    }
  };

  const handleToggleVisibility = async (addOnId: string) => {
    const service = customApplicationServices.find((a) => a.id === addOnId);
    if (!service) {
      toast.error('Service not found');
      return;
    }

    const currentVisible = service.visible !== undefined ? service.visible : false;
    const newVisible = !currentVisible;

    try {
      await updateCustomApplicationServiceVisible(addOnId, newVisible);
      // Update local state
      setCustomApplicationServices(prev => prev.map(item => 
        item.id === addOnId ? { ...item, visible: newVisible } : item
      ));
      toast.success(
        newVisible
          ? `Service "${service.title}" is now visible in citizen portal`
          : `Service "${service.title}" is now hidden from citizen portal`
      );
    } catch (error) {
      console.error('Failed to update visibility:', error);
      toast.error('Failed to update service visibility. Please try again.');
    }
  };

  const handleEditAddOn = (addOnId: string) => {
    setEditingFormId(addOnId);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingFormId(null);
    setIsModalOpen(true);
    toast.success('Form builder opened! Add a title, steps, and fields, then click "Apply" to save.');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingFormId(null);
  };

  // Convert CustomApplicationService to AddOnItem format for BusinessPermitCustomizationCard
  const convertToAddOnItems = (services: CustomApplicationService[]): Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    visible?: boolean;
    formFields?: Array<{
      id?: string;
      type: string;
      label: string;
      placeholder?: string;
      required?: boolean;
      options?: Array<{ value: string; label: string }>;
      stepIndex?: number;
      helpText?: string;
      fieldOrder?: number;
      header?: string;
      reminder?: string;
    }>;
    formSteps?: Array<{
      index: number;
      letter: string;
      label: string;
      buttonTexts?: {
        back?: string;
        next?: string;
        submit?: string;
        saveAsDraft?: string;
        cancel?: string;
      };
      buttonVisibility?: {
        back?: boolean;
        next?: boolean;
        submit?: boolean;
        saveAsDraft?: boolean;
        cancel?: boolean;
      };
    }>;
    buttonTexts?: {
      back?: string;
      next?: string;
      submit?: string;
      saveAsDraft?: string;
      cancel?: string;
    };
    buttonVisibility?: {
      back?: boolean;
      next?: boolean;
      submit?: boolean;
      saveAsDraft?: boolean;
      cancel?: boolean;
    };
  }> => {
    return services.map(service => {
      const existingIds = new Set<string>();
      const ensureUniqueFieldId = () => {
        let id: string;
        do {
          id = `field_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        } while (existingIds.has(id));
        existingIds.add(id);
        return id;
      };
      const formFields = (service.formFields ?? []).map(f => {
        const fWithId = f as { id?: string };
        const id = fWithId.id && !existingIds.has(fWithId.id)
          ? (existingIds.add(fWithId.id), fWithId.id)
          : ensureUniqueFieldId();
        return { ...f, id };
      });
      return {
        id: service.id,
        title: service.title,
        description: service.description,
        icon: service.icon,
        color: service.color,
        visible: service.visible,
        formFields,
        formSteps: service.formSteps,
        buttonTexts: service.buttonTexts,
        buttonVisibility: service.buttonVisibility,
      };
    });
  };

  // Convert AddOnItem back to CustomApplicationService format
  const convertToCustomApplicationServices = (addOns: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    visible?: boolean;
    formFields?: Array<{
      type: string;
      label: string;
      placeholder?: string;
      required?: boolean;
      options?: Array<{ value: string; label: string }>;
      stepIndex?: number;
      helpText?: string;
      fieldOrder?: number;
      header?: string;
      reminder?: string;
    }>;
    formSteps?: Array<{
      index: number;
      letter: string;
      label: string;
      buttonTexts?: {
        back?: string;
        next?: string;
        submit?: string;
        saveAsDraft?: string;
        cancel?: string;
      };
      buttonVisibility?: {
        back?: boolean;
        next?: boolean;
        submit?: boolean;
        saveAsDraft?: boolean;
        cancel?: boolean;
      };
    }>;
    buttonTexts?: {
      back?: string;
      next?: string;
      submit?: string;
      saveAsDraft?: string;
      cancel?: string;
    };
    buttonVisibility?: {
      back?: boolean;
      next?: boolean;
      submit?: boolean;
      saveAsDraft?: boolean;
      cancel?: boolean;
    };
  }>): CustomApplicationService[] => {
    return addOns.map(addOn => ({
      id: addOn.id,
      title: addOn.title,
      description: addOn.description,
      icon: addOn.icon,
      color: addOn.color,
      visible: addOn.visible ?? false,
      formFields: (addOn.formFields ?? []).map(field => ({
        ...field,
        type: field.type as 'text' | 'number' | 'email' | 'password' | 'date' | 'file' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'submit' | 'reset',
      })),
      formSteps: addOn.formSteps ?? [],
      buttonTexts: addOn.buttonTexts,
      buttonVisibility: addOn.buttonVisibility,
    }));
  };

  const addOnsForCard = convertToAddOnItems(customApplicationServices);

  const createdForms = customApplicationServices.filter(a => {
    if (!a.id || typeof a.id !== 'string') return false;
    const title = a.title?.trim();
    if (!title || title.length === 0) return false;
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-500">
      <div className="rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6 border border-indigo-100 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
              Application Management Setting
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Create and manage dynamic application forms with full CRUD functionality. 
              Design custom forms with multiple steps, fields, and button configurations 
              that will be displayed to users in the citizen portal.
            </p>
          </div>
        </div>
      </div>

      {/* Create new Application Form Button/Card */}
      <Card className="group border-2 border-indigo-200/50 bg-gradient-to-br from-white via-indigo-50/30 to-white shadow-lg hover:shadow-xl transition-all duration-300 hover:border-indigo-300">
        <CardContent className="px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Button
              type="button"
              onClick={handleCreateNew}
              className="w-full sm:w-auto gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6"
            >
              <Settings className="h-5 w-5 shrink-0" />
              Create New Form
            </Button>
            <p className="text-xs text-gray-500 sm:ml-2">
              💡 Tip: You can create unlimited forms. Each form will appear as a tile below.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Application Forms Grid - Show all created forms */}
      <Card className="border-2 border-gray-200 bg-white shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-gray-900">
            Application Forms
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Manage all application forms created in the system. Each form appears as a tile with management options.
          </p>
        </CardHeader>
        <CardContent>
          {loadingCustomApplicationServices ? (
            <div className="text-center py-12 px-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-sm text-gray-600">Loading custom application services...</p>
            </div>
          ) : createdForms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {createdForms.map((addOn) => {
                const IconComponent = Building2; // You can map icons if needed
                return (
                  <Card
                    key={addOn.id}
                    className="group border-2 border-gray-200 bg-white hover:border-indigo-300 hover:shadow-lg transition-all duration-200"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${addOn.color || 'bg-blue-500'} text-white flex-shrink-0 shadow-sm`}>
                          <IconComponent className="h-5 w-5" />
            </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-semibold text-gray-900 truncate">
                            {addOn.title || addOn.id}
                          </CardTitle>
                          {addOn.description && (
                            <p className="text-xs text-gray-600 truncate mt-1 line-clamp-2">
                              {addOn.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">
                              {addOn.formFields?.length || 0} fields
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {addOn.formSteps?.length || 0} steps
                            </span>
            </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-col gap-3">
                        {/* Visibility Toggle - UI state only; hidden by default */}
                        <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200">
                          <div className="flex items-center gap-2">
                            {(addOn.visible === undefined ? false : addOn.visible) ? (
                              <Eye className="h-4 w-4 text-green-600" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-xs font-medium text-gray-700">
                              {(addOn.visible === undefined ? false : addOn.visible) ? 'Visible' : 'Hidden'}
                            </span>
                            <span className="text-xs text-gray-500">
                              in citizen portal
                            </span>
                    </div>
                          <Switch
                            checked={addOn.visible === undefined ? false : addOn.visible}
                            onCheckedChange={() => {
                              void handleToggleVisibility(addOn.id);
                            }}
                          />
                        </div>
                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                            onClick={() => handleEditAddOn(addOn.id)}
                            className="flex-1 gap-1 text-xs hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
                      >
                            <Settings className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                            variant="destructive"
                        size="sm"
                            onClick={() => handleDeleteAddOn(addOn.id)}
                            className="flex-1 gap-1 text-xs hover:bg-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
            </div>
        </CardContent>
      </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 rounded-full bg-gray-100">
                  <Building2 className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">No application forms yet</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Click &quot;Create New Form&quot; above to create your first application form.
                  </p>
                </div>
              </div>
              </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Dialog for Form Builder */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseModal();
        }
      }}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
                    <FileText className="h-5 w-5" />
                  </span>
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {editingFormId ? 'Edit Application Form' : 'Create New Application Service Form'}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-2">
                  {editingFormId 
                    ? 'Edit and customize your application form. Changes will be saved when you click &quot;Apply&quot;.'
                    : 'Create, customize, and manage application forms with full CRUD functionality. Configure title, description, steps, fields, buttons, and labels.'}
                </DialogDescription>
                </div>
              </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <BusinessPermitCustomizationCard
              addOns={addOnsForCard}
              onUpdateAddOns={(next) => {
                // Convert back to CustomApplicationService format and update state
                const updatedServices = convertToCustomApplicationServices(next);
                setCustomApplicationServices(updatedServices);
              }}
              onSave={async () => {
                // Wait a moment to ensure state has updated
                await new Promise(resolve => setTimeout(resolve, 200));
                if (onSave) {
                  await onSave();
                }
              }}
              onSaveWithData={async (updatedAddOns) => {
                const validAddOns = updatedAddOns.filter(a => a.id && a.id !== 'temp-new-form' && a.title?.trim());
                const existingIds = new Set(customApplicationServices.map(s => s.id));
                try {
                  for (const addOn of validAddOns) {
                    const payload = {
                      title: addOn.title.trim(),
                      description: addOn.description ?? '',
                      icon: addOn.icon ?? 'FileText',
                      color: addOn.color ?? 'bg-blue-500',
                      visible: addOn.visible ?? false,
                      formFields: (addOn.formFields ?? []).map(f => {
                        const field = { ...f };
                        delete (field as Record<string, unknown>).originalIndex;
                        delete (field as Record<string, unknown>).id;
                        const isOptionsField = ['select', 'radio', 'checkbox'].includes(f.type);
                        if (isOptionsField && Array.isArray(field.options)) {
                          field.options = field.options.filter(
                            (o) => o && typeof o.label === 'string' && o.label.trim().length >= 1
                          );
                        }
                        return {
                          ...field,
                          type: f.type as 'text' | 'number' | 'email' | 'password' | 'date' | 'file' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'submit' | 'reset',
                        };
                      }),
                      formSteps: addOn.formSteps ?? [],
                      buttonTexts: addOn.buttonTexts,
                      buttonVisibility: addOn.buttonVisibility,
                    };
                    const isNew = !existingIds.has(addOn.id);
                    if (isNew) {
                      const created = await createCustomApplicationService(payload);
                      existingIds.add(created.id);
                    } else {
                      await updateCustomApplicationService(addOn.id, payload);
                    }
                  }
                  const services = await getCustomApplicationServices();
                  setCustomApplicationServices(services);
                  if (onSaveWithAddOns) {
                    await onSaveWithAddOns(updatedAddOns);
                  } else if (onSave) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    await onSave();
                  }
                } catch (error) {
                  console.error('Error saving custom application services:', error);
                  throw error;
                }
              }}
              editingFormId={editingFormId}
              onClose={handleCloseModal}
            />
              </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
