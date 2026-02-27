'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminHeader from '@/components/molecules/admin-header';
import { ROUTES } from '@/constants/routes';
import { useRequireAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AggregatePeriod,
  AggregatedReportResult,
  AggregatedTimeSeriesRow,
  AggregatedBreakdownRow,
  getTransactionsAggregate,
  PaymentChannel,
  TransactionStatus,
} from '@/lib/api/admin';
// import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, LineChart, PieChart, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';
import {
  SERVICE_NAME_BY_ID,
  normalizeToServiceId,
  ServiceId,
} from '@shared/constants/services';
import {
  getApplicationStats,
  ApplicationStats,
} from '@/lib/api/admin';

type ApexChartProps = {
  options: Record<string, unknown>;
  series: Array<unknown>;
  type: 'line' | 'area' | 'bar' | 'donut' | 'pie' | 'radar' | 'heatmap';
  height?: number | string;
  width?: number | string;
};
const ApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
}) as unknown as React.ComponentType<ApexChartProps>;

function formatCurrency(minor: number): string {
  return `₱${(minor / 100).toFixed(2)}`;
}

export default function AdminReportsPage() {
  const { user } = useRequireAuth();
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

  const [period, setPeriod] = useState<AggregatePeriod>('day');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [serviceId, setServiceId] = useState<string>('');
  const [channel, setChannel] = useState<PaymentChannel | ''>('');
  const [status, setStatus] = useState<TransactionStatus | ''>('');

  const [report, setReport] = useState<AggregatedReportResult | null>(null);
  const [seriesBy, setSeriesBy] = useState<
    'service' | 'channel' | 'status' | ''
  >('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [applicationStats, setApplicationStats] = useState<ApplicationStats | null>(null);
  const [isLoadingAppStats, setIsLoadingAppStats] = useState<boolean>(true);

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const res = await getTransactionsAggregate({
        period,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        serviceId: serviceId || undefined,
        channel: (channel as PaymentChannel) || undefined,
        status: (status as TransactionStatus) || undefined,
        ...(seriesBy ? { seriesBy } : {}),
      });
      setReport(res);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  useEffect(() => {
    const loadAppStats = async () => {
      try {
        setIsLoadingAppStats(true);
        const stats = await getApplicationStats();
        setApplicationStats(stats);
      } catch (err) {
        console.error(err);
        // Don't show toast for app stats, just log error
      } finally {
        setIsLoadingAppStats(false);
      }
    };
    void loadAppStats();
  }, []);

  const timeSeriesChart = useMemo(() => {
    if (
      !report ||
      !Array.isArray(report.timeSeries) ||
      report.timeSeries.length === 0
    )
      return null;
    const categories = report.timeSeries.map(
      (r: AggregatedTimeSeriesRow) => r.periodValue ?? ''
    );
    const amounts = report.timeSeries.map((r) =>
      Number.isFinite(r.totalAmountMinor) ? r.totalAmountMinor : 0
    );
    const rates = report.timeSeries.map((r) =>
      Number.isFinite(r.successRate) ? Number(r.successRate.toFixed(2)) : 0
    );
    return {
      options: {
        chart: { id: 'collections-trend', toolbar: { show: false } },
        xaxis: { categories },
        yaxis: [
          {
            seriesName: 'Total Amount',
            labels: { formatter: (v: number) => `₱${(v / 100).toFixed(0)}` },
          },
          {
            opposite: true,
            seriesName: 'Success Rate',
            labels: { formatter: (v: number) => `${v.toFixed(0)}%` },
            max: 100,
          },
        ],
        tooltip: {
          shared: true,
          intersect: false,
          y: [
            {
              formatter: (v: number) => `₱${(v / 100).toFixed(2)}`,
            },
            {
              formatter: (v: number) => `${v.toFixed(2)}%`,
            },
          ],
        },
      },
      series: [
        {
          name: 'Total Amount',
          type: 'column',
          data: amounts,
        },
        {
          name: 'Success Rate',
          type: 'line',
          data: rates,
        },
      ],
    };
  }, [report]);

  const channelChart = useMemo(() => {
    if (
      !report ||
      !Array.isArray(report.byChannel) ||
      report.byChannel.length === 0
    )
      return null;
    return {
      options: {
        chart: { id: 'by-channel', toolbar: { show: false } },
        labels: report.byChannel.map((b) =>
          b?.label ? String(b.label) : 'unknown'
        ),
        legend: { position: 'bottom' },
        tooltip: {
          y: { formatter: (v: number) => `${v.toFixed(0)} transactions` },
        },
      },
      series: report.byChannel.map((b) =>
        Number.isFinite(b.count) ? b.count : 0
      ),
    };
  }, [report]);

  const topServiceRows = useMemo<AggregatedBreakdownRow[]>(() => {
    if (
      !report ||
      !Array.isArray(report.byService) ||
      report.byService.length === 0
    ) {
      return [];
    }
    return [...report.byService]
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 5);
  }, [report]);

  const exportCsv = () => {
    if (!report) return;
    const rows: string[] = [];
    // Header with filters context
    const df = dateFrom ? new Date(dateFrom).toISOString().slice(0, 10) : 'all';
    const dt = dateTo ? new Date(dateTo).toISOString().slice(0, 10) : 'all';
    const meta: Record<string, string> = {
      period,
      dateFrom: df,
      dateTo: dt,
      serviceId: serviceId || 'all',
      channel: channel || 'all',
      status: status || 'all',
      seriesBy: seriesBy || 'none',
    };
    rows.push(`# LGU Transactions Report`);
    rows.push(`# Generated: ${new Date().toISOString()}`);
    rows.push(
      `# Filters: period=${meta.period}; dateFrom=${meta.dateFrom}; dateTo=${meta.dateTo}; serviceId=${meta.serviceId}; channel=${meta.channel}; status=${meta.status}; seriesBy=${meta.seriesBy}`
    );
    rows.push('');

    // Time series section
    rows.push('Time Series');
    rows.push('period,count,totalAmountMinor,successCount,successRate');
    (report.timeSeries || []).forEach((r) => {
      rows.push(
        `${r.periodValue},${r.count},${r.totalAmountMinor},${
          r.successCount
        },${r.successRate.toFixed(2)}`
      );
    });

    // Optional: Series-by section
    if (
      Array.isArray(
        (
          report as unknown as {
            timeSeriesByDimension?: Array<{
              label: string;
              key: string;
              points: Array<{ periodValue: string; totalAmountMinor: number }>;
            }>;
          }
        ).timeSeriesByDimension
      ) &&
      (
        (report as unknown as { timeSeriesByDimension?: Array<unknown> })
          .timeSeriesByDimension || []
      ).length > 0
    ) {
      rows.push('');
      rows.push(`Trend By ${seriesBy?.toUpperCase()}`);
      const categories = Array.from(
        new Set<string>(
          (
            report as unknown as {
              timeSeriesByDimension: Array<{
                points: Array<{ periodValue: string }>;
              }>;
            }
          ).timeSeriesByDimension.flatMap((s) =>
            s.points.map((p) => p.periodValue)
          )
        )
      );
      rows.push(['series', ...categories].join(','));
      (
        report as unknown as {
          timeSeriesByDimension: Array<{
            label: string;
            key: string;
            points: Array<{ periodValue: string; totalAmountMinor: number }>;
          }>;
        }
      ).timeSeriesByDimension.forEach((s) => {
        const rowValues = categories.map((cat: string) => {
          const found = s.points.find((p) => p.periodValue === cat);
          return found ? String(found.totalAmountMinor) : '0';
        });
        rows.push([`"${s.label || s.key}"`, ...rowValues].join(','));
      });
    }

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions_${period}_${df}_${dt}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        title="Reports"
        backHref={ROUTES.ADMIN.DASHBOARD}
        icon={LineChart}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-600">Period</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as AggregatePeriod)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {['day', 'week', 'month', 'year'].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">From</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">To</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Service</label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {serviceOptions.map((o) => (
                    <option key={o.value || 'all'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Payment Channel</label>
                <select
                  value={channel}
                  onChange={(e) =>
                    setChannel(e.target.value as PaymentChannel | '')
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">All</option>
                  {[
                    'online_wallet',
                    'online_banking',
                    'qrph',
                    'card',
                    'other',
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Status</label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as TransactionStatus | '')
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">All</option>
                  {[
                    'pending',
                    'awaiting_payment',
                    'paid',
                    'failed',
                    'completed',
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Trend Series By</label>
                <select
                  value={seriesBy}
                  onChange={(e) =>
                    setSeriesBy(
                      e.target.value as 'service' | 'channel' | 'status' | ''
                    )
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">None</option>
                  <option value="service">Service</option>
                  <option value="channel">Payment Channel</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex flex-col md:flex-row gap-3">
              <Button
                onClick={() => {
                  loadReport();
                }}
              >
                Apply
              </Button>
              <Button variant="outline" onClick={exportCsv}>
                <Download className="h-4 w-4 mr-2" /> Export Summary CSV
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const res = await (
                      await import('@/lib/api/admin')
                    ).exportTransactionsCsv({
                      status: (status as TransactionStatus) || undefined,
                      serviceId: serviceId || undefined,
                      channel: (channel as PaymentChannel) || undefined,
                      dateFrom: dateFrom || undefined,
                      dateTo: dateTo || undefined,
                    });
                    const blob = new Blob([res.csv], {
                      type: 'text/csv;charset=utf-8;',
                    });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = res.filename;
                    link.click();
                    URL.revokeObjectURL(url);
                  } catch (e) {
                    console.error(e);
                    toast.error('Failed to export transactions');
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" /> Export Transactions CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold text-slate-900">
                {formatCurrency(report?.totals.totalAmountMinor || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold text-slate-900">
                {report?.totals.count || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold text-slate-900">
                {(report?.totals.successRate || 0).toFixed(2)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <FileText className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              {isLoadingAppStats ? (
                <div className="text-xl font-semibold animate-pulse">Loading...</div>
              ) : (
                <div className="text-xl font-semibold text-slate-900">
                  {applicationStats?.total?.toLocaleString() || '0'}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {applicationStats?.submittedTotal || 0} submitted, {applicationStats?.draftTotal || 0} drafts
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New This Month</CardTitle>
              <FileText className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              {isLoadingAppStats ? (
                <div className="text-xl font-semibold animate-pulse">Loading...</div>
              ) : (
                <div className="text-xl font-semibold text-slate-900">
                  {applicationStats?.newThisMonth?.toLocaleString() || '0'}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {applicationStats?.growthPercentage !== undefined && applicationStats.growthPercentage !== null
                  ? `${applicationStats.growthPercentage >= 0 ? '+' : ''}${applicationStats.growthPercentage.toFixed(1)}%`
                  : '0%'} from last month
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Trend</CardTitle>
            <LineChart className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              'Loading...'
            ) : report &&
              seriesBy &&
              Array.isArray(
                (
                  report as unknown as {
                    timeSeriesByDimension?: Array<{
                      key: string;
                      label: string;
                      points: Array<{ periodValue: string }>;
                    }>;
                  }
                ).timeSeriesByDimension
              ) &&
              (
                (
                  report as unknown as {
                    timeSeriesByDimension?: Array<unknown>;
                  }
                ).timeSeriesByDimension || []
              ).length > 0 ? (
              <ApexChart
                options={{
                  chart: { id: 'trend-by', toolbar: { show: false } },
                  xaxis: {
                    categories: Array.from(
                      new Set<string>(
                        (
                          report as unknown as {
                            timeSeriesByDimension: Array<{
                              points: Array<{ periodValue: string }>;
                            }>;
                          }
                        ).timeSeriesByDimension.flatMap((s) =>
                          s.points.map((p) => p.periodValue)
                        )
                      )
                    ),
                  },
                  legend: { position: 'bottom' },
                  tooltip: { shared: true, intersect: false },
                }}
                series={(
                  report as unknown as {
                    timeSeriesByDimension: Array<{
                      key: string;
                      label: string;
                      points: Array<{
                        periodValue: string;
                        count: number;
                        totalAmountMinor: number;
                      }>;
                    }>;
                  }
                ).timeSeriesByDimension.map((s) => ({
                  name: s.label || s.key,
                  type: 'line',
                  data: Array.from(
                    new Set<string>(
                      (
                        report as unknown as {
                          timeSeriesByDimension: Array<{
                            points: Array<{ periodValue: string }>;
                          }>;
                        }
                      ).timeSeriesByDimension.flatMap((x) =>
                        x.points.map((p) => p.periodValue)
                      )
                    )
                  ).map((cat: string) => {
                    const found = s.points.find((p) => p.periodValue === cat);
                    return found ? found.totalAmountMinor : 0;
                  }),
                }))}
                type="line"
                height={340}
                key={`ts-by-${seriesBy}-${period}-${dateFrom}-${dateTo}-${serviceId}-${channel}-${status}`}
              />
            ) : report && timeSeriesChart ? (
              <ApexChart
                options={timeSeriesChart.options}
                series={timeSeriesChart.series}
                type="line"
                height={320}
                key={`ts-${period}-${dateFrom}-${dateTo}-${serviceId}-${channel}-${status}`}
              />
            ) : (
              <div className="text-gray-500">No data</div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>By Payment Channel</CardTitle>
              <PieChart className="h-5 w-5 text-gray-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                'Loading...'
              ) : report && channelChart ? (
                <ApexChart
                  options={channelChart.options}
                  series={channelChart.series}
                  type="donut"
                  height={320}
                  key={`ch-${period}-${dateFrom}-${dateTo}-${serviceId}-${channel}-${status}`}
                />
              ) : (
                <div className="text-gray-500">No data</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topServiceRows.length ? (
                      topServiceRows.map((s, index) => (
                        <TableRow key={`${s.key}-${index}`}>
                          <TableCell>
                            <span>{s.label}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            {s.count}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(s.totalAmountMinor)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-gray-500"
                        >
                          No data
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
