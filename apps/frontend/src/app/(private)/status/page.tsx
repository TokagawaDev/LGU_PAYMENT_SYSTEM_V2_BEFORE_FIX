'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CitizenPageLayout } from '@/components/molecules/citizen-page-layout';
import { useAddOnSubmissions } from '@/hooks/use-add-on-submissions';
import { useAddOnServices } from '@/hooks/use-add-on-services';
import { ROUTES } from '@/constants/routes';
import type { AddOnSubmissionItem } from '@/hooks/use-add-on-submissions';
import { SubmissionViewDialog } from '@/components/organism/submission-view-dialog';
import { ClipboardCheck, FileText, ArrowRight, Search, Filter } from 'lucide-react';

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const STATUS_ALL = 'all';
const FORM_ALL = '';

/**
 * Status page for the Citizen Portal. View and track the status of application submissions.
 * Search and filters are client-side for instant feedback; filter options are built from submissions + add-on services (no duplication).
 */
export default function StatusPage(): React.JSX.Element {
  const { list, isLoading, error } = useAddOnSubmissions();
  const { addOnServices } = useAddOnServices();
  const [submissions, setSubmissions] = useState<AddOnSubmissionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_ALL);
  const [formFilter, setFormFilter] = useState<string>(FORM_ALL);
  const [viewSubmission, setViewSubmission] = useState<AddOnSubmissionItem | null>(null);

  const getAddOnTitle = useCallback(
    (addOnId: string): string => {
      const addOn = addOnServices.find((a) => a.id === addOnId);
      return addOn?.title ?? addOnId;
    },
    [addOnServices]
  );

  /** Unique form options: addOnIds from submissions + all addOnServices, deduped and sorted by title */
  const formFilterOptions = useMemo(() => {
    const idSet = new Set<string>();
    submissions.forEach((s) => idSet.add(s.addOnId));
    addOnServices.forEach((a) => a.id && idSet.add(a.id));
    const list = Array.from(idSet)
      .map((id) => ({ id, title: getAddOnTitle(id) }))
      .filter((x) => x.title)
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    return list;
  }, [submissions, addOnServices, getAddOnTitle]);

  const fetchSubmissions = useCallback(async (): Promise<void> => {
    const result = await list({ page: 1, limit: 500 });
    setSubmissions(result.items ?? []);
    setTotal(result.total ?? 0);
  }, [list]);

  useEffect(() => {
    void fetchSubmissions();
  }, [fetchSubmissions]);

  /** Filter and sort: status, form, search (by title); then sort by date desc */
  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = submissions;
    if (statusFilter !== STATUS_ALL) {
      list = list.filter((s) => s.status === statusFilter);
    }
    if (formFilter !== FORM_ALL) {
      list = list.filter((s) => s.addOnId === formFilter);
    }
    if (q) {
      list = list.filter((s) => {
        const title = getAddOnTitle(s.addOnId).toLowerCase();
        return title.includes(q) || s.addOnId.toLowerCase().includes(q);
      });
    }
    return [...list].sort((a, b) => {
      const aDate = a.updatedAt ?? a.createdAt ?? '';
      const bDate = b.updatedAt ?? b.createdAt ?? '';
      return bDate.localeCompare(aDate);
    });
  }, [submissions, statusFilter, formFilter, searchQuery, getAddOnTitle]);

  return (
    <CitizenPageLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Status</h1>
          <p className="mt-1 text-gray-600">
            View updates and track the status of your applications.
          </p>
        </div>

        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-gray-600" />
                Application status
              </CardTitle>
              <CardDescription>
                Your submitted and draft applications
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={ROUTES.APPLICATION}>
                New application
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {!isLoading && submissions.length > 0 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search by application name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    aria-label="Search applications"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Filter className="h-4 w-4" />
                    Filters:
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    aria-label="Filter by status"
                  >
                    <option value={STATUS_ALL}>All statuses</option>
                    <option value="submitted">Submitted</option>
                    <option value="draft">Draft</option>
                  </select>
                  <select
                    value={formFilter}
                    onChange={(e) => setFormFilter(e.target.value)}
                    className="h-10 min-w-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    aria-label="Filter by form"
                  >
                    <option value={FORM_ALL}>All forms</option>
                    {formFilterOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.title}
                      </option>
                    ))}
                  </select>
                  {(searchQuery.trim() || statusFilter !== STATUS_ALL || formFilter !== FORM_ALL) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter(STATUS_ALL);
                        setFormFilter(FORM_ALL);
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-3 py-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-lg bg-gray-100"
                  />
                ))}
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-3 text-sm font-medium text-gray-600">
                  {submissions.length === 0
                    ? 'No applications yet'
                    : 'No applications match your search or filters'}
                </p>
                <p className="text-xs text-gray-500">
                  {submissions.length === 0
                    ? 'Submit an application from the Applications page to see status here.'
                    : 'Try changing your search or filter options.'}
                </p>
                {submissions.length === 0 ? (
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link href={ROUTES.APPLICATION}>Go to Applications</Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter(STATUS_ALL);
                      setFormFilter(FORM_ALL);
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <ul className="space-y-3">
                {filteredSubmissions.map((sub) => (
                  <li
                    key={sub.id}
                    className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">
                        {getAddOnTitle(sub.addOnId)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Updated {formatDate(sub.updatedAt ?? sub.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge
                        variant={
                          sub.status === 'submitted' ? 'default' : 'secondary'
                        }
                      >
                        {sub.status === 'submitted'
                          ? 'Submitted'
                          : 'Draft'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewSubmission(sub)}
                        aria-label={`View ${getAddOnTitle(sub.addOnId)} application`}
                      >
                        View
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {filteredSubmissions.length > 0 && (
          <p className="text-center text-sm text-gray-500">
            Showing {filteredSubmissions.length} of {total} application
            {total !== 1 ? 's' : ''}
            {(searchQuery.trim() || statusFilter !== STATUS_ALL || formFilter !== FORM_ALL) && ' (filtered)'}.
          </p>
        )}

        <SubmissionViewDialog
          open={viewSubmission !== null}
          onOpenChange={(open) => !open && setViewSubmission(null)}
          submission={viewSubmission}
          addOn={viewSubmission ? addOnServices.find((a) => a.id === viewSubmission.addOnId) : undefined}
        />
      </div>
    </CitizenPageLayout>
  );
}
