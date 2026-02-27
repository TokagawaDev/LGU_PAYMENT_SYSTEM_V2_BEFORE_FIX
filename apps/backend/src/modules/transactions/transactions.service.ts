import { normalizeToServiceId, ServiceId, SERVICE_NAME_BY_ID } from '@shared/constants/services';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { calculateGrowth } from '../utils/calculate-growth.util';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PipelineStage } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { CreateTransactionDto, TransactionStatusDtoEnum } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

export interface ListTransactionsParams {
  page: number;
  limit: number;
  status?: TransactionStatusDtoEnum | TransactionStatusDtoEnum[];
  serviceId?: string;
  reference?: string;
  q?: string;
  channel?: string;
  dateFrom?: string;
  dateTo?: string;
  allowedServiceIds?: string[];
  userId?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface TransactionsStatsDto {
  total: number;
  newThisMonth: number;
  growthPercentage: number;
  successfulTotal: number;
  successfulThisMonth: number;
  successfulGrowthPercentage: number;
  revenueTotalMinor: number;
  revenueThisMonthMinor: number;
  revenueGrowthPercentage: number;
}

export type AggregatePeriod = 'day' | 'week' | 'month' | 'year';

export interface AggregateTransactionsParams {
  period: AggregatePeriod;
  dateFrom?: string;
  dateTo?: string;
  serviceId?: string;
  channel?: string;
  status?: TransactionStatusDtoEnum | TransactionStatusDtoEnum[];
  seriesBy?: 'service' | 'channel' | 'status';
  allowedServiceIds?: string[];
}

export interface AggregatedTimeSeriesRow {
  periodValue: string; // formatted label (UTC)
  count: number;
  totalAmountMinor: number;
  successCount: number;
  successRate: number;
}

export interface AggregatedBreakdownRow {
  key: string;
  label: string;
  count: number;
  totalAmountMinor: number;
}

export interface AggregatedReportResult {
  period: AggregatePeriod;
  timeSeries: AggregatedTimeSeriesRow[];
  totals: {
    count: number;
    totalAmountMinor: number;
    successCount: number;
    successRate: number;
  };
  byService: AggregatedBreakdownRow[];
  byChannel: AggregatedBreakdownRow[];
  seriesBy?: 'service' | 'channel' | 'status';
  timeSeriesByDimension?: Array<{
    key: string;
    label: string;
    points: Array<{ periodValue: string; count: number; totalAmountMinor: number }>;
    totalAmountMinor: number;
    count: number;
  }>;
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  // Service id normalization is done inline via normalizeToServiceId from shared constants

  private buildAllowedServiceMatch(allowedServiceIds?: string[], specificServiceId?: string): FilterQuery<TransactionDocument> | null {
    const collectScopes = (keys: string[]): { ids: string[]; names: string[] } => {
      const idSet: Set<string> = new Set();
      const nameSet: Set<string> = new Set();
      keys.forEach((key) => {
        const normalized = normalizeToServiceId(key);
        if (normalized) {
          idSet.add(normalized);
          const canonicalName = SERVICE_NAME_BY_ID[normalized];
          if (canonicalName) nameSet.add(canonicalName);
        } else {
          const nameCandidate = String(key).trim();
          if (nameCandidate) nameSet.add(nameCandidate);
        }
      });
      return { ids: Array.from(idSet), names: Array.from(nameSet) };
    };

    const sourceKeys: string[] | undefined = specificServiceId
      ? [specificServiceId]
      : allowedServiceIds && allowedServiceIds.length > 0
      ? allowedServiceIds
      : undefined;

    if (!sourceKeys) return null;
    const scopes = collectScopes(sourceKeys);
    if (scopes.ids.length === 0 && scopes.names.length === 0) return null;
    return {
      $or: [
        { 'service.serviceId': { $in: scopes.ids } as unknown as never },
        { 'service.name': { $in: scopes.names } as unknown as never },
      ],
    } as unknown as FilterQuery<TransactionDocument>;
  }

