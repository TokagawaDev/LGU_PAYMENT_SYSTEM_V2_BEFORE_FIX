'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/molecules/admin-header';
import { ROUTES } from '@/constants/routes';
import { useRequireAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  ShieldCheck,
  Search,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  createAdmin,
  deleteAdmin,
  getAdmins,
  updateAdmin,
  type AdminsListResponse,
  type UserData,
} from '@/lib/api/admin';
import {
  SERVICE_NAME_BY_ID,
  normalizeToServiceId,
} from '@shared/constants/services';

export default function AdminAccountsPage() {
  useRequireAuth();

  const [admins, setAdmins] = useState<UserData[]>([]);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [permissionFilter, setPermissionFilter] = useState<string>('all');
  const [allowedServiceFilter, setAllowedServiceFilter] = useState<string>('all');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isServicesExpanded, setIsServicesExpanded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createPayload, setCreatePayload] = useState({
    email: '',
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'male' as 'male' | 'female',
    contact: '',
    password: '',
    permissions: [] as string[],
    servicePermissions: [] as string[], // For Payment Management Setting and Application Management Setting
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditServicesExpanded, setIsEditServicesExpanded] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editTarget, setEditTarget] = useState<UserData | null>(null);
  const [editPayload, setEditPayload] = useState<
    Partial<{
      email: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      gender: 'male' | 'female';
      contact: string;
      password?: string;
      permissions: string[];
      servicePermissions: string[];
      isActive: boolean;
    }>
  >({});

  const [viewTarget, setViewTarget] = useState<UserData | null>(null);

  const itemsPerPage = 10;

  // Password validation helper
  const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (password.length < 12 || password.length > 16) {
      errors.push('Password must be 12-16 characters long');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must include lowercase letters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must include uppercase letters');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must include numbers');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must include special characters');
    }
    return { valid: errors.length === 0, errors };
  };

  // Format permission name: convert snake_case to Title Case
  const formatPermissionName = (permission: string): string => {
    // First try to find in PERMISSION_OPTIONS or SERVICE_PERMISSION_OPTIONS
    const fromOptions = PERMISSION_OPTIONS.find((o) => o.value === permission)?.label ||
                        SERVICE_PERMISSION_OPTIONS.find((o) => o.value === permission)?.label;
    if (fromOptions) return fromOptions;
    
    // If not found, format the permission string
    return permission
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Helpers for details dialog: service normalization and labels
  const SERVICE_LABEL_BY_ID: Record<string, string> =
    SERVICE_NAME_BY_ID as Record<string, string>;
  const normalizeServiceIdLocal = (raw: string): string =>
    normalizeToServiceId(raw) ?? raw;

  // Options for permissions and service scopes. Adjust as needed.
  const PERMISSION_OPTIONS = [
    { value: 'manage_users', label: 'Manage Users' },
    { value: 'manage_transactions', label: 'Manage Transactions' },
    { value: 'view_reports', label: 'View Reports' },
    { value: 'manage_settings', label: 'Manage Settings' },
    { value: 'manage_applications', label: 'Manage Applications' },
  ] as const;

  const SERVICE_OPTIONS = (Object.keys(SERVICE_LABEL_BY_ID) as string[])
    .map((id) => ({ value: id, label: SERVICE_LABEL_BY_ID[id] }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const SERVICE_PERMISSION_OPTIONS = [
    { value: 'payment_management_setting', label: 'Payment Management Setting' },
    { value: 'application_management_setting', label: 'Application Management Setting' },
  ] as const;

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      // If filters are applied, fetch all admins for client-side filtering
      const hasFilters = statusFilter !== 'all' || permissionFilter !== 'all' || allowedServiceFilter !== 'all';
      const fetchLimit = hasFilters ? 1000 : itemsPerPage;
      const fetchPage = hasFilters ? 1 : currentPage;
      
      const res: AdminsListResponse = await getAdmins({
        page: fetchPage,
        limit: fetchLimit,
        search: search || undefined,
      });
      
      // Apply client-side filters
      let filteredAdmins = res.admins;
      
      if (statusFilter !== 'all') {
        filteredAdmins = filteredAdmins.filter((admin) =>
          statusFilter === 'active' ? admin.isActive : !admin.isActive
        );
      }
      
      if (permissionFilter !== 'all') {
        filteredAdmins = filteredAdmins.filter((admin) => {
          const permissions = admin.permissions || [];
          return permissions.includes(permissionFilter);
        });
      }
      
      if (allowedServiceFilter !== 'all') {
        filteredAdmins = filteredAdmins.filter((admin) => {
          const allowedServices = admin.allowedServices || [];
          const normalizedServices = allowedServices.map((s) => normalizeServiceIdLocal(s));
          return normalizedServices.includes(normalizeServiceIdLocal(allowedServiceFilter));
        });
      }
      
      // Calculate total filtered count
      const totalFilteredCount = hasFilters ? filteredAdmins.length : res.pagination.totalCount;
      
      // Apply client-side pagination if filters are active
      if (hasFilters) {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        filteredAdmins = filteredAdmins.slice(startIndex, endIndex);
      }
      
      const totalPages = Math.ceil(totalFilteredCount / itemsPerPage);
      
      setAdmins(filteredAdmins);
      setPagination({
        totalPages: totalPages || 1,
        totalCount: totalFilteredCount,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      });
    } catch (_err) {
      toast.error('Failed to load admin accounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, permissionFilter, allowedServiceFilter]);

  const onSearch = () => {
    setCurrentPage(1);
    fetchAdmins();
  };

  const onCreate = async () => {
    try {
      const payload = { ...createPayload };
      // Basic client-side validation
      const errors: { [K in keyof typeof createPayload]?: string } & {
        general?: string;
      } = {};
      if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email))
        errors.email = 'Enter a valid email';
      if (!payload.password) {
        errors.password = 'Password is required';
      } else {
        const passwordValidation = validatePassword(payload.password);
        if (!passwordValidation.valid) {
          errors.password = passwordValidation.errors[0];
        }
      }
      if (!payload.firstName) errors.firstName = 'First name is required';
      if (!payload.lastName) errors.lastName = 'Last name is required';
      if (!payload.contact) errors.contact = 'Contact is required';
      if (!payload.gender) errors.gender = 'Gender is required';
      // Normalize duplicate entries
      const normalizeId = (v: string) =>
        v.trim().toLowerCase().replace(/_/g, '-');
      payload.permissions = Array.from(
        new Set((payload.permissions || []).map((s) => s.trim()))
      );
      // Merge servicePermissions into permissions
      if (createPayload.servicePermissions && createPayload.servicePermissions.length > 0) {
        payload.permissions = Array.from(
          new Set([...payload.permissions, ...createPayload.servicePermissions])
        );
      }
      // Remove servicePermissions from payload before sending (it's merged into permissions)
      // Set allowedServices to empty array since we removed it from the form
      const { servicePermissions, ...payloadToSend } = { ...payload, allowedServices: [] };
      const errorMsgs = Object.values(errors).filter(Boolean) as string[];
      if (errorMsgs.length > 0) {
        toast.error(errorMsgs[0]);
        return;
      }
      await createAdmin(payloadToSend);
      toast.success('Admin created');
      setIsCreateOpen(false);
      setCreatePayload({
        email: '',
        firstName: '',
        middleName: '',
        lastName: '',
        gender: 'male',
        contact: '',
        password: '',
        permissions: [],
        servicePermissions: [],
      });
      setShowPassword(false);
      fetchAdmins();
    } catch (_err: unknown) {
      toast.error('Failed to create admin');
    }
  };

  const onEditOpen = (admin: UserData) => {
    setEditTarget(admin);
    const permissions = admin.permissions ?? [];
    // Extract service permissions from permissions array
    const servicePerms = permissions.filter(
      (p) => p === 'payment_management_setting' || p === 'application_management_setting'
    );
    // Remove service permissions from regular permissions for display
    const regularPerms = permissions.filter(
      (p) => p !== 'payment_management_setting' && p !== 'application_management_setting'
    );
    setEditPayload({
      email: admin.email,
      firstName: admin.firstName,
      middleName: admin.middleName,
      lastName: admin.lastName,
      gender: admin.gender,
      contact: admin.contact,
      permissions: regularPerms,
      servicePermissions: servicePerms,
      isActive: admin.isActive,
    });
    setIsEditOpen(true);
  };

  const onUpdate = async () => {
    if (!editTarget) return;
    try {
      const nextPayload = { ...editPayload };
      if (
        nextPayload.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextPayload.email)
      ) {
        toast.error('Email is invalid');
        return;
      }
      if (nextPayload.password) {
        const passwordValidation = validatePassword(nextPayload.password);
        if (!passwordValidation.valid) {
          toast.error(passwordValidation.errors[0]);
          return;
        }
      }
      const normalizeId = (v: string) =>
        v.trim().toLowerCase().replace(/_/g, '-');
      if (nextPayload.permissions)
        nextPayload.permissions = Array.from(
          new Set(nextPayload.permissions.map((s) => s.trim()))
        );
      // Merge servicePermissions into permissions
      if (nextPayload.servicePermissions && nextPayload.servicePermissions.length > 0) {
        nextPayload.permissions = Array.from(
          new Set([...(nextPayload.permissions || []), ...nextPayload.servicePermissions])
        );
      }
      // Remove servicePermissions from payload before sending (it's merged into permissions)
      // Set allowedServices to empty array since we removed it from the form
      const { servicePermissions, ...payloadToSend } = { ...nextPayload, allowedServices: [] };
      const updated = await updateAdmin(editTarget._id, payloadToSend);
      toast.success('Admin updated');
      setIsEditOpen(false);
      setEditTarget(null);
      setEditPayload({});
      setShowEditPassword(false);
      setAdmins((prev) =>
        prev.map((a) => (a._id === updated._id ? updated : a))
      );
    } catch (_err) {
      toast.error('Failed to update admin');
    }
  };

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);

  const openDeleteDialog = (admin: UserData) => {
    setDeleteTarget(admin);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAdmin(deleteTarget._id);
      toast.success('Admin deleted');
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      fetchAdmins();
    } catch (_err) {
      toast.error('Failed to delete admin');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="Admin Accounts" backHref={ROUTES.ADMIN.DASHBOARD} icon={ShieldCheck} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Admins ({pagination.totalCount})</span>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Admin
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="pl-10"
                    onKeyPress={(e) => e.key === 'Enter' && onSearch()}
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as 'all' | 'active' | 'inactive');
                  setCurrentPage(1);
                }}
                className="flex h-10 w-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={permissionFilter}
                onChange={(e) => {
                  setPermissionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex h-10 w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="all">All Permissions</option>
                {PERMISSION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={allowedServiceFilter}
                onChange={(e) => {
                  setAllowedServiceFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex h-10 w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="all">All Services</option>
                {SERVICE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Button onClick={onSearch}>Search</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : admins.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-gray-500"
                      >
                        No admins found
                      </TableCell>
                    </TableRow>
                  ) : (
                    admins.map((admin) => (
                      <TableRow key={admin._id}>
                        <TableCell className="font-medium truncate">
                          {admin.fullName}
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>{admin.contact}</TableCell>
                        <TableCell>
                          <Badge
                            variant={admin.isActive ? 'default' : 'secondary'}
                          >
                            {admin.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="flex justify-end text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewTarget(admin)}
                          >
                            <Eye className="h-4 w-4 mr-2" /> View
                          </Button>
                          {admin.role !== 'super_admin' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditOpen(admin)}
                              >
                                <Edit3 className="h-4 w-4 mr-2" /> Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => openDeleteDialog(admin)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex flex-col gap-3 items-center lg:flex-row lg:items-center lg:justify-between px-4 lg:px-6 py-4 border-t">
                <div className="text-sm text-gray-500">
                  Page {currentPage} of {pagination.totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={!pagination.hasPreviousPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create Admin Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Admin</DialogTitle>
            <DialogDescription>
              Fill in details and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Input
                placeholder="Email *"
                type="email"
                required
                value={createPayload.email}
                onChange={(e) =>
                  setCreatePayload({ ...createPayload, email: e.target.value })
                }
              />
            </div>
            <div className="relative">
              <Input
                placeholder="Password *"
                type={showPassword ? 'text' : 'password'}
                required
                value={createPayload.password}
                onChange={(e) =>
                  setCreatePayload({ ...createPayload, password: e.target.value })
                }
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              {createPayload.password && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-gray-700">Password Requirements:</p>
                  <div className="space-y-0.5 text-xs">
                    <div className={`flex items-center gap-2 ${createPayload.password.length >= 12 && createPayload.password.length <= 16 ? 'text-green-600' : 'text-gray-500'}`}>
                      <span>{createPayload.password.length >= 12 && createPayload.password.length <= 16 ? '✓' : '○'}</span>
                      <span>12-16 characters long</span>
                    </div>
                    <div className={`flex items-center gap-2 ${/[a-z]/.test(createPayload.password) ? 'text-green-600' : 'text-gray-500'}`}>
                      <span>{/[a-z]/.test(createPayload.password) ? '✓' : '○'}</span>
                      <span>Include lowercase letters</span>
                    </div>
                    <div className={`flex items-center gap-2 ${/[A-Z]/.test(createPayload.password) ? 'text-green-600' : 'text-gray-500'}`}>
                      <span>{/[A-Z]/.test(createPayload.password) ? '✓' : '○'}</span>
                      <span>Include uppercase letters</span>
                    </div>
                    <div className={`flex items-center gap-2 ${/[0-9]/.test(createPayload.password) ? 'text-green-600' : 'text-gray-500'}`}>
                      <span>{/[0-9]/.test(createPayload.password) ? '✓' : '○'}</span>
                      <span>Include numbers</span>
                    </div>
                    <div className={`flex items-center gap-2 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(createPayload.password) ? 'text-green-600' : 'text-gray-500'}`}>
                      <span>{/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(createPayload.password) ? '✓' : '○'}</span>
                      <span>Include special characters</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <Input
                placeholder="First name *"
                required
                value={createPayload.firstName}
                onChange={(e) =>
                  setCreatePayload({
                    ...createPayload,
                    firstName: e.target.value,
                  })
                }
              />
            </div>
            <Input
              placeholder="Middle name"
              value={createPayload.middleName}
              onChange={(e) =>
                setCreatePayload({
                  ...createPayload,
                  middleName: e.target.value,
                })
              }
            />
            <div>
              <Input
                placeholder="Last name *"
                required
                value={createPayload.lastName}
                onChange={(e) =>
                  setCreatePayload({ ...createPayload, lastName: e.target.value })
                }
              />
            </div>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={createPayload.gender}
              onChange={(e) =>
                setCreatePayload({
                  ...createPayload,
                  gender: e.target.value as 'male' | 'female',
                })
              }
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <div>
              <Input
                placeholder="Mobile no. (09XXXXXXXXX) *"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={createPayload.contact}
                onChange={(e) => {
                  // Only allow numeric input
                  const value = e.target.value.replace(/\D/g, '');
                  setCreatePayload({
                    ...createPayload,
                    contact: value,
                  });
                }}
                onKeyPress={(e) => {
                  // Prevent non-numeric characters
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
              />
              {(() => {
                const v = createPayload.contact.trim();
                const ok = /^09\d{9}$/.test(v);
                return v && !ok ? (
                  <p className="mt-1 text-xs text-red-600">
                    Enter a valid contact number (11 digits starting with 09)
                  </p>
                ) : null;
              })()}
            </div>
            <div className="col-span-1 md:col-span-2 space-y-2">
              <div className="text-sm font-medium">Permissions</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PERMISSION_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center space-x-2"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={createPayload.permissions.includes(opt.value)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...createPayload.permissions, opt.value]
                          : createPayload.permissions.filter(
                              (v) => v !== opt.value
                            );
                        setCreatePayload({
                          ...createPayload,
                          permissions: next,
                        });
                      }}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="col-span-1 md:col-span-2 space-y-2">
              <button
                type="button"
                onClick={() => setIsServicesExpanded(!isServicesExpanded)}
                className="flex items-center justify-between w-full text-sm font-medium text-left hover:text-gray-700 transition-colors"
              >
                <span>Services</span>
                {isServicesExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {isServicesExpanded && (
                <div className="ml-4 mt-2 space-y-2 border-l-2 border-gray-200 pl-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SERVICE_PERMISSION_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={createPayload.servicePermissions.includes(opt.value)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...createPayload.servicePermissions, opt.value]
                              : createPayload.servicePermissions.filter(
                                  (v) => v !== opt.value
                                );
                            setCreatePayload({
                              ...createPayload,
                              servicePermissions: next,
                            });
                          }}
                        />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Admin</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              admin account.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm">
            {deleteTarget && (
              <p>
                Are you sure you want to delete{' '}
                <span className="font-semibold">{deleteTarget.fullName}</span>
                {deleteTarget.email ? (
                  <span> ({deleteTarget.email})</span>
                ) : null}
                ?
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
            <DialogDescription>
              Update admin details and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Input
                placeholder="Email *"
                type="email"
                required
                value={editPayload.email ?? ''}
                onChange={(e) =>
                  setEditPayload({ ...editPayload, email: e.target.value })
                }
              />
            </div>
            <div className="relative">
              <Input
                placeholder="New Password (optional)"
                type={showEditPassword ? 'text' : 'password'}
                value={editPayload.password ?? ''}
                onChange={(e) =>
                  setEditPayload({ ...editPayload, password: e.target.value })
                }
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowEditPassword(!showEditPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showEditPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              {editPayload.password && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-gray-700">Password Requirements:</p>
                  <div className="space-y-0.5 text-xs">
                    <div className={`flex items-center gap-2 ${(editPayload.password.length >= 12 && editPayload.password.length <= 16) ? 'text-green-600' : 'text-gray-500'}`}>
                      <span>{(editPayload.password.length >= 12 && editPayload.password.length <= 16) ? '✓' : '○'}</span>
                      <span>12-16 characters long</span>
                    </div>
                    <div className={`flex items-center gap-2 ${/[a-z]/.test(editPayload.password) ? 'text-green-600' : 'text-gray-500'}`}>
                      <span>{/[a-z]/.test(editPayload.password) ? '✓' : '○'}</span>
                      <span>Include lowercase letters</span>
                    </div>
                    <div className={`flex items-center gap-2 ${/[A-Z]/.test(editPayload.password) ? 'text-green-600' : 'text-gray-500'}`}>
                      <span>{/[A-Z]/.test(editPayload.password) ? '✓' : '○'}</span>
                      <span>Include uppercase letters</span>
                    </div>
                    <div className={`flex items-center gap-2 ${/[0-9]/.test(editPayload.password) ? 'text-green-600' : 'text-gray-500'}`}>
                      <span>{/[0-9]/.test(editPayload.password) ? '✓' : '○'}</span>
                      <span>Include numbers</span>
                    </div>
                    <div className={`flex items-center gap-2 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(editPayload.password) ? 'text-green-600' : 'text-gray-500'}`}>
                      <span>{/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(editPayload.password) ? '✓' : '○'}</span>
                      <span>Include special characters</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <Input
                placeholder="First name *"
                required
                value={editPayload.firstName ?? ''}
                onChange={(e) =>
                  setEditPayload({ ...editPayload, firstName: e.target.value })
                }
              />
            </div>
            <Input
              placeholder="Middle name"
              value={editPayload.middleName ?? ''}
              onChange={(e) =>
                setEditPayload({ ...editPayload, middleName: e.target.value })
              }
            />
            <div>
              <Input
                placeholder="Last name *"
                required
                value={editPayload.lastName ?? ''}
                onChange={(e) =>
                  setEditPayload({ ...editPayload, lastName: e.target.value })
                }
              />
            </div>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={editPayload.gender ?? 'male'}
              onChange={(e) =>
                setEditPayload({
                  ...editPayload,
                  gender: e.target.value as 'male' | 'female',
                })
              }
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <div>
              <Input
                placeholder="Mobile no. (09XXXXXXXXX) *"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={editPayload.contact ?? ''}
                onChange={(e) => {
                  // Only allow numeric input
                  const value = e.target.value.replace(/\D/g, '');
                  setEditPayload({ ...editPayload, contact: value });
                }}
                onKeyPress={(e) => {
                  // Prevent non-numeric characters
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
              />
              {(() => {
                const v = (editPayload.contact ?? '').trim();
                if (!v) return null;
                const ok = /^09\d{9}$/.test(v);
                return !ok ? (
                  <p className="mt-1 text-xs text-red-600">
                    Enter a valid contact number (11 digits starting with 09)
                  </p>
                ) : null;
              })()}
            </div>
            <div className="col-span-1 md:col-span-2 space-y-2">
              <div className="text-sm font-medium">Permissions</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PERMISSION_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center space-x-2"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={(editPayload.permissions ?? []).includes(
                        opt.value
                      )}
                      onChange={(e) => {
                        const current = editPayload.permissions ?? [];
                        const next = e.target.checked
                          ? [...current, opt.value]
                          : current.filter((v) => v !== opt.value);
                        setEditPayload({ ...editPayload, permissions: next });
                      }}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="col-span-1 md:col-span-2 space-y-2">
              <button
                type="button"
                onClick={() => setIsEditServicesExpanded(!isEditServicesExpanded)}
                className="flex items-center justify-between w-full text-sm font-medium text-left hover:text-gray-700 transition-colors"
              >
                <span>Services</span>
                {isEditServicesExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {isEditServicesExpanded && (
                <div className="ml-4 mt-2 space-y-2 border-l-2 border-gray-200 pl-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SERVICE_PERMISSION_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={(editPayload.servicePermissions ?? []).includes(opt.value)}
                          onChange={(e) => {
                            const current = editPayload.servicePermissions ?? [];
                            const next = e.target.checked
                              ? [...current, opt.value]
                              : current.filter((v) => v !== opt.value);
                            setEditPayload({
                              ...editPayload,
                              servicePermissions: next,
                            });
                          }}
                        />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Admin Dialog */}
      <Dialog
        open={!!viewTarget}
        onOpenChange={(open) => !open && setViewTarget(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Admin Details</DialogTitle>
            <DialogDescription>View role and access control</DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-sm text-gray-500">Name</div>
                  <div className="font-medium">{viewTarget.fullName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div>{viewTarget.email}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Role</div>
                  <Badge variant="secondary">
                    {viewTarget.role === 'super_admin'
                      ? 'SUPER ADMIN'
                      : 'ADMIN'}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <Badge
                    variant={viewTarget.isActive ? 'default' : 'secondary'}
                  >
                    {viewTarget.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Permissions</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {viewTarget.permissions &&
                  viewTarget.permissions.length > 0 ? (
                    viewTarget.permissions.map((p) => {
                      const label = formatPermissionName(p);
                      return (
                        <Badge key={p} variant="secondary">
                          {label}
                        </Badge>
                      );
                    })
                  ) : (
                    <span className="text-xs text-gray-500">None</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
