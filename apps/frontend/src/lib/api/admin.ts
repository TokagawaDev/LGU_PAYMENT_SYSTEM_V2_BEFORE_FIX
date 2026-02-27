import { ROUTES } from '@/constants/routes';
import { apiFetch } from '@/lib/api';

/**
 * User data interfaces for admin operations
 */
export interface UserData {
  _id: string;
  accountType: 'individual' | 'business';
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  gender: 'male' | 'female';
  contact: string;
  role: 'user' | 'admin' | 'super_admin';
  permissions?: string[];
  allowedServices?: string[];
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsersThisMonth: number;
  growthPercentage: number;
  adminUsers: number;
  regularUsers: number;
}

export interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UsersListResponse {
  users: UserData[];
  pagination: PaginationData;
}

export interface AdminsListResponse {
  admins: UserData[];
  pagination: PaginationData;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  accountType?: 'individual' | 'business';
}

// Transactions
export type TransactionStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'paid'
  | 'failed'
  | 'completed'
  | 'refunded';

export type PaymentChannel = 'online_wallet' | 'online_banking' | 'qrph' | 'card' | 'other';

export interface ServiceSnapshot {
  serviceId: string;
  name: string;
  otherInfo?: Record<string, unknown>;
  approvalRequired?: boolean;
}

export interface BreakdownItem {
  code: 'base' | 'tax' | 'convenience_fee' | 'processing_fee' | 'discount' | 'other';
  label: string;
  amountMinor: number;
  metadata?: Record<string, unknown>;
}

export interface TransactionDetails {
  reference: string;
  breakdown: BreakdownItem[];
  formData?: Record<string, unknown>;
  notes?: string;
}

export interface PaymentInfo {
  provider: 'paymongo';
  channel: PaymentChannel;
  subchannel?: string;
  providerTransactionId?: string;
  providerIntentId?: string;
  providerStatus?: string;
  paidAt?: string;
  feeMinor?: number;
  raw?: Record<string, unknown>;
}

export interface TransactionData {
  _id: string;
  date: string;
  service: ServiceSnapshot;
  totalAmountMinor: number;
  details: TransactionDetails;
  status: TransactionStatus;
  payment?: PaymentInfo;
  userId?: string;
  userEmail?: string;
  userFullName?: string;
  createdByAdminId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionsListResponse {
  data: TransactionData[];
  pagination: PaginationData;
}



/**
 * Admin API functions for user management
 */

/**
 * Get user statistics for admin dashboard
 */
export async function getUserStats(): Promise<UserStats> {
  return apiFetch<UserStats>(ROUTES.API.ADMIN.USER_STATS.replace('/api', ''));
}

/**
 * Get paginated list of users with optional filtering
 */
export async function getUsers(params: GetUsersParams = {}): Promise<UsersListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append('page', params.page.toString());
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.search) searchParams.append('search', params.search);
  if (params.accountType) searchParams.append('accountType', params.accountType);

  const query = searchParams.toString();
  const endpoint = `${ROUTES.API.ADMIN.USERS.replace('/api', '')}${query ? `?${query}` : ''}`;
  return apiFetch<UsersListResponse>(endpoint);
}

export async function getAdmins(params: GetUsersParams = {}): Promise<AdminsListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append('page', params.page.toString());
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.search) searchParams.append('search', params.search);
  const query = searchParams.toString();
  const endpoint = `${ROUTES.API.ADMIN.USERS.replace('/api', '').replace('/users', '/admins')}${query ? `?${query}` : ''}`;
  return apiFetch<AdminsListResponse>(endpoint);
}

