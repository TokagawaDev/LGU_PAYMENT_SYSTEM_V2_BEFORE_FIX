import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/schemas/user.schema';
import { CustomApplicationFormSubmissionsService } from './custom-application-form-submissions.service';
import { CreateCustomApplicationFormSubmissionDto } from './dto/create-custom-application-form-submission.dto';
import { UpdateCustomApplicationFormSubmissionDto } from './dto/update-custom-application-form-submission.dto';
import type { Request } from 'express';

type AuthRequest = Request & { user?: { _id?: string; id?: string } };

@ApiTags('User - Custom Application Form Submissions')
@Controller('user/custom-application-form-submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class UserCustomApplicationFormSubmissionsController {
  constructor(
    private readonly customApplicationFormSubmissionsService: CustomApplicationFormSubmissionsService,
  ) {}

  private getUserId(req: AuthRequest): string {
    const userId = req?.user?._id ?? req?.user?.id;
    if (!userId) throw new NotFoundException('User not found');
    return typeof userId === 'string' ? userId : String(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create custom application form submission (draft or submit)' })
  async create(
    @Body() dto: CreateCustomApplicationFormSubmissionDto,
    @Req() req: AuthRequest,
  ) {
    return this.customApplicationFormSubmissionsService.create(this.getUserId(req), dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List current user custom application form submissions' })
  async list(
    @Query('customApplicationServiceId') customApplicationServiceId?: string,
    @Query('status') status?: 'draft' | 'submitted',
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Req() req: AuthRequest,
  ) {
    return this.customApplicationFormSubmissionsService.list({
      userId: this.getUserId(req),
      customApplicationServiceId,
      status,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get one custom application form submission by id' })
  async getById(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.customApplicationFormSubmissionsService.findOne(id, this.getUserId(req));
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update custom application form submission (e.g. save draft)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomApplicationFormSubmissionDto,
    @Req() req: AuthRequest,
  ) {
    return this.customApplicationFormSubmissionsService.update(
      id,
      this.getUserId(req),
      dto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete custom application form submission' })
  async delete(@Param('id') id: string, @Req() req: AuthRequest) {
    await this.customApplicationFormSubmissionsService.remove(id, this.getUserId(req));
  }
}