  async createTransaction(dto: CreateTransactionDto, createdByAdminId: string): Promise<Transaction> {
    const breakdownSum = dto.details.breakdown.reduce((sum, item) => sum + item.amountMinor, 0);
    if (breakdownSum !== dto.totalAmountMinor) {
      throw new BadRequestException('Total amount must equal the sum of breakdown items');
    }

    const requiresApproval = Boolean(dto.service.approvalRequired);
    if (requiresApproval) {
      const allowed: TransactionStatusDtoEnum[] = [
        TransactionStatusDtoEnum.PENDING,
      ];
      if (dto.status && !allowed.includes(dto.status)) {
        throw new BadRequestException('Invalid initial status for approval-required service');
      }
    } else {
      const allowed: TransactionStatusDtoEnum[] = [
        TransactionStatusDtoEnum.PENDING,
        TransactionStatusDtoEnum.AWAITING_PAYMENT,
      ];
      if (dto.status && !allowed.includes(dto.status)) {
        throw new BadRequestException('Invalid initial status for payment-only service');
      }
    }

    const created = new this.transactionModel({
      ...dto,
      date: new Date(dto.date),
      payment: dto.payment ? { provider: 'paymongo', ...dto.payment } : undefined,
      createdByAdminId,
    });
    return created.save();
  }

