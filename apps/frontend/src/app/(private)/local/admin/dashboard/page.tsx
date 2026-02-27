'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdminHeader from '@/components/molecules/admin-header';
import { Users, CreditCard, CheckCircle2, Wallet, FileText, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  getUserStats,
  UserStats,
  getTransactionStats,
  TransactionsStats,
  getApplicationStats,
  ApplicationStats,
} from '@/lib/api/admin';
import LatestTransactionsCard from '@/components/molecules/latest-transactions-card';
import RevenueTrendCard from '@/components/molecules/revenue-trend-card';

export default function AdminDashboardPage() {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [transactionStats, setTransactionStats] =
    useState<TransactionsStats | null>(null);
  const [applicationStats, setApplicationStats] =
    useState<ApplicationStats | null>(null);

  // Header handles logout; keep no local logout handler

  const fetchUserStats = async () => {
    try {
      setIsLoadingStats(true);
      const [stats, tStats, appStats] = await Promise.all([
        getUserStats(),
        getTransactionStats(),
        getApplicationStats(),
      ]);
      setUserStats(stats);
      setTransactionStats(tStats);
      setApplicationStats(appStats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

  const formatCurrency = (amountMinor: number | undefined | null): string => {
    const amount = (amountMinor ?? 0) / 100;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatGrowthNumber = (growth?: number): string => {
    if (growth === undefined || growth === null || Number.isNaN(growth))
      return '0%';
    const sign = growth >= 0 ? '+' : '-';
    const abs = Math.abs(growth).toFixed(1);
    return `${sign}${abs}%`;
  };

  const getGrowthClassName = (growth?: number): string => {
    if (growth === undefined || growth === null || Number.isNaN(growth))
      return 'text-muted-foreground';
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="Admin Dashboard" icon={UserCog} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Stats Cards */}
          <Card className="transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="text-2xl font-bold animate-pulse">
                  Loading...
                </div>
              ) : (
                <div className="text-2xl font-bold">
                  {userStats?.totalUsers?.toLocaleString() || '0'}
                </div>
              )}
              <p className="text-xs">
                <span
                  className={`${getGrowthClassName(
                    userStats?.growthPercentage
                  )}`}
                >
                  {formatGrowthNumber(userStats?.growthPercentage)}
                </span>
                <span className="text-muted-foreground"> from last month</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Transactions
              </CardTitle>
              <CreditCard className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="text-2xl font-bold animate-pulse">
                  Loading...
                </div>
              ) : (
                <div className="text-2xl font-bold">
                  {transactionStats?.total?.toLocaleString() ?? '0'}
                </div>
              )}
              <p className="text-xs">
                <span
                  className={`${getGrowthClassName(
                    transactionStats?.growthPercentage
                  )}`}
                >
                  {formatGrowthNumber(transactionStats?.growthPercentage)}
                </span>
                <span className="text-muted-foreground"> from last month</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <Wallet className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="text-2xl font-bold animate-pulse">
                  Loading...
                </div>
              ) : (
                <div className="text-2xl font-bold">
                  {formatCurrency(transactionStats?.revenueTotalMinor)}
                </div>
              )}
              <p className="text-xs">
                <span
                  className={`${getGrowthClassName(
                    transactionStats?.revenueGrowthPercentage
                  )}`}
                >
                  {formatGrowthNumber(
                    transactionStats?.revenueGrowthPercentage
                  )}
                </span>
                <span className="text-muted-foreground"> from last month</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Successful Transactions
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="text-2xl font-bold animate-pulse">
                  Loading...
                </div>
              ) : (
                <div className="text-2xl font-bold">
                  {transactionStats?.successfulTotal?.toLocaleString() ?? '0'}
                </div>
              )}
              <p className="text-xs">
                <span
                  className={`${getGrowthClassName(
                    transactionStats?.successfulGrowthPercentage
                  )}`}
                >
                  {formatGrowthNumber(
                    transactionStats?.successfulGrowthPercentage
                  )}
                </span>
                <span className="text-muted-foreground"> from last month</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Applications
              </CardTitle>
              <FileText className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="text-2xl font-bold animate-pulse">
                  Loading...
                </div>
              ) : (
                <div className="text-2xl font-bold">
                  {applicationStats?.total?.toLocaleString() ?? '0'}
                </div>
              )}
              <p className="text-xs">
                <span
                  className={`${getGrowthClassName(
                    applicationStats?.growthPercentage
                  )}`}
                >
                  {formatGrowthNumber(applicationStats?.growthPercentage)}
                </span>
                <span className="text-muted-foreground"> from last month</span>
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col lg:flex-row gap-6">
          <LatestTransactionsCard className="w-full lg:w-1/2" />
          <RevenueTrendCard className="w-full lg:w-1/2" />
        </div>
      </main>
    </div>
  );
}
