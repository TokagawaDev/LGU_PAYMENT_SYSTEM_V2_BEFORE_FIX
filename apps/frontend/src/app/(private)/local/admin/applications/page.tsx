'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea, Select } from '@/components/ui/select';
import { FileText, Search, Eye, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AdminHeader from '@/components/molecules/admin-header';
import { useRequireAuth } from '@/hooks/use-auth';
import { ROUTES } from '@/constants/routes';
import {
  getApplications,
  getApplicationById,
  updateApplicationStatus,
  getCustomApplicationServices,
  type ApplicationData,
  ApplicationsListResponse,
  GetApplicationsParams,
  type CustomApplicationService,
} from '@/lib/api/admin';
import { SubmissionViewDialog, buildFormDisplayRows } from '@/components/organism/submission-view-dialog';
import type { AddOnSubmissionItem } from '@/hooks/use-add-on-submissions';

export default function AdminApplicationsPage() {
  useRequireAuth();

  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewing' | 'approved' | 'rejected'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    total: 0,
    page: 1,
    limit: 10,
  });

  const [selectedApplication, setSelectedApplication] = useState<ApplicationData | null>(null);
  const [showApplicationDetails, setShowApplicationDetails] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [newAdminStatus, setNewAdminStatus] = useState<'pending' | 'reviewing' | 'rejected' | 'approved'>('pending');
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [customApplicationServices, setCustomApplicationServices] = useState<CustomApplicationService[]>([]);

  const itemsPerPage = 10;

  const fetchApplications = useCallback(async (params: GetApplicationsParams = {}) => {
    try {
      setIsLoading(true);

      const searchParams: GetApplicationsParams = {
        page: currentPage,
        limit: itemsPerPage,
        ...params,
      };

      if (searchQuery.trim()) {
        searchParams.search = searchQuery.trim();
      }

      if (statusFilter !== 'all') {
        searchParams.adminStatus = statusFilter;
      }

      const response: ApplicationsListResponse = await getApplications(searchParams);
      setApplications(response.items);
      setPagination({
        totalPages: response.totalPages,
        total: response.total,
        page: response.page,
        limit: response.limit,
      });
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, searchQuery]);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    const loadCustomApplicationServices = async () => {
      try {
        const services = await getCustomApplicationServices();
        setCustomApplicationServices(services);
      } catch (error) {
        console.error('Failed to load custom application services:', error);
      }
    };
    void loadCustomApplicationServices();
  }, []);

  const handleSearch = () => {
    setCurrentPage(1);
    void fetchApplications();
  };

  const handleViewDetails = async (application: ApplicationData) => {
    try {
      setIsLoadingDetails(true);
      const details = await getApplicationById(application.id);
      setSelectedApplication(details);
      setShowApplicationDetails(true);
    } catch (error) {
      console.error('Failed to fetch application details:', error);
      toast.error('Failed to load application details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleOpenStatusUpdate = (application: ApplicationData) => {
    setSelectedApplication(application);
    setNewAdminStatus(application.adminStatus || 'pending');
    setAdminNotes(application.adminNotes || '');
    setShowStatusUpdate(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedApplication) return;

    try {
      setIsUpdatingStatus(true);
      await updateApplicationStatus(selectedApplication.id, {
        adminStatus: newAdminStatus,
        adminNotes: adminNotes.trim() || undefined,
      });
      toast.success('Application status updated successfully');
      setShowStatusUpdate(false);
      await fetchApplications(); // Refresh the list
      if (showApplicationDetails) {
        await handleViewDetails(selectedApplication);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update application status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getAdminStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'reviewing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getFormService = (application: ApplicationData): CustomApplicationService | undefined => {
    return customApplicationServices.find(
      (s) => s.id === application.customApplicationServiceId || s.id === application.addOnId
    );
  };

  const getFormTypeName = (application: ApplicationData): string => {
    if (application.customApplicationServiceTitle?.trim()) {
      return application.customApplicationServiceTitle.trim();
    }
    const service = getFormService(application);
    return service?.title ?? application.customApplicationServiceId ?? application.addOnId ?? 'N/A';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        title="Applications"
        backHref={ROUTES.ADMIN.DASHBOARD}
        icon={FileText}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="w-full md:w-40">
                <label className="text-sm text-gray-600">Admin Status</label>
                <select
                  value={statusFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setStatusFilter(e.target.value as 'all' | 'pending' | 'reviewing' | 'approved' | 'rejected')
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm text-gray-600">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-10 w-full"
                    placeholder="Search by form title, application ID, or user ID"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setCurrentPage(1)}
                  />
                </div>
              </div>
              <div>
                <Button
                  onClick={() => {
                    setCurrentPage(1);
                    handleSearch();
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="min-w-[140px]">Form Title</TableHead>
                    <TableHead>Application ID</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>User Status</TableHead>
                    <TableHead>Admin Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : applications.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-gray-500"
                      >
                        No applications found
                      </TableCell>
                    </TableRow>
                  ) : (
                    applications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell>
                          <div className="flex flex-col truncate">
                            <span className="text-sm">
                              {new Date(application.updatedAt || application.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(application.updatedAt || application.createdAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium min-w-[140px]" title={getFormTypeName(application)}>
                          <span className="truncate block max-w-[200px]">
                            {getFormTypeName(application)}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <button
                            type="button"
                            onClick={() => {
                              // Application ID is unique - clicking it opens details for this specific application
                              void handleViewDetails(application);
                            }}
                            className="text-indigo-600 hover:text-indigo-700 hover:underline truncate max-w-[120px] block"
                            title={`Unique Application ID: ${application.id} - Click to view details`}
                          >
                            {application.id.slice(0, 8)}...
                          </button>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery(application.userId);
                              setCurrentPage(1);
                              void fetchApplications({ userId: application.userId });
                            }}
                            className="text-indigo-600 hover:text-indigo-700 hover:underline truncate max-w-[120px] block"
                            title={`Unique User ID: ${application.userId} - Click to filter by this user`}
                          >
                            {application.userId.slice(0, 8)}...
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              application.status === 'submitted'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {application.status === 'submitted'
                              ? 'Submitted'
                              : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {application.status === 'submitted' ? (
                            <Badge
                              className={getAdminStatusColor(application.adminStatus || 'pending')}
                            >
                              {(application.adminStatus || 'pending').charAt(0).toUpperCase() +
                                (application.adminStatus || 'pending').slice(1)}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(application)}
                            >
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </Button>
                            {application.status === 'submitted' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenStatusUpdate(application)}
                              >
                                <Edit className="h-4 w-4 mr-2" /> Update Status
                              </Button>
                            )}
                          </div>
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
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)}{' '}
                  of {pagination.total} results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <span className="text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {selectedApplication && (
        <SubmissionViewDialog
          open={showApplicationDetails}
          onOpenChange={setShowApplicationDetails}
          submission={{
            ...selectedApplication,
            id: selectedApplication.id || selectedApplication._id || '',
            userId: selectedApplication.userId || '',
            customApplicationServiceId: selectedApplication.customApplicationServiceId || selectedApplication.addOnId || '',
            addOnId: selectedApplication.addOnId || selectedApplication.customApplicationServiceId,
            customApplicationServiceTitle: selectedApplication.customApplicationServiceTitle ?? undefined,
          } as AddOnSubmissionItem}
          addOn={getFormService(selectedApplication)}
        />
      )}

      {/* Status Update Dialog */}
      <Dialog open={showStatusUpdate} onOpenChange={setShowStatusUpdate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Application Status</DialogTitle>
            <DialogDescription>
              Update the admin status for this application. The user will be notified via email.
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Application ID</div>
                  <div className="font-mono text-sm text-gray-600">{selectedApplication.id}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Form Title</div>
                  <div className="text-sm text-gray-600">{getFormTypeName(selectedApplication)}</div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Status *
                </label>
                <Select
                  value={newAdminStatus}
                  onChange={(e) =>
                    setNewAdminStatus(e.target.value as 'pending' | 'reviewing' | 'rejected' | 'approved')
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="rejected">Rejected</option>
                  <option value="approved">Approved</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes (Optional)
                </label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes or comments about this application..."
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  These notes will be included in the email notification to the user.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowStatusUpdate(false)}
                  disabled={isUpdatingStatus}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateStatus}
                  disabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
