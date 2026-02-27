'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building,
  Building2,
  Receipt,
  ShoppingCart,
  FileText,
  Store,
  LandPlot,
  Truck,
  HandCoins,
  ClipboardList,
  CreditCard,
  History,
  Settings,
  ArrowRight,
  Bell,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/use-auth';
import { useEnabledServices } from '@/hooks/use-enabled-services';
import { useRouteLoading } from '@/components/molecules/route-loading-context';
import { CitizenPageLayout } from '@/components/molecules/citizen-page-layout';
import {
  getUserTransactions,
  type UserTransactionData,
  type UserTransactionsListResponse,
} from '@/lib/api';

const PAYMENT_ICON_MAP = {
  Building,
  Building2,
  Receipt,
  ShoppingCart,
  FileText,
  Store,
  LandPlot,
  Truck,
  HandCoins,
};

function formatAmount(minor: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (isToday) {
      return d.toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return d.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return iso;
  }
}

function statusVariant(
  status: UserTransactionData['status']
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
    case 'completed':
      return 'default';
    case 'pending':
    case 'awaiting_payment':
      return 'secondary';
    case 'failed':
    case 'refunded':
      return 'destructive';
    default:
      return 'outline';
  }
}

const QUICK_ACTIONS = [
  {
    label: 'Applications',
    description: 'Submit and track forms',
    href: ROUTES.APPLICATION,
    icon: ClipboardList,
    color: 'bg-indigo-500',
  },
  {
    label: 'Payments',
    description: 'Pay fees and bills',
    href: ROUTES.SERVICES,
    icon: CreditCard,
    color: 'bg-emerald-500',
  },
  {
    label: 'Transactions',
    description: 'Payment history',
    href: ROUTES.TRANSACTION_HISTORY,
    icon: History,
    color: 'bg-amber-500',
  },
  {
    label: 'Settings',
    description: 'Account & preferences',
    href: ROUTES.SETTINGS,
    icon: Settings,
    color: 'bg-slate-600',
  },
] as const;

/**
 * Citizen Portal Dashboard — clean overview with metrics, quick actions, recent activity, and payment services.
 */
export default function DashboardPage(): React.JSX.Element {
  const router = useRouter();
  const { user } = useAuth();
  const { enabledPaymentServices, isLoading: servicesLoading } =
    useEnabledServices();
  const { startRouteTransition, stopRouteTransition } = useRouteLoading();
  const userName = user?.firstName || 'User';

  const [txData, setTxData] = useState<{
    recent: UserTransactionData[];
    totalCount: number;
    loading: boolean;
  }>({ recent: [], totalCount: 0, loading: true });

  const fetchTransactions = useCallback(async (): Promise<void> => {
    try {
      setTxData((_prev) => ({ recent: [], totalCount: 0, loading: true }));
      const res: UserTransactionsListResponse = await getUserTransactions({
        page: 1,
        limit: 5,
      });
      setTxData({
        recent: res.data,
        totalCount: res.pagination?.totalCount ?? 0,
        loading: false,
      });
    } catch {
      setTxData({ recent: [], totalCount: 0, loading: false });
    }
  }, []);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (servicesLoading) {
      startRouteTransition();
    } else {
      stopRouteTransition();
    }
  }, [servicesLoading, startRouteTransition, stopRouteTransition]);

  const paymentServices = enabledPaymentServices.map((service) => {
    const IconComponent = PAYMENT_ICON_MAP[service.icon as keyof typeof PAYMENT_ICON_MAP] || FileText;
    return {
      ...service,
      icon: IconComponent,
    };
  });

  const handlePaymentServiceClick = (serviceId: string): void => {
    startRouteTransition();
    router.push(`${ROUTES.SERVICES}/${serviceId}`);
  };

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <CitizenPageLayout>
      <div className="mx-auto max-w-4xl space-y-8 pb-8">
        {/* Welcome — single hero */}
        <header className="rounded-2xl border border-gray-200/80 bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-500 sm:text-base">
                Citizen Portal
              </h1>
              <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Welcome back, {userName}
              </p>
              <p className="mt-2 max-w-md text-sm text-gray-600">
                Manage applications, payments, and view your activity in one place.
              </p>
            </div>
            <div className="shrink-0 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-right">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Today
              </p>
              <p className="mt-0.5 text-sm font-semibold text-gray-800">
                {todayLabel}
              </p>
            </div>
          </div>
        </header>

        {/* Key metrics — two clear stats */}
        <section className="grid gap-4 sm:grid-cols-2">
          <Card className="overflow-hidden border-gray-200/80 bg-white shadow-sm">
            <CardContent className="flex flex-row items-center justify-between p-5 sm:p-6">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Payment services
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 sm:text-3xl">
                  {paymentServices.length}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">Available to pay</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <CreditCard className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-gray-200/80 bg-white shadow-sm">
            <CardContent className="flex flex-row items-center justify-between p-5 sm:p-6">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total transactions
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 sm:text-3xl">
                  {txData.loading ? '—' : txData.totalCount}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">All time</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <History className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Quick actions — single streamlined section (no duplicate overview) */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Quick actions
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {QUICK_ACTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-4 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md sm:p-5"
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition-transform duration-200 group-hover:scale-105 ${item.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500" />
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent activity + Payment services — clear two-column on large, stack on small */}
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Recent activity */}
          <section className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Recent activity
              </h2>
              <Button variant="ghost" size="sm" className="-mr-2 text-xs" asChild>
                <Link href={ROUTES.TRANSACTION_HISTORY}>
                  View all
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <Card className="border-gray-200/80 bg-white shadow-sm">
              <CardContent className="p-0">
                {txData.loading ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-sm text-gray-500">Loading…</p>
                  </div>
                ) : txData.recent.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <Bell className="h-9 w-9 text-gray-300" />
                    <p className="mt-2 text-sm font-medium text-gray-600">
                      No recent transactions
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href={ROUTES.SERVICES}>Make a payment</Link>
                    </Button>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {txData.recent.map((tx) => (
                      <li key={tx._id}>
                        <Link
                          href={ROUTES.TRANSACTION_HISTORY}
                          className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-gray-50/80 sm:px-5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {tx.service?.name ?? 'Payment'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(tx.date)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-sm font-semibold text-gray-800 tabular-nums">
                              {formatAmount(tx.totalAmountMinor)}
                            </span>
                            <Badge
                              variant={statusVariant(tx.status)}
                              className="text-[10px] font-medium"
                            >
                              {tx.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Payment services */}
          <section className="lg:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Pay now
              </h2>
              <Button variant="ghost" size="sm" className="-mr-2 text-xs" asChild>
                <Link href={ROUTES.SERVICES}>View all</Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {paymentServices.map((service) => {
                const IconComponent = service.icon;
                return (
                  <Card
                    key={service.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer border-gray-200/80 bg-white shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    onClick={() => handlePaymentServiceClick(service.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handlePaymentServiceClick(service.id);
                      }
                    }}
                  >
                    <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white ${service.color}`}
                      >
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-base font-semibold text-gray-900">
                          {service.title}
                        </CardTitle>
                        <CardDescription className="mt-0.5 line-clamp-2 text-sm text-gray-500">
                          {service.description}
                        </CardDescription>
                      </div>
                      <ArrowRight className="h-5 w-5 shrink-0 text-gray-300" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </CitizenPageLayout>
  );
}
