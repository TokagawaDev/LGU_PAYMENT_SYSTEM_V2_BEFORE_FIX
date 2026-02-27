import { Body, Controller, Get, Post, Query, UseGuards, BadRequestException, ForbiddenException, Req } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/schemas/user.schema';
import { TransactionsService } from '../transactions/transactions.service';
import type { Request } from 'express';

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  @Post('presign')
  @Roles(UserRole.USER)
  async createPresigned(@Body() body: { contentType: string; maxBytes?: number; keyPrefix?: string }) {
    const maxBytes = Math.min(10 * 1024 * 1024, Math.max(1, Number(body?.maxBytes || 10 * 1024 * 1024)));
    const keyPrefix = (body?.keyPrefix || 'user-uploads').replace(/[^a-z0-9/-]+/gi, '-');
    return this.uploadsService.createPresignedPut({
      keyPrefix,
      contentType: String(body?.contentType || ''),
      maxBytes,
    });
  }

  @Get('view')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async view(
    @Query('key') key: string,
    @Query('transactionId') transactionId?: string,
    @Query('fieldId') fieldId?: string,
    @Req() req?: Request,
  ) {
    if (!key || key.includes('..')) {
      throw new BadRequestException('Invalid key');
    }
    // If admin/super_admin, allow without transaction context
    // For users, require transaction + field verification and ownership
    const role: string | undefined = (req as unknown as { user?: { role?: string } })?.user?.role;
    const userIdFromReq: string | undefined = (req as unknown as { user?: { _id?: string; id?: string } })?.user?.id
      || (req as unknown as { user?: { _id?: string; id?: string } })?.user?._id as string | undefined;
    const isAdminContext = role === 'admin' || role === 'super_admin';
    if (!isAdminContext) {
      if (!transactionId || !fieldId) {
        throw new ForbiddenException('Missing transaction context');
      }
      const txn = await this.transactionsService.getTransactionById(transactionId);
      // Ensure ownership
      if (userIdFromReq && txn.userId && String(txn.userId) !== String(userIdFromReq)) {
        throw new ForbiddenException('Not allowed');
      }
      const form = (txn.details?.formData || {}) as Record<string, unknown>;
      const value = form[fieldId];
      if (typeof value !== 'string' || value !== key) {
        throw new ForbiddenException('File not associated with this transaction');
      }
    }
    const url = await this.uploadsService.createPresignedGet(key);
    return { url };
  }
}


