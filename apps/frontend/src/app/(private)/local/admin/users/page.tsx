'use client';

import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Badge } from '@/components/ui/badge';
import { Users, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ROUTES } from '@/constants/routes';
import AdminHeader from '@/components/molecules/admin-header';
import { useRequireAuth } from '@/hooks/use-auth';
import {
  getUsers,
  getUserById,
  getTransactions,
  type TransactionData,
  UserData,
  UsersListResponse,
  GetUsersParams,
} from '@/lib/api/admin';

export default function AdminUsersPage() {
  // Router available via AdminHeader when needed
  useRequireAuth();

  // State management
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<
    'all' | 'individual' | 'business'
  >('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Dialog states
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [userTransactions, setUserTransactions] = useState<TransactionData[]>(
    []
  );
  const [isLoadingTransactions, setIsLoadingTransactions] =
    useState<boolean>(false);

  const itemsPerPage = 10;

  // Header handles logout; keep no local logout handler

  const fetchUsers = async (params: GetUsersParams = {}) => {
    try {
      setIsLoading(true);

      const searchParams: GetUsersParams = {
        page: currentPage,
        limit: itemsPerPage,
        ...params,
      };

      if (searchQuery.trim()) {
        searchParams.search = searchQuery.trim();
      }

      if (accountTypeFilter !== 'all') {
        searchParams.accountType = accountTypeFilter as
          | 'individual'
          | 'business';
      }

      const response: UsersListResponse = await getUsers(searchParams);
      setUsers(response.users);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    // Reset to first page; effect on currentPage will trigger fetch
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleViewUser = async (user: UserData) => {
    try {
      const userDetails = await getUserById(user._id);
      setSelectedUser(userDetails);
      setShowUserDetails(true);
      setIsLoadingTransactions(true);
      setUserTransactions([]);
      // fetch last 3 transactions for this user
      const txRes = await getTransactions({
        page: 1,
        limit: 3,
        userId: user._id,
      });
      setUserTransactions(txRes.data || []);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      toast.error('Failed to load user details');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountTypeFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="User Management" backHref={ROUTES.ADMIN.DASHBOARD} icon={Users} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Users ({pagination.totalCount})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>
              <select
                value={accountTypeFilter}
                onChange={(e) =>
                  setAccountTypeFilter(
                    e.target.value as 'all' | 'individual' | 'business'
                  )
                }
                className="flex h-10 w-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="all">All Account Types</option>
                <option value="individual">Individual</option>
                <option value="business">Business</option>
              </select>
              <Button onClick={handleSearch}>Search</Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Account Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <span className="ml-2">Loading users...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-gray-500"
                      >
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell className="font-medium truncate">
                          {user.fullName}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.contact}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {user.accountType.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewUser(user)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col gap-3 items-center lg:flex-row lg:items-center lg:justify-between px-4 lg:px-6 py-4 border-t">
                <div className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, pagination.totalCount)}{' '}
                  of {pagination.totalCount} results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPreviousPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* User Details Dialog */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>User Details & Transactions</DialogTitle>
            <DialogDescription>
              View user information and their transaction history
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* User Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Full Name
                  </label>
                  <p className="text-sm font-semibold">
                    {selectedUser.fullName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Email
                  </label>
                  <p className="text-sm">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Contact
                  </label>
                  <p className="text-sm">{selectedUser.contact}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Account Type
                  </label>
                  <Badge variant="secondary">
                    {selectedUser.accountType.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Transaction History */}
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Latest Transactions
                </h3>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingTransactions ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center py-6 text-gray-500"
                          >
                            Loading transactions...
                          </TableCell>
                        </TableRow>
                      ) : userTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center py-6 text-gray-500"
                          >
                            No transactions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        userTransactions.map((t) => {
                          const amount = (t.totalAmountMinor || 0) / 100;
                          const dateStr = t.date || t.createdAt;
                          return (
                            <TableRow key={t._id}>
                              <TableCell className="font-medium">
                                {t.details?.reference || '-'}
                              </TableCell>
                              <TableCell>{t.service?.name || '-'}</TableCell>
                              <TableCell>
                                {new Intl.NumberFormat('en-PH', {
                                  style: 'currency',
                                  currency: 'PHP',
                                }).format(amount)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    t.status === 'completed' ||
                                    t.status === 'paid'
                                      ? 'default'
                                      : 'secondary'
                                  }
                                >
                                  {t.status.replaceAll('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {dateStr
                                  ? new Date(dateStr).toLocaleString('en-PH', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
