'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  getUserTransactions,
  getUserTransactionById,
  UserTransactionData,
  UserTransactionsListResponse,
} from '@/lib/api';
import {
  Eye,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
} from 'lucide-react';
import type { PublicSettings } from '@/lib/settings';
import { fetchPublicSettings } from '@/lib/settings';
import { downloadReceiptPdf } from '@/components/organism/receipt-paper';
import { SERVICE_NAME_BY_ID } from '@shared/constants/services';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';
import { CitizenPageLayout } from '@/components/molecules/citizen-page-layout';

export default function TransactionHistoryPage(): React.JSX.Element {
  const [transactions, setTransactions] = useState<UserTransactionData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceIdFilter, setServiceIdFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedTransaction, setSelectedTransaction] =
    useState<UserTransactionData | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [fieldLabelMap, setFieldLabelMap] = useState<Record<string, string>>(
    {}
  );

  const itemsPerPage = 10;

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const res: UserTransactionsListResponse = await getUserTransactions({
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter === 'all' ? undefined : statusFilter,
        serviceId: serviceIdFilter || undefined,
        q: searchQuery || undefined,
      });
      setTransactions(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    fetchPublicSettings()
      .then((s) => {
        if (mounted) setSettings(s);
      })
      .catch(() => {
        // ignore; defaults handled by fetchPublicSettings
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleViewDetails = async (transactionId: string) => {
    try {
      const transaction = await getUserTransactionById(transactionId);
      setSelectedTransaction(transaction);
      setShowDetails(true);
      setFieldLabelMap({});
      try {
        const API_BASE_URL =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const res = await fetch(
          `${API_BASE_URL}/settings/form-config/${transaction.service.serviceId}`,
          { credentials: 'include' }
        );
        if (res.ok) {
          const cfg = (await res.json()) as {
            formFields?: Array<{ id: string; label: string }>;
          };
          const map: Record<string, string> = {};
          (cfg.formFields || []).forEach((f) => {
            if (f && f.id) map[f.id] = f.label || f.id;
          });
          setFieldLabelMap(map);
        }
      } catch {
        // ignore
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load transaction details');
    }
  };

  const handleViewFile = async (
    key: string,
    transactionId?: string,
    fieldId?: string
  ) => {
    // Open a blank tab immediately to avoid popup blockers
    let newTab: Window | null = null;
    try {
      newTab = window.open('', '_blank');
    } catch {
      // ignore
    }
    try {
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const qp = new URLSearchParams({ key });
      if (transactionId) qp.set('transactionId', transactionId);
      if (fieldId) qp.set('fieldId', fieldId);
      const res = await fetch(`${API_BASE_URL}/uploads/view?${qp.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        toast.error('Unable to open file');
        if (newTab) newTab.close();
        return;
      }
      const { url } = (await res.json()) as { url: string };
      if (url) {
        if (newTab) newTab.location.href = url;
        else window.open(url, '_blank');
      } else {
        toast.error('File URL not available');
        if (newTab) newTab.close();
      }
    } catch {
      toast.error('Unable to open file');
      if (newTab) newTab.close();
    }
  };

  const handleDownloadReceipt = async (transactionId: string) => {
    try {
      const tx = await getUserTransactionById(transactionId);
      const s = settings ?? (await fetchPublicSettings());
      const cityName = s?.city.fullName || 'LGU';
      const systemName = s?.branding.systemName || 'Payment System';
      const sealLogoUrl = s?.assets.sealLogoUrl || '/seal-logo.svg';
      const dateStr = new Date(tx.date).toLocaleString();

      const items = tx.details.breakdown.map((item) => ({
        label: item.label,
        amount: totalFormatted(item.amountMinor),
      }));
      await downloadReceiptPdf(
        {
          sealLogoUrl,
          cityName,
          systemName,
          reference: tx.details.reference,
          dateTime: dateStr,
          serviceName: tx.service.name,
          items,
          total: totalFormatted(tx.totalAmountMinor),
        },
        { filename: `receipt-${tx.details.reference}.pdf` }
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to download receipt');
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, serviceIdFilter]);

  const totalFormatted = (minor: number) => `₱${(minor / 100).toFixed(2)}`;

  const getStatusBadge = (status: UserTransactionData['status']) => {
    const variant:
      | 'default'
      | 'secondary'
      | 'destructive'
      | 'outline'
      | 'warning' =
      status === 'paid' || status === 'completed'
        ? 'default'
        : status === 'failed'
        ? 'destructive'
        : status === 'refunded'
        ? 'warning'
        : 'secondary';
    return <Badge variant={variant}>{status.replaceAll('_', ' ')}</Badge>;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const serviceOptions = [
    { value: '', label: 'All Services' },
    ...Object.entries(SERVICE_NAME_BY_ID).map(([id, name]) => ({
      value: id,
      label: name,
    })),
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'awaiting_payment', label: 'Awaiting Payment' },
    { value: 'paid', label: 'Paid' },
    { value: 'refunded', label: 'Refunded' },
    { value: 'failed', label: 'Failed' },
    { value: 'completed', label: 'Completed' },
  ];

  return (
    <CitizenPageLayout>
      {/* Page Header */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-4 sm:mb-0">
                <h2 className="text-2xl font-bold text-gray-800">
                  Transaction History
                </h2>
                <p className="text-gray-600 mt-1">
                  View and manage your payment transactions
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="w-full md:w-36">
                <label className="text-sm text-gray-600">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full md:w-36">
                <label className="text-sm text-gray-600">Service</label>
                <select
                  value={serviceIdFilter}
                  onChange={(e) => setServiceIdFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {serviceOptions.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="text-sm text-gray-600">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-10 w-full"
                    placeholder="Search by reference, service, or amount"
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
                    fetchTransactions();
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions - Responsive */}
        <Card>
          <CardContent className="p-0">
            {/* Mobile/Tablet Cards */}
            <div className="block lg:hidden">
              {isLoading ? (
                <div className="py-10 text-center text-gray-500">
                  Loading...
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-10 text-center text-gray-500">
                  No transactions found
                </div>
              ) : (
                <ul className="divide-y">
                  {transactions.map((transaction) => (
                    <li key={transaction._id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {transaction.service.name}
                          </div>

                          <div className="mt-1 text-xs text-gray-500">
                            {new Date(transaction.date).toLocaleString(
                              'en-US',
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-mono truncate mt-1">
                            {transaction.details.reference}
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <span className="text-sm font-semibold">
                              {totalFormatted(transaction.totalAmountMinor)}
                            </span>
                            {getStatusBadge(transaction.status)}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(transaction._id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(transaction.status === 'completed' ||
                              transaction.status === 'paid') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDownloadReceipt(transaction._id)
                                }
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service Name</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Date and Time</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : transactions.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-gray-500"
                        >
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((transaction) => {
                        return (
                          <TableRow key={transaction._id}>
                            <TableCell>
                              <span>{transaction.service.name}</span>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {transaction.details.reference}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm">
                                  {new Date(
                                    transaction.date
                                  ).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(
                                    transaction.date
                                  ).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {totalFormatted(transaction.totalAmountMinor)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(transaction.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleViewDetails(transaction._id)
                                  }
                                >
                                  <Eye className="h-4 w-4 mr-2" /> Details
                                </Button>
                                {(transaction.status === 'completed' ||
                                  transaction.status === 'paid') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleDownloadReceipt(transaction._id)
                                    }
                                  >
                                    <Download className="h-4 w-4 mr-2" />{' '}
                                    Receipt
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col gap-3 items-center lg:flex-row lg:items-center lg:justify-between px-4 lg:px-6 py-4 border-t">
                <div className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, pagination.totalCount)}{' '}
                  of {pagination.totalCount} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={!pagination.hasPreviousPage}
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Service
                  </div>
                  <div className="text-sm ">
                    {selectedTransaction.service.name}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Reference
                  </div>
                  <div className="font-mono text-sm">
                    {selectedTransaction.details.reference}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Status
                  </div>
                  <div>{getStatusBadge(selectedTransaction.status)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Total</div>
                  <div className="text-sm ">
                    {totalFormatted(selectedTransaction.totalAmountMinor)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Date</div>
                  <div className="text-sm">
                    {formatDate(selectedTransaction.date)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Payment Method
                  </div>
                  <div className="text-sm">
                    {selectedTransaction.payment?.subchannel ||
                      selectedTransaction.payment?.channel ||
                      'N/A'}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Breakdown</div>
                <div className="border rounded-lg overflow-x-auto">
                  <Table className="min-w-[420px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTransaction.details.breakdown.map(
                        (item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-sm">
                              {item.label}
                            </TableCell>
                            <TableCell className="text-sm">
                              {totalFormatted(item.amountMinor)}
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>

                {selectedTransaction.details.formData &&
                  Object.keys(selectedTransaction.details.formData).length >
                    0 && (
                    <div className="mt-4">
                      <div className="text-sm font-semibold mb-2">
                        Information
                      </div>
                      <div className="border rounded-lg overflow-x-auto">
                        <Table className="min-w-[420px]">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Field</TableHead>
                              <TableHead>Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(
                              selectedTransaction.details.formData
                            ).map(([key, value]) => (
                              <TableRow key={key}>
                                <TableCell className="text-sm font-medium">
                                  {fieldLabelMap[key] ||
                                    key
                                      .replace(/([A-Z])/g, ' $1')
                                      .replace(/^./, (str) =>
                                        str.toUpperCase()
                                      )}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {typeof value === 'string' &&
                                  value.startsWith('service/') ? (
                                    <button
                                      type="button"
                                      className="text-blue-600 underline inline-flex items-center gap-1"
                                      onClick={() =>
                                        handleViewFile(
                                          value,
                                          selectedTransaction._id,
                                          key
                                        )
                                      }
                                    >
                                      <LinkIcon className="h-3 w-3" /> View file
                                    </button>
                                  ) : typeof value === 'object' ? (
                                    JSON.stringify(value)
                                  ) : (
                                    String(value)
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                {(selectedTransaction.status === 'completed' ||
                  selectedTransaction.status === 'paid') && (
                  <Button
                    onClick={() =>
                      handleDownloadReceipt(selectedTransaction._id)
                    }
                    className="flex items-center"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Receipt
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CitizenPageLayout>
  );
}
