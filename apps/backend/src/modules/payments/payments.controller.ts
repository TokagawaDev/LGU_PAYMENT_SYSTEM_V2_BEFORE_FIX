import { Body, Controller, HttpCode, HttpStatus, Post, Req, Headers, UseGuards, UsePipes, ValidationPipe, BadRequestException, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../auth/schemas/user.schema';
import type { Request } from 'express';

type AuthRequest = Request & { user?: { _id?: string; id?: string } };

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a PayMongo Checkout session and return checkout_url' })
  async createCheckout(@Body() body: CreateCheckoutDto) {
    const { transactionId, successUrl, cancelUrl } = body;
    const description = `LGU payment for transaction ${transactionId}`;
    const result = await this.paymentsService.createCheckoutSession({
      transactionId,
      description,
      successUrl,
      cancelUrl,
    });
    return { checkoutUrl: result.checkoutUrl, providerSessionId: result.providerSessionId };
  }

  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create transaction and Checkout session in one call' })
  async initiate(@Body() body: InitiatePaymentDto, @Req() req: AuthRequest) {
    // Defense-in-depth: ensure the caller is a USER, not admin/super_admin
    const role: string | undefined = (req as unknown as { user?: { role?: string } })?.user?.role;
    if (role && role !== UserRole.USER) {
      throw new BadRequestException('Only regular users can initiate payments');
    }
    const user = req?.user as { _id?: string; id?: string; email?: string; firstName?: string; lastName?: string } | undefined;
    const userFullName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() : undefined;
    const { checkoutUrl, transactionId } = await this.paymentsService.initiatePayment({
      ...body,
      user: user
        ? { id: (user._id || user.id || '').toString(), email: user.email || '', fullName: userFullName || '' }
        : undefined,
    });
    return { checkoutUrl, transactionId };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'PayMongo webhook receiver' })
  @Public()
  async webhook(@Req() req: Request & { headers: Record<string, unknown>; body: Buffer }, @Headers('paymongo-signature') signature: string | undefined) {
    const header: string | undefined = (req?.headers?.['paymongo-signature'] as string | undefined) || signature;
    if (!header) throw new BadRequestException('Missing signature');
    const rawBody: Buffer = req.body as Buffer;
    await this.paymentsService.verifyAndProcessWebhook(rawBody, header);
    return { received: true };
  }

  @Patch('cancel/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a pending/awaiting_payment transaction as failed/cancelled' })
  async cancel(@Param('id') id: string) {
    const result = await this.paymentsService.cancelPendingTransaction(id);
    return { transactionId: id, status: result.status };
  }
}


