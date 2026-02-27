import {
  Controller,
  Get,
  Patch,
  Query,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/schemas/user.schema';
import { CustomApplicationFormSubmissionsService } from './custom-application-form-submissions.service';
import {
  CustomApplicationFormSubmissionStatus,
  CustomApplicationFormSubmissionAdminStatus,
} from './schemas/custom-application-form-submission.schema';
import { UpdateAdminStatusDto } from './dto/update-admin-status.dto';
import { CustomApplicationServicesService } from '../custom-application-services/custom-application-services.service';

@ApiTags('Admin - Custom Application Form Submissions')
@Controller('admin/applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminCustomApplicationFormSubmissionsController {
  constructor(
    private readonly customApplicationFormSubmissionsService: CustomApplicationFormSubmissionsService,
    private readonly customApplicationServicesService: CustomApplicationServicesService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all custom application form submissions (admin)' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'customApplicationServiceId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'submitted'] })
  @ApiQuery({ name: 'adminStatus', required: false, enum: ['pending', 'reviewing', 'approved', 'rejected'] })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by form title, application ID, or user ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @Query('userId') userId?: string,
    @Query('customApplicationServiceId') customApplicationServiceId?: string,
    @Query('status') status?: CustomApplicationFormSubmissionStatus,
    @Query('adminStatus') adminStatus?: CustomApplicationFormSubmissionAdminStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.customApplicationFormSubmissionsService.adminList({
      userId,
      customApplicationServiceId,
      status,
      adminStatus,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return result;
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get custom application form submission by ID (admin)' })
  async findOne(@Param('id') id: string) {
    try {
      const submission = await this.customApplicationFormSubmissionsService.adminFindOne(id);
      const doc = submission.toObject ? submission.toObject() : { ...submission };
      const serviceId = (doc as { customApplicationServiceId?: string }).customApplicationServiceId;
      let customApplicationServiceTitle: string | null = null;
      if (serviceId) {
        const titleMap = await this.customApplicationServicesService.findTitlesByIds([serviceId]);
        customApplicationServiceTitle = titleMap[serviceId] ?? null;
      }
      return { ...doc, customApplicationServiceTitle };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Submission not found');
    }
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update admin status of custom application form submission' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAdminStatusDto,
  ) {
    try {
      const submission = await this.customApplicationFormSubmissionsService.updateAdminStatus(id, dto);
      return submission;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Submission not found');
    }
  }
}