  async listTransactions(params: ListTransactionsParams): Promise<PaginatedResult<Transaction>> {
    const { page, limit, status, serviceId, reference, q, channel, dateFrom, dateTo, allowedServiceIds, userId } = params;
    const filter: FilterQuery<TransactionDocument> = {};

    if (status) {
      if (Array.isArray(status)) {
        filter.status = { $in: status };
      } else {
        filter.status = status;
      }
    }
    
    // Filter by user ID if provided
    if (userId) {
      filter.userId = userId;
    }
    
    // Service scope handling (allowedServiceIds + optional specific serviceId)
    // Enforce allowed services against specific service filter (support legacy name-based scopes)
    if (serviceId && Array.isArray(allowedServiceIds) && allowedServiceIds.length > 0) {
      const allowedNormalizedIds = new Set<ServiceId>(
        allowedServiceIds
          .map((s) => normalizeToServiceId(s))
          .filter((v): v is ServiceId => Boolean(v))
      );
      const allowedNames = new Set<string>(
        allowedServiceIds
          .map((s) => {
            const id = normalizeToServiceId(s);
            if (id) return SERVICE_NAME_BY_ID[id] ?? '';
            return String(s).trim();
          })
          .filter((v) => Boolean(v))
      );

      const requestedId = normalizeToServiceId(serviceId);
      const requestedName = requestedId ? SERVICE_NAME_BY_ID[requestedId] : String(serviceId).trim();

      const isAllowedById = requestedId ? allowedNormalizedIds.has(requestedId) : false;
      const isAllowedByName = requestedName ? allowedNames.has(requestedName) : false;

      if (!isAllowedById && !isAllowedByName) {
        return {
          data: [],
          pagination: {
            currentPage: page,
            totalPages: 1,
            totalCount: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };
      }
    }

    const scopeMatch = this.buildAllowedServiceMatch(allowedServiceIds, serviceId);
    if (scopeMatch) {
      (filter as FilterQuery<TransactionDocument> & { $and?: FilterQuery<TransactionDocument>[] }).$and = [
        ...(filter as FilterQuery<TransactionDocument> & { $and?: FilterQuery<TransactionDocument>[] }).$and || [],
        scopeMatch,
      ];
    }
    if (reference) filter['details.reference'] = reference;
    if (channel) filter['payment.channel'] = channel;
    if (q) {
      const regex = new RegExp(q, 'i');
      const orFilters: FilterQuery<TransactionDocument>[] = [
        { 'details.reference': { $regex: regex } as unknown as never },
        { 'service.name': { $regex: regex } as unknown as never },
        { userEmail: { $regex: regex } as unknown as never },
        { userFullName: { $regex: regex } as unknown as never },
      ];
      (filter as FilterQuery<TransactionDocument>).$or = orFilters;
    }
    if (dateFrom || dateTo) {
      const dateFilter: { $gte?: Date; $lte?: Date } = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.$lte = new Date(dateTo);
      filter.date = dateFilter as unknown as FilterQuery<TransactionDocument>['date'];
    }

    // Note: service scope already handled above

    const skip = (page - 1) * limit;
    const [data, totalCount] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.transactionModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;
    return {
      data: data as unknown as Transaction[],
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getTransactionById(id: string): Promise<Transaction> {
    const doc = await this.transactionModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Transaction not found');
    return doc;
  }

  async updateTransaction(id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    if (dto.details?.breakdown && typeof dto.totalAmountMinor === 'number') {
      const sum = dto.details.breakdown.reduce((acc, item) => acc + item.amountMinor, 0);
      if (sum !== dto.totalAmountMinor) {
        throw new BadRequestException('Total amount must equal the sum of breakdown items');
      }
    }

    // Guard against cs_* being saved into providerTransactionId via admin edits
    if (dto.payment && typeof (dto.payment as { providerTransactionId?: string }).providerTransactionId === 'string') {
      const val = (dto.payment as { providerTransactionId?: string }).providerTransactionId as string;
      if (val.startsWith('cs_')) {
        const current = dto.payment as unknown as Record<string, unknown>;
        current.providerSessionId = val;
        delete current.providerTransactionId;
        dto.payment = current as unknown as typeof dto.payment;
      }
    }

    const updated = await this.transactionModel
      .findByIdAndUpdate(
        id,
        { $set: { ...dto, ...(dto.date ? { date: new Date(dto.date) } : {}), payment: dto.payment ? { provider: 'paymongo', ...dto.payment } : undefined } },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException('Transaction not found');
    return updated;
  }

  async deleteTransaction(id: string): Promise<void> {
    const res = await this.transactionModel.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException('Transaction not found');
  }

  async countAll(): Promise<number> {
    return this.transactionModel.estimatedDocumentCount().exec();
  }

  async getStats(allowedServiceIds?: string[]): Promise<TransactionsStatsDto> {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
    const prevMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59));

    // Base counts (respect allowed service scopes, supporting IDs or names)
    const scopeMatch = this.buildAllowedServiceMatch(allowedServiceIds);
    const matchAllowed: FilterQuery<TransactionDocument> = scopeMatch
      ? ({ $and: [scopeMatch] } as unknown as FilterQuery<TransactionDocument>)
      : {};
    const [total, newThisMonth, prevMonthCount] = await Promise.all([
      this.transactionModel.countDocuments(matchAllowed).exec(),
      this.transactionModel.countDocuments({ ...matchAllowed, createdAt: { $gte: startOfMonth } }).exec(),
      this.transactionModel.countDocuments({ ...matchAllowed, createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd } }).exec(),
    ]);

    // Successful transaction counts (paid or completed)
    const successStatuses: TransactionStatusDtoEnum[] = [
      TransactionStatusDtoEnum.PAID,
      TransactionStatusDtoEnum.COMPLETED,
    ];

    const [
      successfulTotal,
      successfulThisMonth,
      successfulPrevMonth,
    ] = await Promise.all([
      this.transactionModel.countDocuments({ ...matchAllowed, status: { $in: successStatuses } }).exec(),
      this.transactionModel.countDocuments({ ...matchAllowed, status: { $in: successStatuses }, createdAt: { $gte: startOfMonth } }).exec(),
      this.transactionModel.countDocuments({ ...matchAllowed, status: { $in: successStatuses }, createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd } }).exec(),
    ]);

    // Revenue (minor units) for successful transactions only
    const [revenueTotalAgg, revenueThisMonthAgg, revenuePrevMonthAgg] = await Promise.all([
      this.transactionModel.aggregate([
        { $match: { ...matchAllowed, status: { $in: successStatuses } } },
        { $group: { _id: null, total: { $sum: '$totalAmountMinor' } } },
      ]).exec(),
      this.transactionModel.aggregate([
        { $match: { ...matchAllowed, status: { $in: successStatuses }, createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmountMinor' } } },
      ]).exec(),
      this.transactionModel.aggregate([
        { $match: { ...matchAllowed, status: { $in: successStatuses }, createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$totalAmountMinor' } } },
      ]).exec(),
    ]);

    const revenueTotalMinor = (revenueTotalAgg?.[0]?.total as number) || 0;
    const revenueThisMonthMinor = (revenueThisMonthAgg?.[0]?.total as number) || 0;
    const revenuePrevMonthMinor = (revenuePrevMonthAgg?.[0]?.total as number) || 0;

    const growthPercentage = calculateGrowth(newThisMonth, prevMonthCount);
    const successfulGrowthPercentage = calculateGrowth(successfulThisMonth, successfulPrevMonth);
    const revenueGrowthPercentage = calculateGrowth(revenueThisMonthMinor, revenuePrevMonthMinor);

    return {
      total,
      newThisMonth,
      growthPercentage,
      successfulTotal,
      successfulThisMonth,
      successfulGrowthPercentage,
      revenueTotalMinor,
      revenueThisMonthMinor,
      revenueGrowthPercentage,
    };
  }

  // growth calc moved to shared util

  async exportTransactionsCsv(params: ListTransactionsParams & { dateFrom?: string; dateTo?: string }): Promise<{ filename: string; csv: string }> {
    const { status, serviceId, reference, q, channel, dateFrom, dateTo, allowedServiceIds } = params;
    const filter: FilterQuery<TransactionDocument> = {};
    if (status) filter.status = status;
    const scopeMatch = this.buildAllowedServiceMatch(allowedServiceIds, serviceId);
    if (scopeMatch) {
      (filter as FilterQuery<TransactionDocument> & { $and?: FilterQuery<TransactionDocument>[] }).$and = [
        ...(filter as FilterQuery<TransactionDocument> & { $and?: FilterQuery<TransactionDocument>[] }).$and || [],
        scopeMatch,
      ];
    }
    if (reference) filter['details.reference'] = reference;
    if (channel) filter['payment.channel'] = channel;
    if (q) {
      const regex = new RegExp(q, 'i');
      const orFilters: FilterQuery<TransactionDocument>[] = [
        { 'details.reference': { $regex: regex } as unknown as never },
        { 'service.name': { $regex: regex } as unknown as never },
        { userEmail: { $regex: regex } as unknown as never },
        { userFullName: { $regex: regex } as unknown as never },
      ];
      (filter as FilterQuery<TransactionDocument>).$or = orFilters;
    }
    if (dateFrom || dateTo) {
      const dateFilter: { $gte?: Date; $lte?: Date } = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.$lte = new Date(dateTo);
      // Use business date with fallback to createdAt
      (filter as FilterQuery<TransactionDocument>).$or = [
        { date: dateFilter },
        { date: { $exists: false }, createdAt: dateFilter },
      ];
    }

    const docs = await this.transactionModel
      .find(filter)
      .sort({ date: 1, createdAt: 1 })
      .limit(10000)
      .lean()
      .exec();

    const iso = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `transactions_${iso}.csv`;

    const header = [
      'date',
      'serviceName',
      'reference',
      'status',
      'channel',
      'totalAmountMinor',
      'userEmail',
      'userFullName',
    ].join(',');

    type ExportDoc = {
      date?: Date | string;
      createdAt?: Date | string;
      details?: { reference?: string };
      payment?: { channel?: string };
      service?: { name?: string };
      totalAmountMinor?: number;
      userEmail?: string;
      userFullName?: string;
      status?: string;
    };

    const lines = (docs as unknown as ExportDoc[]).map((d) => {
      const sourceDate: string | number | Date | undefined = (d.date ?? d.createdAt) as
        | string
        | number
        | Date
        | undefined;
      const date = sourceDate ? new Date(sourceDate).toISOString() : '';
      const ref = d?.details?.reference || '';
      const channel = d?.payment?.channel || '';
      const row = [
        date,
        (d?.service?.name || '').replaceAll(',', ' '),
        ref,
        d?.status || '',
        channel,
        String(d?.totalAmountMinor ?? ''),
        d?.userEmail || '',
        (d?.userFullName || '').replaceAll(',', ' '),
      ];
      return row.join(',');
    });

    const csv = [header, ...lines].join('\n');
    return { filename, csv };
  }

  /**
   * Aggregate transactions by a time period with optional filters.
   * Uses UTC for all date operations for accuracy and consistency.
   */
  async aggregateTransactions(params: AggregateTransactionsParams): Promise<AggregatedReportResult> {
    const { period, dateFrom, dateTo, serviceId, channel, status, seriesBy, allowedServiceIds } = params;

    const match: FilterQuery<TransactionDocument> = {};
    const scopeMatch = this.buildAllowedServiceMatch(allowedServiceIds, serviceId);
    if (scopeMatch) {
      (match as FilterQuery<TransactionDocument> & { $and?: FilterQuery<TransactionDocument>[] }).$and = [
        ...(match as FilterQuery<TransactionDocument> & { $and?: FilterQuery<TransactionDocument>[] }).$and || [],
        scopeMatch,
      ];
    }
    if (channel) match['payment.channel'] = channel;
    if (status) {
      if (Array.isArray(status)) {
        match.status = { $in: status };
      } else {
        match.status = status;
      }
    }
    if (dateFrom || dateTo) {
      const dateFilter: { $gte?: Date; $lte?: Date } = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.$lte = new Date(dateTo);
      match.date = dateFilter as unknown as FilterQuery<TransactionDocument>['date'];
    }
    // Note: service scope handled above

    // Build group key and label projector
    const timezone = 'UTC';
    // Use business date with fallback to createdAt to avoid null periods for legacy rows
    const dateField: Record<string, unknown> = { $ifNull: ['$date', '$createdAt'] } as const;

    const timeSeriesPipeline: PipelineStage[] = [];
    timeSeriesPipeline.push({ $match: match });

    let groupId: Record<string, unknown> | string;

    switch (period) {
      case 'day': {
        groupId = { $dateToString: { format: '%Y-%m-%d', date: dateField as unknown, timezone } } as unknown as string;
        break;
      }
      case 'week': {
        // Start-of-week (ISO) using $dateTrunc for accuracy
        // periodValue will be week start date (YYYY-MM-DD)
        const weekStart = { $dateTrunc: { date: dateField as unknown, unit: 'week', timezone } } as const;
        groupId = weekStart as unknown as Record<string, unknown>;
        break;
      }
      case 'month': {
        groupId = { $dateToString: { format: '%Y-%m', date: dateField as unknown, timezone } } as unknown as string;
        break;
      }
      case 'year': {
        groupId = { $dateToString: { format: '%Y', date: dateField as unknown, timezone } } as unknown as string;
        break;
      }
      default: {
        throw new BadRequestException('Invalid period');
      }
    }

    timeSeriesPipeline.push({
      $group: {
        _id: groupId,
        count: { $sum: 1 },
        totalAmountMinor: { $sum: '$totalAmountMinor' },
        successCount: {
          $sum: {
            $cond: [{ $in: ['$status', ['paid', 'completed']] }, 1, 0],
          },
        },
      },
    });

    timeSeriesPipeline.push({
      $project: {
        _id: 0,
        periodValue: {
          $cond: [
            { $eq: [{ $type: '$_id' }, 'date'] },
            { $dateToString: { format: '%Y-%m-%d', date: '$_id', timezone } },
            '$_id',
          ],
        },
        count: 1,
        totalAmountMinor: 1,
        successCount: 1,
      },
    });

    timeSeriesPipeline.push({ $sort: { periodValue: 1 } });

    // Breakdown pipelines reuse the same match stage
    const byServicePipeline: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: { id: '$service.serviceId', name: '$service.name' },
          count: { $sum: 1 },
          totalAmountMinor: { $sum: '$totalAmountMinor' },
        },
      },
      {
        $project: {
          _id: 0,
          key: '$_id.id',
          label: '$_id.name',
          count: 1,
          totalAmountMinor: 1,
        },
      },
      { $sort: { totalAmountMinor: -1 } },
    ];

    const byChannelPipeline: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: '$payment.channel',
          count: { $sum: 1 },
          totalAmountMinor: { $sum: '$totalAmountMinor' },
        },
      },
      {
        $project: {
          _id: 0,
          key: '$_id',
          label: '$_id',
          count: 1,
          totalAmountMinor: 1,
        },
      },
      { $sort: { totalAmountMinor: -1 } },
    ];

