/**
 * Payment Services Configuration
 * Centralized configuration for all payment services, form fields, and validation rules
 */

import { SERVICE_IDS, ServiceId } from '@shared/constants/services';

export type PaymentServiceId = ServiceId;

export type FormStep = 'form' | 'review' | 'payment' | 'receipt';

export interface FormStepConfig {
  id: FormStep;
  title: string;
  description: string;
}

export interface PaymentServiceConfig {
  id: PaymentServiceId;
  title: string;
  description: string;
  icon: string;
  color: string;
  formFields: FormFieldConfig[];
  baseAmount: number;
  processingFee: number;
}

export interface FormFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea' | 'file' | 'date' | 'cost';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

/**
 * Form steps configuration
 */
export const FORM_STEPS: FormStepConfig[] = [
  {
    id: 'form',
    title: 'Service Information',
    description: 'Fill out the required information for your service request',
  },
  {
    id: 'review',
    title: 'Review and Confirm',
    description: 'Review your information and confirm the details',
  },
  {
    id: 'payment',
    title: 'Payment',
    description: 'Complete your payment securely',
  },
  {
    id: 'receipt',
    title: 'Receipt',
    description: 'Your payment has been processed successfully',
  },
];

/**
 * Payment services configuration
 */
export const PAYMENT_SERVICES: Partial<Record<PaymentServiceId, PaymentServiceConfig>> = {
  [SERVICE_IDS.BUSINESS_PERMITS]: {
    id: SERVICE_IDS.BUSINESS_PERMITS,
    title: 'Business Permits',
    description: 'Apply and pay for business permits and renewals',
    icon: 'Store',
    color: 'bg-blue-500',
    baseAmount: 2500,
    processingFee: 50,
    formFields: [
      {
        id: 'businessName',
        label: 'Business Name',
        type: 'text',
        required: true,
        placeholder: 'Enter your business name',
      },
      {
        id: 'businessType',
        label: 'Business Type',
        type: 'select',
        required: true,
        options: [
          { value: 'retail', label: 'Retail Store' },
          { value: 'restaurant', label: 'Restaurant/Food Service' },
          { value: 'manufacturing', label: 'Manufacturing' },
          { value: 'services', label: 'Professional Services' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        id: 'businessAddress',
        label: 'Business Address',
        type: 'textarea',
        required: true,
        placeholder: 'Enter complete business address',
      },
      {
        id: 'ownerName',
        label: 'Business Owner Name',
        type: 'text',
        required: true,
        placeholder: 'Enter business owner full name',
      },
      {
        id: 'contactNumber',
        label: 'Contact Number',
        type: 'tel',
        required: true,
        placeholder: '+63 XXX XXX XXXX',
      },
      {
        id: 'emailAddress',
        label: 'Email Address',
        type: 'email',
        required: true,
        placeholder: 'business@example.com',
      },
    ],
  },
  [SERVICE_IDS.BUILDING_PERMITS]: {
    id: SERVICE_IDS.BUILDING_PERMITS,
    title: 'Building Permits',
    description: 'Apply and pay for building permits and related clearances',
    icon: 'Building2',
    color: 'bg-indigo-500',
    baseAmount: 3000,
    processingFee: 60,
    formFields: [
      {
        id: 'projectTitle',
        label: 'Project Title',
        type: 'text',
        required: true,
        placeholder: 'e.g., Residential House Construction',
      },
      {
        id: 'projectAddress',
        label: 'Project Address',
        type: 'textarea',
        required: true,
        placeholder: 'Enter complete project address',
      },
      {
        id: 'ownerName',
        label: 'Owner Name',
        type: 'text',
        required: true,
        placeholder: 'Full name of property owner',
      },
      {
        id: 'contactNumber',
        label: 'Contact Number',
        type: 'tel',
        required: true,
        placeholder: '+63 XXX XXX XXXX',
      },
      {
        id: 'emailAddress',
        label: 'Email Address',
        type: 'email',
        required: false,
        placeholder: 'owner@example.com',
      },
    ],
  },
  [SERVICE_IDS.OCCUPANCY_PERMITS]: {
    id: SERVICE_IDS.OCCUPANCY_PERMITS,
    title: 'Occupancy Permits',
    description: 'Request and pay for occupancy permits',
    icon: 'Building',
    color: 'bg-cyan-500',
    baseAmount: 1200,
    processingFee: 25,
    formFields: [
      {
        id: 'buildingName',
        label: 'Building/Project Name',
        type: 'text',
        required: true,
      },
      {
        id: 'address',
        label: 'Address',
        type: 'textarea',
        required: true,
      },
      {
        id: 'ownerName',
        label: 'Owner Name',
        type: 'text',
        required: true,
      },
      {
        id: 'contactNumber',
        label: 'Contact Number',
        type: 'tel',
        required: true,
        placeholder: '+63 XXX XXX XXXX',
      },
    ],
  },
  [SERVICE_IDS.PROPERTY_TAXES]: {
    id: SERVICE_IDS.PROPERTY_TAXES,
    title: 'Property Taxes',
    description: 'Pay property tax, business tax, and other municipal taxes',
    icon: 'LandPlot',
    color: 'bg-green-500',
    baseAmount: 1500,
    processingFee: 30,
    formFields: [
      {
        id: 'taxType',
        label: 'Tax Type',
        type: 'select',
        required: true,
        options: [
          { value: 'property', label: 'Property Tax' },
          { value: 'business', label: 'Business Tax' },
          { value: 'real-estate', label: 'Real Estate Tax' },
          { value: 'other', label: 'Other Municipal Tax' },
        ],
      },
      {
        id: 'propertyId',
        label: 'Property ID / Tax Declaration Number',
        type: 'text',
        required: true,
        placeholder: 'Enter property ID or TD number',
      },
      {
        id: 'taxYear',
        label: 'Tax Year',
        type: 'select',
        required: true,
        options: [
          { value: '2024', label: '2024' },
          { value: '2023', label: '2023' },
          { value: '2022', label: '2022' },
        ],
      },
      {
        id: 'ownerName',
        label: 'Property Owner Name',
        type: 'text',
        required: true,
        placeholder: 'Enter property owner full name',
      },
      {
        id: 'propertyAddress',
        label: 'Property Address',
        type: 'textarea',
        required: true,
        placeholder: 'Enter complete property address',
      },
    ],
  },
  [SERVICE_IDS.MARKET_FEES]: {
    id: SERVICE_IDS.MARKET_FEES,
    title: 'Market Fees',
    description: 'Pay market stall fees and vendor permits',
    icon: 'ShoppingCart',
    color: 'bg-orange-500',
    baseAmount: 800,
    processingFee: 20,
    formFields: [
      {
        id: 'stallNumber',
        label: 'Stall Number',
        type: 'text',
        required: true,
        placeholder: 'Enter your stall number',
      },
      {
        id: 'vendorName',
        label: 'Vendor Name',
        type: 'text',
        required: true,
        placeholder: 'Enter vendor full name',
      },
      {
        id: 'marketLocation',
        label: 'Market Location',
        type: 'select',
        required: true,
        options: [
          { value: 'public-market', label: 'Public Market' },
          { value: 'night-market', label: 'Night Market' },
          { value: 'weekend-market', label: 'Weekend Market' },
        ],
      },
      {
        id: 'productType',
        label: 'Product Type',
        type: 'select',
        required: true,
        options: [
          { value: 'food', label: 'Food Products' },
          { value: 'clothing', label: 'Clothing & Accessories' },
          { value: 'electronics', label: 'Electronics' },
          { value: 'general', label: 'General Merchandise' },
        ],
      },
      {
        id: 'contactNumber',
        label: 'Contact Number',
        type: 'tel',
        required: true,
        placeholder: '+63 XXX XXX XXXX',
      },
    ],
  },
  [SERVICE_IDS.TRAFFIC_FINES]: {
    id: SERVICE_IDS.TRAFFIC_FINES,
    title: 'Traffic Fines',
    description: 'Settle traffic violation tickets and fines',
    icon: 'Receipt',
    color: 'bg-red-500',
    baseAmount: 500,
    processingFee: 20,
    formFields: [
      {
        id: 'ticketNumber',
        label: 'Ticket Number',
        type: 'text',
        required: true,
        placeholder: 'Enter violation ticket number',
      },
      {
        id: 'driverName',
        label: 'Driver Name',
        type: 'text',
        required: true,
      },
      {
        id: 'violation',
        label: 'Violation',
        type: 'text',
        required: true,
      },
    ],
  },
  [SERVICE_IDS.TRUCK_PERMIT_FEES]: {
    id: SERVICE_IDS.TRUCK_PERMIT_FEES,
    title: 'Truck Permit Fees',
    description: 'Apply and pay for truck permits',
    icon: 'Truck',
    color: 'bg-yellow-500',
    baseAmount: 2000,
    processingFee: 40,
    formFields: [
      {
        id: 'companyName',
        label: 'Company Name',
        type: 'text',
        required: true,
      },
      {
        id: 'plateNumber',
        label: 'Truck Plate Number',
        type: 'text',
        required: true,
      },
      {
        id: 'truckType',
        label: 'Truck Type',
        type: 'select',
        required: true,
        options: [
          { value: 'light', label: 'Light' },
          { value: 'medium', label: 'Medium' },
          { value: 'heavy', label: 'Heavy' },
        ],
      },
    ],
  },
  [SERVICE_IDS.RENTAL_FEES]: {
    id: SERVICE_IDS.RENTAL_FEES,
    title: 'Rental Fees',
    description: 'Pay rental fees for municipal facilities',
    icon: 'HandCoins',
    color: 'bg-teal-500',
    baseAmount: 1000,
    processingFee: 20,
    formFields: [
      {
        id: 'facility',
        label: 'Facility',
        type: 'select',
        required: true,
        options: [
          { value: 'hall', label: 'Municipal Hall' },
          { value: 'gym', label: 'Gymnasium' },
          { value: 'park', label: 'Park Grounds' },
          { value: 'others', label: 'Others' },
        ],
      },
      {
        id: 'rentalDate',
        label: 'Rental Date',
        type: 'text',
        required: true,
        placeholder: 'YYYY-MM-DD',
      },
      {
        id: 'renterName',
        label: 'Renter Name',
        type: 'text',
        required: true,
      },
    ],
  },
  
};

/**
 * Helper function to get service configuration by ID
 */
export const getServiceConfig = (serviceId: string): PaymentServiceConfig | null => {
  return (PAYMENT_SERVICES as Record<ServiceId, PaymentServiceConfig>)[serviceId as ServiceId] || null;
};

/**
 * Helper function to get form step configuration by ID
 */
export const getFormStepConfig = (stepId: string): FormStepConfig | null => {
  return FORM_STEPS.find((step) => step.id === stepId) || null;
};

/**
 * Helper function to calculate total amount for a service
 */
export const calculateTotalAmount = (serviceId: PaymentServiceId): number => {
  const service = (PAYMENT_SERVICES as Record<ServiceId, PaymentServiceConfig>)[serviceId];
  return service ? service.baseAmount + service.processingFee : 0;
};

/**
 * Helper function to get all available payment service IDs
 */
export const getAvailableServiceIds = (): PaymentServiceId[] => {
  return Object.keys(PAYMENT_SERVICES) as PaymentServiceId[];
};