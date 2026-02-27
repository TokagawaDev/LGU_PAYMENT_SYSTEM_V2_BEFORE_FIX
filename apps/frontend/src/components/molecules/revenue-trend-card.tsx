'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getTransactionsAggregate,
  type AggregatedReportResult,
  type AggregatePeriod,
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

type RevenueTrendCardProps = { className?: string };

function formatCurrencyMinor(minor: number): string {
  const amount = (minor || 0) / 100;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

export default function RevenueTrendCard({
  className,
}: RevenueTrendCardProps): React.JSX.Element {
  const [period, setPeriod] = useState<AggregatePeriod>('day');
  const [report, setReport] = useState<AggregatedReportResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        // Only count transactions with completed or paid status
        const res = await getTransactionsAggregate({
          period,
          status: ['completed', 'paid'],
        });
        if (isMounted) setReport(res);
      } catch {
        if (isMounted) setHasError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [period]);

  const chartData = useMemo(() => {
    if (!report || !Array.isArray(report.timeSeries)) return null;
    const categories = report.timeSeries.map((r) => r.periodValue);
    const amounts = report.timeSeries.map((r) => r.totalAmountMinor);
    return {
      options: {
        chart: { id: 'revenue-trend', toolbar: { show: false } },
        xaxis: { categories },
        yaxis: {
          labels: { formatter: (v: number) => `₱${(v / 100).toFixed(0)}` },
        },
        tooltip: {
          y: { formatter: (v: number) => formatCurrencyMinor(v) },
        },
        stroke: { curve: 'smooth' },
      },
      series: [
        {
          name: 'Successful Revenue',
          type: 'line',
          data: amounts,
        },
      ],
    };
  }, [report]);

  const periods: Array<{ key: AggregatePeriod; label: string }> = [
    { key: 'day', label: 'Daily' },
    { key: 'week', label: 'Weekly' },
    { key: 'month', label: 'Monthly' },
    { key: 'year', label: 'Yearly' },
  ];

  return (
    <div className={className || 'w-full lg:w-1/2'}>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-col items-start gap-4 pb-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-sm font-medium">
            Successful Revenue Trend
          </CardTitle>
          <div className="flex gap-2">
            {periods.map((p) => (
              <Button
                key={p.key}
                size="sm"
                variant={period === p.key ? 'default' : 'outline'}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          {isLoading ? (
            <div className="py-6 text-sm text-muted-foreground">Loading...</div>
          ) : hasError ? (
            <div className="py-6 text-sm text-red-600">
              Failed to load revenue trend.
            </div>
          ) : chartData && report?.timeSeries?.length ? (
            <ApexChart
              options={chartData.options}
              series={chartData.series}
              type="line"
              height={280}
              key={`rev-${period}`}
            />
          ) : (
            <div className="py-6 text-sm text-muted-foreground">No data</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
