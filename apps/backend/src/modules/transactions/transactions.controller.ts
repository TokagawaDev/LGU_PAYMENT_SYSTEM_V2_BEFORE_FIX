import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, TransactionStatusDtoEnum } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/schemas/user.schema';
import type { AggregatePeriod } from './transactions.service';
import type { Request } from 'express';

type AuthRequest = Request & { user?: { allowedServices?: string[]; _id?: string; id?: string } };

@ApiTags('Admin - Transactions')
@Controller('admin/transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a transaction' })
  async create(@Body() dto: CreateTransactionDto, @Req() req: AuthRequest) {
    const createdByAdminId = req.user?._id || req.user?.id || 'admin';
    return this.transactionsService.createTransaction(dto, createdByAdminId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List transactions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatusDtoEnum })
  @ApiQuery({ name: 'serviceId', required: false, type: String })
  @ApiQuery({ name: 'reference', required: false, type: String })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'channel', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  async list(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
    @Query('serviceId') serviceId?: string,
    @Query('reference') reference?: string,
    @Query('q') q?: string,
    @Query('channel') channel?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('userId') userId?: string,
    @Req() req?: AuthRequest,
  ) {
    const validatedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const validatedPage = Math.max(Number(page) || 1, 1);
    
    // Parse status parameter - handle both single status and comma-separated statuses
    let parsedStatus: TransactionStatusDtoEnum | TransactionStatusDtoEnum[] | undefined;
    if (status) {
      if (status.includes(',')) {
        parsedStatus = status.split(',').map(s => s.trim()) as TransactionStatusDtoEnum[];
      } else {
        parsedStatus = status as TransactionStatusDtoEnum;
      }
    }
    
    const allowedServiceIds: string[] | undefined = Array.isArray(req?.user?.allowedServices) && (req?.user?.allowedServices?.length || 0) > 0 ? (req?.user?.allowedServices as string[]) : undefined;
    const result = await this.transactionsService.listTransactions({
      page: validatedPage,
      limit: validatedLimit,
      status: parsedStatus,
      serviceId,
      reference,
      q,
      channel,
      dateFrom,
      dateTo,
      userId,
      allowedServiceIds,
    });
    return result;
  }

  @Get('count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get total transactions count' })
  async count() {
    const total = await this.transactionsService.countAll();
    return { total };
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get transactions stats' })
  async stats(@Req() req: AuthRequest) {
    const allowedServiceIds: string[] | undefined = Array.isArray(req.user?.allowedServices) && req.user.allowedServices.length > 0 ? req.user.allowedServices : undefined;
    return this.transactionsService.getStats(allowedServiceIds);
  }

  @Get('reports/aggregate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aggregate transactions for reports' })
  @ApiQuery({ name: 'period', required: true, enum: ['day', 'week', 'month', 'year'] })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'serviceId', required: false, type: String })
  @ApiQuery({ name: 'channel', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatusDtoEnum })
  @ApiQuery({ name: 'seriesBy', required: false, enum: ['service', 'channel', 'status'] })
  async aggregate(
    @Query('period') period: AggregatePeriod,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('serviceId') serviceId?: string,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
    @Query('seriesBy') seriesBy?: 'service' | 'channel' | 'status',
    @Req() req?: AuthRequest,
  ) {
    // Validate period
    const allowed: AggregatePeriod[] = ['day', 'week', 'month', 'year'];
    if (!allowed.includes(period)) {
      throw new Error('Invalid period');
    }
    
    // Parse status parameter - handle both single status and comma-separated statuses
    let parsedStatus: TransactionStatusDtoEnum | TransactionStatusDtoEnum[] | undefined;
    if (status) {
      if (status.includes(',')) {
        parsedStatus = status.split(',').map(s => s.trim()) as TransactionStatusDtoEnum[];
      } else {
        parsedStatus = status as TransactionStatusDtoEnum;
      }
    }
    
    const allowedServiceIds: string[] | undefined = Array.isArray(req?.user?.allowedServices) && (req?.user?.allowedServices?.length || 0) > 0 ? (req?.user?.allowedServices as string[]) : undefined;
    return this.transactionsService.aggregateTransactions({ period, dateFrom, dateTo, serviceId, channel, status: parsedStatus, seriesBy, allowedServiceIds });
  }

  @Get('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export transactions as CSV with filters' })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatusDtoEnum })
  @ApiQuery({ name: 'serviceId', required: false, type: String })
  @ApiQuery({ name: 'reference', required: false, type: String })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'channel', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async exportCsv(
    @Query('status') status?: string,
    @Query('serviceId') serviceId?: string,
    @Query('reference') reference?: string,
    @Query('q') q?: string,
    @Query('channel') channel?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Req() req?: AuthRequest,
  ) {
    // Parse status parameter - handle both single status and comma-separated statuses
    let parsedStatus: TransactionStatusDtoEnum | TransactionStatusDtoEnum[] | undefined;
    if (status) {
      if (status.includes(',')) {
        parsedStatus = status.split(',').map(s => s.trim()) as TransactionStatusDtoEnum[];
      } else {
        parsedStatus = status as TransactionStatusDtoEnum;
      }
    }
    
    const allowedServiceIds: string[] | undefined = Array.isArray(req?.user?.allowedServices) && (req?.user?.allowedServices?.length || 0) > 0 ? (req?.user?.allowedServices as string[]) : undefined;
    const { filename, csv } = await this.transactionsService.exportTransactionsCsv({
      page: 1,
      limit: 10000,
      status: parsedStatus,
      serviceId,
      reference,
      q,
      channel,
      dateFrom,
      dateTo,
      allowedServiceIds,
    });
    // Return JSON with data to simplify Next.js fetch; frontend will trigger file download
    return { filename, csv };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get transaction by id' })
  async getById(@Param('id') id: string) {
    return this.transactionsService.getTransactionById(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a transaction' })
  async update(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.transactionsService.updateTransaction(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a transaction' })
  async delete(@Param('id') id: string) {
    await this.transactionsService.deleteTransaction(id);
    return { message: 'Deleted' };
  }
}