    const totalsPipeline: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmountMinor: { $sum: '$totalAmountMinor' },
          successCount: {
            $sum: {
              $cond: [{ $in: ['$status', ['paid', 'completed']] }, 1, 0],
            },
          },
        },
      },
      { $project: { _id: 0, count: 1, totalAmountMinor: 1, successCount: 1 } },
    ];

    const facetStage = ({
      $facet: {
        timeSeries: timeSeriesPipeline,
        byService: byServicePipeline,
        byChannel: byChannelPipeline,
        totals: totalsPipeline,
      },
    } as unknown) as PipelineStage;

    const pipeline: PipelineStage[] = [facetStage];

    // Optional series-by (e.g., service/channel/status) timeseries
    if (seriesBy) {
      let dimensionField: string;
      let labelField: string | null = null;
      if (seriesBy === 'service') {
        dimensionField = '$service.serviceId';
        labelField = '$service.name';
      } else if (seriesBy === 'channel') {
        dimensionField = '$payment.channel';
      } else {
        dimensionField = '$status';
      }

      const seriesMatch: PipelineStage = { $match: match } as PipelineStage;
      const groupByPeriodId = ((): Record<string, unknown> | string => {
        switch (period) {
          case 'day':
            return { $dateToString: { format: '%Y-%m-%d', date: dateField as unknown, timezone } } as unknown as string;
          case 'week': {
            const weekStart = { $dateTrunc: { date: dateField as unknown, unit: 'week', timezone } } as const;
            return weekStart as unknown as Record<string, unknown>;
          }
          case 'month':
            return { $dateToString: { format: '%Y-%m', date: dateField as unknown, timezone } } as unknown as string;
          case 'year':
            return { $dateToString: { format: '%Y', date: dateField as unknown, timezone } } as unknown as string;
          default:
            return { $dateToString: { format: '%Y-%m-%d', date: dateField as unknown, timezone } } as unknown as string;
        }
      })();

      const seriesStages: PipelineStage[] = [
        seriesMatch,
        {
          $group: {
            _id: { dim: dimensionField, period: groupByPeriodId, label: labelField ?? '$$REMOVE' },
            count: { $sum: 1 },
            totalAmountMinor: { $sum: '$totalAmountMinor' },
          },
        } as PipelineStage,
        {
          $project: {
            _id: 0,
            key: '$_id.dim',
            label: labelField ? '$_id.label' : '$_id.dim',
            periodValue: {
              $cond: [
                { $eq: [{ $type: '$_id.period' }, 'date'] },
                { $dateToString: { date: '$_id.period', format: '%Y-%m-%d', timezone } },
                '$_id.period',
              ],
            },
            count: 1,
            totalAmountMinor: 1,
          },
        } as PipelineStage,
        { $sort: { key: 1, periodValue: 1 } } as PipelineStage,
        {
          $group: {
            _id: { key: '$key', label: '$label' },
            points: {
              $push: {
                periodValue: '$periodValue',
                count: '$count',
                totalAmountMinor: '$totalAmountMinor',
              },
            },
            count: { $sum: '$count' },
            totalAmountMinor: { $sum: '$totalAmountMinor' },
          },
        } as PipelineStage,
        {
          $project: {
            _id: 0,
            key: '$_id.key',
            label: '$_id.label',
            points: 1,
            count: 1,
            totalAmountMinor: 1,
          },
        } as PipelineStage,
        { $sort: { totalAmountMinor: -1 } } as PipelineStage,
      ];

      // Append series facet via $lookup-like second stage using $unionWith is overkill; simpler: rerun aggregate separately.
      // Instead, we will append a $facet that also includes this sub-pipeline by repurposing $facet+$replaceRoot would be complex here.
      // Execute two-step approach: run base facets first, then run series aggregate separately.
      const [base] = (await this.transactionModel.aggregate([...pipeline, ({
        $project: {
          timeSeries: 1,
          byService: 1,
          byChannel: 1,
          totals: { $arrayElemAt: ['$totals', 0] },
        },
      } as unknown) as PipelineStage]).exec()) as unknown as [
        {
          timeSeries: AggregatedTimeSeriesRow[];
          byService: AggregatedBreakdownRow[];
          byChannel: AggregatedBreakdownRow[];
          totals?: { count: number; totalAmountMinor: number; successCount: number } | null;
        }
      ];

      const series = (await this.transactionModel.aggregate(seriesStages).exec()) as unknown as Array<{
        key: string;
        label: string;
        points: Array<{ periodValue: string; count: number; totalAmountMinor: number }>;
        totalAmountMinor: number;
        count: number;
      }>;

      const totals = base?.totals || { count: 0, totalAmountMinor: 0, successCount: 0 };
      const successRate = totals.count === 0 ? 0 : (totals.successCount / totals.count) * 100;

      const timeSeries: AggregatedTimeSeriesRow[] = (base?.timeSeries || []).map((r) => ({
        periodValue: r.periodValue,
        count: r.count,
        totalAmountMinor: r.totalAmountMinor,
        successCount: r.successCount,
        successRate: r.count === 0 ? 0 : (r.successCount / r.count) * 100,
      }));

      return {
        period,
        timeSeries,
        totals: { ...totals, successRate },
        byService: base?.byService || [],
        byChannel: base?.byChannel || [],
        seriesBy,
        timeSeriesByDimension: series,
      };
    }

    const facetPipeline: PipelineStage[] = [
      ...pipeline,
      ({
        $project: {
          timeSeries: 1,
          byService: 1,
          byChannel: 1,
          totals: { $arrayElemAt: ['$totals', 0] },
        },
      } as unknown) as PipelineStage,
    ];

    // Execute aggregation
    const [result] = (await this.transactionModel.aggregate(facetPipeline).exec()) as unknown as [
      {
        timeSeries: AggregatedTimeSeriesRow[];
        byService: AggregatedBreakdownRow[];
        byChannel: AggregatedBreakdownRow[];
        totals?: { count: number; totalAmountMinor: number; successCount: number } | null;
      }
    ];

    const totals = result?.totals || { count: 0, totalAmountMinor: 0, successCount: 0 };
    const successRate = totals.count === 0 ? 0 : (totals.successCount / totals.count) * 100;

    const timeSeries: AggregatedTimeSeriesRow[] = (result?.timeSeries || []).map((r) => ({
      periodValue: r.periodValue,
      count: r.count,
      totalAmountMinor: r.totalAmountMinor,
      successCount: r.successCount,
      successRate: r.count === 0 ? 0 : (r.successCount / r.count) * 100,
    }));

    return {
      period,
      timeSeries,
      totals: { ...totals, successRate },
      byService: result?.byService || [],
      byChannel: result?.byChannel || [],
    };
  }
}


