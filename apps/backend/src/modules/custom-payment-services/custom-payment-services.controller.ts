import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
  NotFoundException,
} from '@nestjs/common';
import { CustomPaymentServicesService } from './custom-payment-services.service';
import { CreateCustomPaymentServiceDto } from './dto/create-custom-payment-service.dto';
import { UpdateCustomPaymentServiceDto } from './dto/update-custom-payment-service.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('custom-payment-services')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }))
export class CustomPaymentServicesController {
  constructor(private readonly customPaymentServicesService: CustomPaymentServicesService) {}

  // Public endpoints (must be defined before parameterized routes)
  @Public()
  @Get('public/enabled')
  async getEnabledPublic() {
    return this.customPaymentServicesService.findAll(true);
  }

  @Public()
  @Get('public/:id')
  async findOnePublic(@Param('id') id: string) {
    try {
      const service = await this.customPaymentServicesService.findOne(id);
      // Only return if enabled
      if (service && service.enabled) {
        return service;
      }
      // Return 404 if service not found or disabled
      throw new NotFoundException(`Custom payment service with ID "${id}" not found or disabled`);
    } catch (error) {
      // Re-throw NotFoundException, but handle other errors
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Custom payment service with ID "${id}" not found`);
    }
  }

  // Admin endpoints (require authentication and permissions)
  @UseGuards(PermissionsGuard)
  @Permissions('payment_management_setting')
  @Post()
  async create(@Body() createDto: CreateCustomPaymentServiceDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.customPaymentServicesService.create(createDto, userId);
  }

  @UseGuards(PermissionsGuard)
  @Permissions('payment_management_setting')
  @Get()
  async findAll(
    @Query('enabled') enabled?: string,
  ) {
    const enabledBool = enabled === undefined ? undefined : enabled === 'true';
    return this.customPaymentServicesService.findAll(enabledBool);
  }

  @UseGuards(PermissionsGuard)
  @Permissions('payment_management_setting')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.customPaymentServicesService.findOne(id);
  }

  @UseGuards(PermissionsGuard)
  @Permissions('payment_management_setting')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomPaymentServiceDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.customPaymentServicesService.update(id, updateDto, userId);
  }

  @UseGuards(PermissionsGuard)
  @Permissions('payment_management_setting')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.customPaymentServicesService.remove(id);
    return { message: 'Custom payment service deleted successfully' };
  }

  @UseGuards(PermissionsGuard)
  @Permissions('payment_management_setting')
  @Patch(':id/enabled')
  async updateEnabled(
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.customPaymentServicesService.updateEnabled(id, body.enabled, userId);
  }
}
