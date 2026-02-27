import { ROUTES } from '@/constants/routes';

/** Central API base URL for backend; use for fetch when apiFetch is not suitable (e.g. FormData). */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface RegisterData {
  accountType: 'individual' | 'business';
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: 'male' | 'female';
  contact: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UserResponse {
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

export interface AuthResponse {
  message: string;
  user: UserResponse;
}

export interface AdminLoginData {
  email: string;
  password: string;
}

export interface UpdateProfileData {
  firstName: string;
  middleName?: string;
  lastName: string;
  contact: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

// Cookie-only auth: no localStorage token utilities

/**
 * Custom fetch wrapper with error handling and automatic token refresh
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Ensure options don't overwrite computed headers/credentials
  const config: RequestInit = {
    credentials: 'include', // Include cookies for HTTP-only tokens
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, config);
    
    // Handle 401 Unauthorized - try to refresh cookie-based token
    const headersObj = (config.headers || {}) as Record<string, string>;
    const shouldSkipRefresh = headersObj['X-Skip-Refresh'] === 'true' || headersObj['x-skip-refresh'] === 'true';
    const isLoginEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/admin/login');
    
    if (response.status === 401 && !shouldSkipRefresh && !endpoint.includes(ROUTES.API.AUTH.REFRESH.replace('/api', '')) && !isLoginEndpoint) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}${ROUTES.API.AUTH.REFRESH.replace('/api', '')}`, {
          method: 'POST',
          credentials: 'include',
        });
        
        if (refreshResponse.ok) {
          // Retry original request; cookies now contain refreshed token
          const retryResponse = await fetch(url, config);
          const retryData = await retryResponse.json();
          
          if (!retryResponse.ok) {
            const error: ApiError = retryData;
            throw new Error(
              Array.isArray(error.message) 
                ? error.message.join(', ') 
                : error.message || `Server error: ${retryResponse.status}`
            );
          }
          
          return retryData;
        } else {
          // Refresh failed; bubble up error (no auto-redirect)
          throw new Error('Session expired. Please login again.');
        }
      } catch {
        throw new Error('Session expired. Please login again.');
      }
    }
    
    // Check if the response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();

    if (!response.ok) {
      const error: ApiError = data;
      throw new Error(
        Array.isArray(error.message) 
          ? error.message.join(', ') 
          : error.message || `Server error: ${response.status}`
      );
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error occurred');
  }
}

/**
 * Register a new user
 */
export async function registerUser(data: RegisterData): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(ROUTES.API.AUTH.REGISTER.replace('/api', ''), {
    method: 'POST',
    headers: {
      'X-Skip-Refresh': 'true', 
    },
    body: JSON.stringify(data),
  });
}

/**
 * Login user
 */
export async function loginUser(data: LoginData): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(ROUTES.API.AUTH.LOGIN.replace('/api', ''), {
    method: 'POST',
    headers: {
      'X-Skip-Refresh': 'true', 
    },
    body: JSON.stringify(data),
  });
}

/**
 * Login admin user
 */
export async function loginAdmin(data: AdminLoginData): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(ROUTES.API.AUTH.ADMIN_LOGIN.replace('/api', ''), {
    method: 'POST',
    headers: {
      'X-Skip-Refresh': 'true', 
    },
    body: JSON.stringify(data),
  });
}

/**
 * Check if email is available
 */
