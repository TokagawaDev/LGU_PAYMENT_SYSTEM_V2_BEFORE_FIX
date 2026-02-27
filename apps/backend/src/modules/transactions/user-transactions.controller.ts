import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { TransactionStatusDtoEnum } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/schemas/user.schema';
import type { Request } from 'express';

type AuthRequest = Request & { user?: { _id?: string; id?: string; email?: string } };

@ApiTags('User - Transactions')
@Controller('user/transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class UserTransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List user transactions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatusDtoEnum })
  @ApiQuery({ name: 'serviceId', required: false, type: String })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async list(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
    @Query('serviceId') serviceId?: string,
    @Query('q') q?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
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
    
    const userId = req?.user?._id || req?.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const result = await this.transactionsService.listTransactions({
      page: validatedPage,
      limit: validatedLimit,
      status: parsedStatus,
      serviceId,
      q,
      dateFrom,
      dateTo,
      userId: userId.toString(),
    });
    return result;
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user transaction by id' })
  async getById(@Param('id') id: string, @Req() req: AuthRequest) {
    const userId = req?.user?._id || req?.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const transaction = await this.transactionsService.getTransactionById(id);
    
    // Ensure the transaction belongs to the requesting user
    if (transaction.userId !== userId.toString()) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }
}
