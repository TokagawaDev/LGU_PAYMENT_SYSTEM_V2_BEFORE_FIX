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
import { CustomApplicationServicesService } from './custom-application-services.service';
import { CreateCustomApplicationServiceDto } from './dto/create-custom-application-service.dto';
import { UpdateCustomApplicationServiceDto } from './dto/update-custom-application-service.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('custom-application-services')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }))
export class CustomApplicationServicesController {
  constructor(private readonly customApplicationServicesService: CustomApplicationServicesService) {}

  // Public endpoints (must be defined before parameterized routes)
  @Public()
  @Get('public/visible')
  async getVisiblePublic() {
    return this.customApplicationServicesService.findAll(true);
  }

  @Public()
  @Get('public/:id')
  async findOnePublic(@Param('id') id: string) {
    try {
      const service = await this.customApplicationServicesService.findOne(id);
      // Only return if visible
      if (service && service.visible) {
        return service;
      }
      // Return 404 if service not found or not visible
      throw new NotFoundException(`Custom application service with ID "${id}" not found or not visible`);
    } catch (error) {
      // Re-throw NotFoundException, but handle other errors
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Custom application service with ID "${id}" not found`);
    }
  }

  // Admin endpoints (require authentication and permissions)
  @UseGuards(PermissionsGuard)
  @Permissions('application_management_setting')
  @Post()
  async create(@Body() createDto: CreateCustomApplicationServiceDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.customApplicationServicesService.create(createDto, userId);
  }

  @UseGuards(PermissionsGuard)
  @Permissions('application_management_setting')
  @Get()
  async findAll(
    @Query('visible') visible?: string,
  ) {
    const visibleBool = visible === undefined ? undefined : visible === 'true';
    return this.customApplicationServicesService.findAll(visibleBool);
  }

  @UseGuards(PermissionsGuard)
  @Permissions('application_management_setting')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.customApplicationServicesService.findOne(id);
  }

  @UseGuards(PermissionsGuard)
  @Permissions('application_management_setting')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomApplicationServiceDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.customApplicationServicesService.update(id, updateDto, userId);
  }

  @UseGuards(PermissionsGuard)
  @Permissions('application_management_setting')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.customApplicationServicesService.remove(id);
    return { message: 'Custom application service deleted successfully' };
  }

  @UseGuards(PermissionsGuard)
  @Permissions('application_management_setting')
  @Patch(':id/visible')
  async updateVisible(
    @Param('id') id: string,
    @Body() body: { visible: boolean },
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.customApplicationServicesService.updateVisible(id, body.visible, userId);
  }
}