export async function createAdmin(payload: {
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: 'male' | 'female';
  contact: string;
  password: string;
  permissions?: string[];
  allowedServices?: string[];
  isActive?: boolean;
}): Promise<UserData> {
  const endpoint = ROUTES.API.ADMIN.USERS.replace('/api', '').replace('/users', '/admins');
  return apiFetch<UserData>(endpoint, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateAdmin(id: string, payload: Partial<{
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: 'male' | 'female';
  contact: string;
  password: string;
  permissions: string[];
  allowedServices: string[];
  isActive: boolean;
}>): Promise<UserData> {
  const endpoint = `${ROUTES.API.ADMIN.USERS.replace('/api', '').replace('/users', '/admins')}/${id}`;
  return apiFetch<UserData>(endpoint, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteAdmin(id: string): Promise<{ message: string }> {
  const endpoint = `${ROUTES.API.ADMIN.USERS.replace('/api', '').replace('/users', '/admins')}/${id}`;
  return apiFetch<{ message: string }>(endpoint, { method: 'DELETE' });
}

// Payment Service Form Config API
export interface PaymentServiceFormConfig {
  title: string;
  description: string;
  formFields: Array<{
    id: string;
    label: string;
    type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea' | 'file' | 'date' | 'cost';
    required?: boolean;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
      message?: string;
    };
  }>;
  baseAmount: number;
  processingFee: number;
}

export async function getPaymentServiceFormConfig(serviceId: string): Promise<PaymentServiceFormConfig | null> {
  try {
    const config = await apiFetch<PaymentServiceFormConfig>(`/settings/form-config/${serviceId}`);
    return config || null;
  } catch {
    return null;
  }
}

export async function savePaymentServiceFormConfig(
  serviceId: string,
  config: PaymentServiceFormConfig
): Promise<PaymentServiceFormConfig> {
  return apiFetch<PaymentServiceFormConfig>(`/settings/form-config/${serviceId}`, {
    method: 'PATCH',
    body: JSON.stringify(config),
  });
}

// Custom Payment Services API
export interface CustomPaymentService {
  id: string;
  title: string;
  description: string;
  baseAmount: number;
  processingFee: number;
  enabled: boolean;
  formFields: Array<{
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
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCustomPaymentServiceDto {
  title: string;
  description?: string;
  baseAmount: number;
  processingFee: number;
  enabled?: boolean;
  formFields?: CustomPaymentService['formFields'];
}

export interface UpdateCustomPaymentServiceDto {
  title?: string;
  description?: string;
  baseAmount?: number;
  processingFee?: number;
  enabled?: boolean;
  formFields?: CustomPaymentService['formFields'];
}

export async function getCustomPaymentServices(enabled?: boolean): Promise<CustomPaymentService[]> {
  const params = enabled !== undefined ? `?enabled=${enabled}` : '';
  return apiFetch<CustomPaymentService[]>(`/custom-payment-services${params}`);
}

export async function getCustomPaymentService(id: string): Promise<CustomPaymentService> {
  return apiFetch<CustomPaymentService>(`/custom-payment-services/${id}`);
}

export async function createCustomPaymentService(
  data: CreateCustomPaymentServiceDto
): Promise<CustomPaymentService> {
  return apiFetch<CustomPaymentService>('/custom-payment-services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCustomPaymentService(
  id: string,
  data: UpdateCustomPaymentServiceDto
): Promise<CustomPaymentService> {
  return apiFetch<CustomPaymentService>(`/custom-payment-services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteCustomPaymentService(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/custom-payment-services/${id}`, {
    method: 'DELETE',
  });
}

export async function updateCustomPaymentServiceEnabled(
  id: string,
  enabled: boolean
): Promise<CustomPaymentService> {
  return apiFetch<CustomPaymentService>(`/custom-payment-services/${id}/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

// Custom Application Services API
export interface CustomApplicationService {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  visible: boolean;
  formFields: Array<{
    type: 'text' | 'number' | 'email' | 'password' | 'date' | 'file' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'submit' | 'reset';
    label: string;
    placeholder?: string;
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
    stepIndex?: number;
    helpText?: string;
    fieldOrder?: number;
    header?: string;
    description?: string;
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
  createdAt?: string;
  updatedAt?: string;
}

// Backward compatibility alias
export type ApplicationForm = CustomApplicationService;

export interface CreateCustomApplicationServiceDto {
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  visible?: boolean;
  formFields?: CustomApplicationService['formFields'];
  formSteps?: CustomApplicationService['formSteps'];
  buttonTexts?: CustomApplicationService['buttonTexts'];
  buttonVisibility?: CustomApplicationService['buttonVisibility'];
}

// Backward compatibility alias
export type CreateApplicationFormDto = CreateCustomApplicationServiceDto;

export interface UpdateCustomApplicationServiceDto {
  title?: string;
  description?: string;
  icon?: string;
  color?: string;
  visible?: boolean;
  formFields?: CustomApplicationService['formFields'];
  formSteps?: CustomApplicationService['formSteps'];
  buttonTexts?: CustomApplicationService['buttonTexts'];
  buttonVisibility?: CustomApplicationService['buttonVisibility'];
}

// Backward compatibility alias
export type UpdateApplicationFormDto = UpdateCustomApplicationServiceDto;

export async function getCustomApplicationServices(visible?: boolean): Promise<CustomApplicationService[]> {
  const query = visible !== undefined ? `?visible=${visible}` : '';
  return apiFetch<CustomApplicationService[]>(`/custom-application-services${query}`);
}

// Backward compatibility alias
export const getApplicationForms = getCustomApplicationServices;

export async function getCustomApplicationService(id: string): Promise<CustomApplicationService> {
  return apiFetch<CustomApplicationService>(`/custom-application-services/${id}`);
}

// Backward compatibility alias
export const getApplicationForm = getCustomApplicationService;

export async function createCustomApplicationService(
  data: CreateCustomApplicationServiceDto
): Promise<CustomApplicationService> {
  return apiFetch<CustomApplicationService>(`/custom-application-services`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Backward compatibility alias
export const createApplicationForm = createCustomApplicationService;

export async function updateCustomApplicationService(
  id: string,
  data: UpdateCustomApplicationServiceDto
): Promise<CustomApplicationService> {
  return apiFetch<CustomApplicationService>(`/custom-application-services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Backward compatibility alias
export const updateApplicationForm = updateCustomApplicationService;

export async function deleteCustomApplicationService(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/custom-application-services/${id}`, {
    method: 'DELETE',
  });
}

// Backward compatibility alias
export const deleteApplicationForm = deleteCustomApplicationService;

export async function updateCustomApplicationServiceVisible(
  id: string,
  visible: boolean
): Promise<CustomApplicationService> {
  return apiFetch<CustomApplicationService>(`/custom-application-services/${id}/visible`, {
    method: 'PATCH',
    body: JSON.stringify({ visible }),
  });
}

// Backward compatibility alias
export const updateApplicationFormVisible = updateCustomApplicationServiceVisible;

// Transactions API
export async function getTransactions(params: {
  page?: number;
  limit?: number;
  status?: TransactionStatus;
  serviceId?: string;
  reference?: string;
  q?: string;
  channel?: PaymentChannel;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
} = {}): Promise<TransactionsListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append('page', String(params.page));
  if (params.limit) searchParams.append('limit', String(params.limit));
  if (params.status) searchParams.append('status', params.status);
  if (params.serviceId) searchParams.append('serviceId', params.serviceId);
  if (params.reference) searchParams.append('reference', params.reference);
  if (params.q) searchParams.append('q', params.q);
  if (params.channel) searchParams.append('channel', params.channel);
  if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
  if (params.dateTo) searchParams.append('dateTo', params.dateTo);
  if (params.userId) searchParams.append('userId', params.userId);
  const query = searchParams.toString();
  const endpoint = `${ROUTES.API.ADMIN.TRANSACTIONS.replace('/api', '')}${query ? `?${query}` : ''}`;
  return apiFetch<TransactionsListResponse>(endpoint);
}

export async function getTransactionCount(): Promise<{ total: number }> {
  return apiFetch<{ total: number }>(ROUTES.API.ADMIN.TRANSACTIONS_COUNT.replace('/api', ''));
}

export async function getTransactionById(id: string): Promise<TransactionData> {
  const endpoint = `${ROUTES.API.USER.TRANSACTIONS.replace('/api', '')}/${id}`;
  return apiFetch<TransactionData>(endpoint);
}

export interface TransactionsStats {
  total: number;
  newThisMonth: number;
  growthPercentage: number;
  successfulTotal: number;
  successfulThisMonth: number;
  successfulGrowthPercentage: number;
  revenueTotalMinor: number;
  revenueThisMonthMinor: number;
  revenueGrowthPercentage: number;
}

export async function getTransactionStats(): Promise<TransactionsStats> {
  return apiFetch<TransactionsStats>(ROUTES.API.ADMIN.TRANSACTIONS_STATS.replace('/api', ''));
}

export interface ApplicationStats {
  total: number;
  submittedTotal: number;
  draftTotal: number;
  newThisMonth: number;
  growthPercentage: number;
  submittedGrowthPercentage: number;
}

/**
 * Application (Add-on Submission) data interfaces
 */
export interface ApplicationData {
  id: string;
  _id?: string;
  userId: string;
  customApplicationServiceId: string;
  /** Form title resolved from the custom application service (included in admin list/detail) */
  customApplicationServiceTitle?: string | null;
  // Backward compatibility alias
  addOnId?: string;
  status: 'draft' | 'submitted';
  adminStatus: 'pending' | 'reviewing' | 'rejected' | 'approved';
  adminNotes?: string;
  formData: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateAdminStatusParams {
  adminStatus: 'pending' | 'reviewing' | 'rejected' | 'approved';
  adminNotes?: string;
}

export interface ApplicationsListResponse {
  items: ApplicationData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetApplicationsParams {
  userId?: string;
  customApplicationServiceId?: string;
  // Backward compatibility alias
  addOnId?: string;
  status?: 'draft' | 'submitted';
  adminStatus?: 'pending' | 'reviewing' | 'approved' | 'rejected';
  /** Search by form title, application ID, or user ID */
  search?: string;
  page?: number;
  limit?: number;
}

export async function getApplications(params?: GetApplicationsParams): Promise<ApplicationsListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.userId) searchParams.append('userId', params.userId);
  // Use new field name, fallback to old for backward compatibility
  const serviceId = params?.customApplicationServiceId || params?.addOnId;
  if (serviceId) searchParams.append('customApplicationServiceId', serviceId);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.adminStatus) searchParams.append('adminStatus', params.adminStatus);
  if (params?.search?.trim()) searchParams.append('search', params.search.trim());
  if (params?.page) searchParams.append('page', String(params.page));
  if (params?.limit) searchParams.append('limit', String(params.limit));
  const query = searchParams.toString();
  const endpoint = `${ROUTES.API.ADMIN.APPLICATIONS.replace('/api', '')}${query ? `?${query}` : ''}`;
  const response = await apiFetch<ApplicationsListResponse>(endpoint);
  // Map customApplicationServiceId to addOnId and preserve customApplicationServiceTitle (form title from API)
  return {
    ...response,
    items: response.items.map((item) => ({
      ...item,
      addOnId: item.addOnId || item.customApplicationServiceId,
      customApplicationServiceId: item.customApplicationServiceId || item.addOnId,
      customApplicationServiceTitle: item.customApplicationServiceTitle ?? undefined,
    })),
  };
}

export async function getApplicationById(id: string): Promise<ApplicationData> {
  const endpoint = `${ROUTES.API.ADMIN.APPLICATIONS.replace('/api', '')}/${id}`;
  const data = await apiFetch<ApplicationData>(endpoint);
  // Map customApplicationServiceId to addOnId and preserve customApplicationServiceTitle (form title from API)
  return {
    ...data,
    addOnId: data.addOnId || data.customApplicationServiceId,
    customApplicationServiceId: data.customApplicationServiceId || data.addOnId,
    customApplicationServiceTitle: data.customApplicationServiceTitle ?? undefined,
  };
}

export async function updateApplicationStatus(
  id: string,
  params: UpdateAdminStatusParams
): Promise<ApplicationData> {
  const endpoint = `${ROUTES.API.ADMIN.APPLICATIONS.replace('/api', '')}/${id}/status`;
  return apiFetch<ApplicationData>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(params),
  });
}

/**
 * Calculate application statistics from applications list
 */
function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export async function getApplicationStats(): Promise<ApplicationStats> {
  const now = new Date();
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
  );
  const prevMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0)
  );
  const prevMonthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59)
  );

  // Fetch all applications (we'll need to fetch multiple pages or use a high limit)
  const [allApps, submittedApps, draftApps] = await Promise.all([
    getApplications({ limit: 1000 }), // Get a large batch
    getApplications({ status: 'submitted', limit: 1000 }),
    getApplications({ status: 'draft', limit: 1000 }),
  ]);

  // Filter by date client-side (since API doesn't support date filtering yet)
  const thisMonthFiltered = allApps.items.filter((app) => {
    const createdAt = app.createdAt ? new Date(app.createdAt) : null;
    return createdAt && createdAt >= startOfMonth;
  });

  const lastMonthFiltered = allApps.items.filter((app) => {
    const createdAt = app.createdAt ? new Date(app.createdAt) : null;
    return createdAt && createdAt >= prevMonthStart && createdAt <= prevMonthEnd;
  });

  const thisMonthSubmittedFiltered = submittedApps.items.filter((app) => {
    const createdAt = app.createdAt ? new Date(app.createdAt) : null;
    return createdAt && createdAt >= startOfMonth;
  });

  const lastMonthSubmittedFiltered = submittedApps.items.filter((app) => {
    const createdAt = app.createdAt ? new Date(app.createdAt) : null;
    return createdAt && createdAt >= prevMonthStart && createdAt <= prevMonthEnd;
  });

  return {
    total: allApps.total,
    submittedTotal: submittedApps.total,
    draftTotal: draftApps.total,
    newThisMonth: thisMonthFiltered.length,
    growthPercentage: calculateGrowth(thisMonthFiltered.length, lastMonthFiltered.length),
    submittedGrowthPercentage: calculateGrowth(
      thisMonthSubmittedFiltered.length,
      lastMonthSubmittedFiltered.length
    ),
  };
}

export type AggregatePeriod = 'day' | 'week' | 'month' | 'year';

export interface AggregateQueryParams {
  period: AggregatePeriod;
  dateFrom?: string;
  dateTo?: string;
  serviceId?: string;
  channel?: PaymentChannel;
  status?: TransactionStatus | TransactionStatus[];
  seriesBy?: 'service' | 'channel' | 'status';
}

export interface AggregatedTimeSeriesRow {
  periodValue: string;
  count: number;
  totalAmountMinor: number;
  successCount: number;
  successRate: number;
}

export interface AggregatedBreakdownRow {
  key: string;
  label: string;
  count: number;
  totalAmountMinor: number;
}

export interface AggregatedReportResult {
  period: AggregatePeriod;
  timeSeries: AggregatedTimeSeriesRow[];
  totals: {
    count: number;
    totalAmountMinor: number;
    successCount: number;
    successRate: number;
  };
  byService: AggregatedBreakdownRow[];
  byChannel: AggregatedBreakdownRow[];
  seriesBy?: 'service' | 'channel' | 'status';
  timeSeriesByDimension?: Array<{
    key: string;
    label: string;
    points: Array<{ periodValue: string; count: number; totalAmountMinor: number }>;
    totalAmountMinor: number;
    count: number;
  }>;
}

export async function getTransactionsAggregate(params: AggregateQueryParams): Promise<AggregatedReportResult> {
  const searchParams = new URLSearchParams();
  searchParams.append('period', params.period);
  if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
  if (params.dateTo) searchParams.append('dateTo', params.dateTo);
  if (params.serviceId) searchParams.append('serviceId', params.serviceId);
  if (params.channel) searchParams.append('channel', params.channel);
  if (params.status) {
    if (Array.isArray(params.status)) {
      searchParams.append('status', params.status.join(','));
    } else {
      searchParams.append('status', params.status);
    }
  }
  if (params.seriesBy) searchParams.append('seriesBy', params.seriesBy);
  const query = searchParams.toString();
  const endpoint = `${ROUTES.API.ADMIN.TRANSACTIONS_AGGREGATE.replace('/api', '')}?${query}`;
  return apiFetch<AggregatedReportResult>(endpoint);
}

export async function exportTransactionsCsv(params: {
  status?: TransactionStatus;
  serviceId?: string;
  reference?: string;
  q?: string;
  channel?: PaymentChannel;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ filename: string; csv: string }> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.append('status', params.status);
  if (params.serviceId) searchParams.append('serviceId', params.serviceId);
  if (params.reference) searchParams.append('reference', params.reference);
  if (params.q) searchParams.append('q', params.q);
  if (params.channel) searchParams.append('channel', params.channel);
  if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
  if (params.dateTo) searchParams.append('dateTo', params.dateTo);
  const endpoint = `${ROUTES.API.ADMIN.TRANSACTIONS_EXPORT.replace('/api', '')}?${searchParams.toString()}`;
  return apiFetch<{ filename: string; csv: string }>(endpoint);
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<UserData> {
  return apiFetch<UserData>(`${ROUTES.API.ADMIN.USERS.replace('/api', '')}/${id}`);
}


