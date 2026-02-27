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
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../auth/schemas/user.schema';
import { AdminCustomFormsService } from './admin-custom-forms.service';
import { CreateAdminCustomFormDto } from './dto/create-admin-custom-form.dto';
import { UpdateAdminCustomFormDto } from './dto/update-admin-custom-form.dto';
import { CreateFormSubmissionDto } from './dto/create-form-submission.dto';
import { UpdateFormSubmissionDto } from './dto/update-form-submission.dto';
import type { Request } from 'express';

type AuthRequest = Request & { user?: { _id?: string; id?: string } };

@ApiTags('Admin - Custom forms')
@Controller('admin/custom-forms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class AdminCustomFormsController {
  constructor(private readonly service: AdminCustomFormsService) {}

  private getUserId(req: AuthRequest): string {
    const userId = req?.user?._id ?? req?.user?.id;
    if (!userId) throw new NotFoundException('User not found');
    return typeof userId === 'string' ? userId : String(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a custom form (admin only)' })
  async create(@Body() dto: CreateAdminCustomFormDto, @Req() req: AuthRequest) {
    return this.service.create(this.getUserId(req), dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List admin custom forms' })
  async list(
    @Query('status') status?: 'draft' | 'published',
    @Req() req?: AuthRequest,
  ) {
    if (!req?.user) return [];
    return this.service.list(this.getUserId(req), status);
  }

  @Get('published')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all published custom forms (public)' })
  async listPublished() {
    return this.service.listPublished();
  }

  @Get('published/:id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get one published custom form by id (public)' })
  async getPublishedById(@Param('id') id: string) {
    return this.service.findOnePublished(id);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get one custom form by id (admin only)' })
  async getById(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.findOne(id, this.getUserId(req));
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update custom form (admin only)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminCustomFormDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.update(id, this.getUserId(req), dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete custom form and its submissions (admin only)' })
  async delete(@Param('id') id: string, @Req() req: AuthRequest) {
    await this.service.remove(id, this.getUserId(req));
  }

  @Post(':formId/submissions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create form submission (draft or submit)' })
  async createSubmission(
    @Param('formId') formId: string,
    @Body() dto: CreateFormSubmissionDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.createSubmission(
      formId,
      this.getUserId(req),
      dto,
    );
  }

  @Get(':formId/submissions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List submissions for a form' })
  async listSubmissions(
    @Param('formId') formId: string,
    @Query('status') status?: 'draft' | 'submitted',
    @Req() req?: AuthRequest,
  ) {
    if (!req?.user) return [];
    return this.service.listSubmissions(
      formId,
      this.getUserId(req),
      status,
    );
  }

  @Get(':formId/submissions/:subId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get one submission' })
  async getSubmission(
    @Param('formId') formId: string,
    @Param('subId') subId: string,
    @Req() req: AuthRequest,
  ) {
    return this.service.findOneSubmission(
      formId,
      subId,
      this.getUserId(req),
    );
  }

  @Patch(':formId/submissions/:subId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update submission' })
  async updateSubmission(
    @Param('formId') formId: string,
    @Param('subId') subId: string,
    @Body() dto: UpdateFormSubmissionDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.updateSubmission(
      formId,
      subId,
      this.getUserId(req),
      dto,
    );
  }

  @Delete(':formId/submissions/:subId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete submission' })
  async deleteSubmission(
    @Param('formId') formId: string,
    @Param('subId') subId: string,
    @Req() req: AuthRequest,
  ) {
    await this.service.removeSubmission(
      formId,
      subId,
      this.getUserId(req),
    );
  }
}