export async function checkEmailAvailability(email: string): Promise<{
  available: boolean;
  message: string;
}> {
  return apiFetch<{ available: boolean; message: string }>(ROUTES.API.AUTH.CHECK_EMAIL.replace('/api', ''), {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Logout user
 */
export async function logoutUser(): Promise<{ message: string }> {
  // Use Next.js API route for logout to properly handle cookies
  const response = await fetch(ROUTES.API.AUTH.LOGOUT, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Logout failed: ${response.status}`);
  }

  return response.json();
}


/**
 * Verify current authentication token
 */
export async function verifyToken(): Promise<{
  valid: boolean;
  user: UserResponse;
}> {
  return apiFetch<{ valid: boolean; user: UserResponse }>(ROUTES.API.AUTH.VERIFY_TOKEN.replace('/api', ''));
}

/**
 * Get current user profile
 */
export async function getUserProfile(): Promise<{ user: UserResponse }> {
  return apiFetch<{ user: UserResponse }>(ROUTES.API.AUTH.PROFILE.replace('/api', ''));
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(ROUTES.API.AUTH.REFRESH.replace('/api', ''), {
    method: 'POST',
  });
}

/**
 * Update current user profile
 */
export async function updateUserProfile(data: UpdateProfileData): Promise<{ message: string; user: UserResponse }> {
  return apiFetch<{ message: string; user: UserResponse }>(ROUTES.API.AUTH.PROFILE.replace('/api', ''), {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Change current user password
 */
export async function changeUserPassword(data: ChangePasswordData): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(ROUTES.API.AUTH.CHANGE_PASSWORD.replace('/api', ''), {
    method: 'PATCH',
    headers: {
      'X-Skip-Refresh': 'true',
    },
    body: JSON.stringify(data),
  });
}

/**
 * Request password reset
 */
export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(ROUTES.API.AUTH.FORGOT_PASSWORD.replace('/api', ''), {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Reset password with verification code
 */
export async function resetPassword(data: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(ROUTES.API.AUTH.RESET_PASSWORD.replace('/api', ''), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// User Transactions API
export interface UserTransactionData {
  _id: string;
  date: string;
  service: {
    serviceId: string;
    name: string;
  };
  totalAmountMinor: number;
  details: {
    reference: string;
    breakdown: Array<{
      code: string;
      label: string;
      amountMinor: number;
    }>;
    formData?: Record<string, unknown>;
  };
  status: 'pending' | 'awaiting_payment' | 'paid' | 'refunded' | 'failed' | 'completed';
  payment?: {
    provider: string;
    channel: string;
    subchannel?: string;
    providerTransactionId?: string;
    providerIntentId?: string;
    providerStatus?: string;
    paidAt?: string;
    feeMinor?: number;
    raw?: Record<string, unknown>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserTransactionsListResponse {
  data: UserTransactionData[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export async function getUserTransactions(params: {
  page?: number;
  limit?: number;
  status?: string;
  serviceId?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}): Promise<UserTransactionsListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append('page', String(params.page));
  if (params.limit) searchParams.append('limit', String(params.limit));
  if (params.status) searchParams.append('status', params.status);
  if (params.serviceId) searchParams.append('serviceId', params.serviceId);
  if (params.q) searchParams.append('q', params.q);
  if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
  if (params.dateTo) searchParams.append('dateTo', params.dateTo);
  const query = searchParams.toString();
  const endpoint = `${ROUTES.API.USER.TRANSACTIONS.replace('/api', '')}${query ? `?${query}` : ''}`;
  return apiFetch<UserTransactionsListResponse>(endpoint);
}

export async function getUserTransactionById(id: string): Promise<UserTransactionData> {
  return apiFetch<UserTransactionData>(`${ROUTES.API.USER.TRANSACTIONS.replace('/api', '')}/${id}`);
}

// No token management exports; using cookie-only auth

export async function createCheckoutSession(payload: {
  transactionId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ checkoutUrl: string; providerSessionId: string }> {
  return apiFetch<{ checkoutUrl: string; providerSessionId: string }>(
    ROUTES.API.PAYMENTS.CHECKOUT.replace('/api', ''),
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export type InitiatePaymentPayload = {
  serviceId: string;
  serviceName: string;
  approvalRequired?: boolean;
  reference?: string;
  breakdown: Array<{ code: 'base' | 'tax' | 'convenience_fee' | 'processing_fee' | 'discount' | 'other'; label: string; amountMinor: number; metadata?: Record<string, unknown> }>;
  totalAmountMinor: number;
  formData?: Record<string, unknown>;
  paymentMethod?: 'card' | 'digital-wallets' | 'dob' | 'qrph';
  userId?: string;
  userEmail?: string;
  userFullName?: string;
  successUrl: string;
  cancelUrl: string;
};

export async function initiatePayment(payload: InitiatePaymentPayload): Promise<{ checkoutUrl: string; transactionId: string }> {
  return apiFetch<{ checkoutUrl: string; transactionId: string }>(
    ROUTES.API.PAYMENTS.INITIATE.replace('/api', ''),
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export async function cancelPayment(transactionId: string): Promise<{ transactionId: string; status: string }>{
  return apiFetch<{ transactionId: string; status: string }>(
    `${ROUTES.API.PAYMENTS.CHECKOUT.replace('/api', '').replace('/checkout','')}/cancel/${transactionId}`,
    {
      method: 'PATCH',
    }
  );
}