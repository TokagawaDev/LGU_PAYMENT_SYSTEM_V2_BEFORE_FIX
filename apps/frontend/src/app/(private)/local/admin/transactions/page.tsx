'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/molecules/admin-header';
import { ROUTES } from '@/constants/routes';
import { useRequireAuth } from '@/hooks/use-auth';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getTransactions,
  TransactionsListResponse,
  TransactionData,
  TransactionStatus,
} from '@/lib/api/admin';
import {
  Eye,
  CreditCard,
  Search,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';
import {
  SERVICE_NAME_BY_ID,
  normalizeToServiceId,
  ServiceId,
} from '@shared/constants/services';

export default function AdminTransactionsPage() {
  const { user } = useRequireAuth();

  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [statusFilter, setStatusFilter] = useState<'all' | TransactionStatus>(
    'all'
  );
  const [serviceIdFilter, setServiceIdFilter] = useState<string>('');
  const allowedServiceIds = (user?.allowedServices ?? []) as string[];
  const serviceOptions = ((): Array<{ value: string; label: string }> => {
    const labelById: Record<string, string> = SERVICE_NAME_BY_ID as Record<
      string,
      string
    >;
    const normalizedAllowedIds: ServiceId[] = (allowedServiceIds || [])
      .map((raw) => normalizeToServiceId(raw))
      .filter((v): v is ServiceId => Boolean(v));
    const uniqueAllowedIds: ServiceId[] = Array.from(
      new Set<ServiceId>(normalizedAllowedIds)
    );
    const sourceIds: string[] =
      uniqueAllowedIds.length > 0 ? uniqueAllowedIds : Object.keys(labelById);
    const opts = sourceIds.map((id) => ({
      value: id,
      label: labelById[id] ?? id,
    }));
    if (opts.length > 1) return [{ value: '', label: 'All' }, ...opts];
    return opts.length === 1 ? opts : [{ value: '', label: 'All' }, ...opts];
  })();
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selected, setSelected] = useState<TransactionData | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [fieldLabelMap, setFieldLabelMap] = useState<Record<string, string>>(
    {}
  );

  const itemsPerPage = 10;

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const res: TransactionsListResponse = await getTransactions({
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

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  const handleView = async (txn: TransactionData) => {
    setSelected(txn);
    setShowDetails(true);
    setFieldLabelMap({});
    try {
      const res = await fetch(
        `${API_BASE_URL}/settings/form-config/${txn.service.serviceId}`,
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
  };

  const handleViewFile = async (key: string) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/uploads/view?key=${encodeURIComponent(key)}`,
        { credentials: 'include' }
      );
      if (!res.ok) return;
      const { url } = (await res.json()) as { url: string };
      if (url) window.open(url, '_blank');
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, serviceIdFilter]);

  const totalFormatted = (minor: number) => `₱${(minor / 100).toFixed(2)}`;

  type BadgeVariant =
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'warning';
  const statusBadge = (status: TransactionStatus) => {
    const variant: BadgeVariant =
      status === 'paid' || status === 'completed'
        ? 'default'
        : status === 'failed'
        ? 'destructive'
        : status === 'refunded'
        ? 'warning'
        : 'secondary';
    return <Badge variant={variant}>{status.replaceAll('_', ' ')}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        title="Transactions"
        backHref={ROUTES.ADMIN.DASHBOARD}
        icon={CreditCard}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setStatusFilter(e.target.value as 'all' | TransactionStatus)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All</option>
                  {[
                    'pending',
                    'awaiting_payment',
                    'paid',
                    'failed',
                    'completed',
                    'refunded',
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll('_', ' ')}
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
                  {serviceOptions.map((o) => (
                    <option key={o.value || 'all'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 ">
                <label className="text-sm text-gray-600">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-10 w-full"
                    placeholder="Search by reference, name, or email"
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

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>User / Email</TableHead>
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
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-gray-500"
                      >
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((t) => (
                      <TableRow key={t._id}>
                        <TableCell>
                          <div className="flex flex-col truncate">
                            <span className="text-sm">
                              {new Date(t.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(t.date).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="truncate">
                          {t.service.name}
                        </TableCell>
                        <TableCell className="font-mono text-sm truncate">
                          {t.details.reference}
                        </TableCell>
                        <TableCell>
                          {totalFormatted(t.totalAmountMinor)}
                        </TableCell>
                        <TableCell>{statusBadge(t.status)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {t.userFullName ||
                                (t.userEmail ? t.userEmail.split('@')[0] : '-')}
                            </span>
                            <span className="text-xs text-gray-500">
                              {t.userEmail || '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(t)}
                          >
                            <Eye className="h-4 w-4 mr-2" /> View Details
                          </Button>
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
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, pagination.totalCount)}{' '}
                  of {pagination.totalCount} results
                </div>
                <div className="flex items-center space-x-2">
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
      </main>
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-500">User</div>
                  <div className="text-sm font-semibold">
                    {selected.userFullName ||
                      (selected.userEmail
                        ? selected.userEmail.split('@')[0]
                        : '-')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {selected.userEmail || '-'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Service
                  </div>
                  <div className="text-sm font-semibold">
                    {selected.service.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {selected.service.serviceId}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Reference
                  </div>
                  <div className="font-mono text-sm">
                    {selected.details.reference}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Status
                  </div>
                  <div>{statusBadge(selected.status)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Total</div>
                  <div className="text-sm font-semibold">
                    {totalFormatted(selected.totalAmountMinor)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Date</div>
                  <div className="text-sm">
                    {new Date(selected.date).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Payment Method
                  </div>
                  <div className="text-sm">
                    {selected.payment?.subchannel ||
                      selected.payment?.channel ||
                      'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    PayMongo Reference
                  </div>
                  <div className="font-mono text-sm">
                    {selected.payment?.providerTransactionId || '-'}
                  </div>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <div className="text-sm font-semibold mb-2">Breakdown</div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selected.details.breakdown.map((b, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-sm">{b.label}</TableCell>
                          <TableCell className="text-sm">
                            {totalFormatted(b.amountMinor)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {selected.details.formData &&
                  Object.keys(selected.details.formData).length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-semibold mb-2">
                        Information
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Field</TableHead>
                              <TableHead>Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(selected.details.formData).map(
                              ([key, value]) => (
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
                                        onClick={() => handleViewFile(value)}
                                      >
                                        <LinkIcon className="h-3 w-3" /> View
                                        file
                                      </button>
                                    ) : typeof value === 'object' ? (
                                      JSON.stringify(value)
                                    ) : (
                                      String(value)
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
              </div>
              <div className="text-xs text-gray-500">
                Created: {new Date(selected.createdAt).toLocaleString()} •
                Updated: {new Date(selected.updatedAt).toLocaleString()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
