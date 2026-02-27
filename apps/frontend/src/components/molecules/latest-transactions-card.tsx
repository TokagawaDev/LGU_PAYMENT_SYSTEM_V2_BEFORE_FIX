'use client';

import Link from 'next/link';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ROUTES } from '@/constants/routes';
import { getTransactions, type TransactionData } from '@/lib/api/admin';

type LatestTransactionsCardProps = {
  className?: string;
};

// statusToVariant was removed because status badge is not displayed in this compact list.

function formatCurrency(amountMinor: number): string {
  const amount = (amountMinor || 0) / 100;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function LatestTransactionsCard({
  className,
}: LatestTransactionsCardProps): React.JSX.Element {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        const res = await getTransactions({ page: 1, limit: 5 });
        if (isMounted) setTransactions(res.data || []);
      } catch {
        if (isMounted) setHasError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={className || 'w-full lg:w-1/2'}>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Latest Transactions
          </CardTitle>
          <Link
            href={ROUTES.ADMIN.TRANSACTIONS}
            className="text-xs text-blue-600 hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent className="flex-1">
          {isLoading ? (
            <div className="py-6 text-sm text-muted-foreground">Loading...</div>
          ) : hasError ? (
            <div className="py-6 text-sm text-red-600">
              Failed to load transactions.
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">
              No recent transactions.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => {
                  const dateIso = (t.date || t.createdAt) as string;
                  return (
                    <TableRow key={t._id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(dateIso)}
                      </TableCell>
                      <TableCell
                        className="truncate max-w-[12rem]"
                        title={t.service?.name || ''}
                      >
                        {t.service?.name || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(t.totalAmountMinor)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
