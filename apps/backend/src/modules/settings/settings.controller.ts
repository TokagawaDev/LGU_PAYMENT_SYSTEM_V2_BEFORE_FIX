import { Body, Controller, Get, Patch, Post, UploadedFile, UseInterceptors, UseGuards, Req, BadRequestException, Param, ForbiddenException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';
import type { SettingsDocument } from './schemas/settings.schema';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserRole } from '../auth/schemas/user.schema';
import { SERVICES, isValidServiceId } from '@shared/constants/services';
import type { Request } from 'express';
import { UsePipes, ValidationPipe } from '@nestjs/common';

@Controller('settings')
@UseGuards(PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('public')
  async getPublic(@Req() req: Request) {
    const settings = await this.settingsService.getPublicSettings();
    const base = `${req.protocol}://${req.get('host')}`;
    const makeAbsolute = (url: string): string =>
      url?.startsWith('/uploads') ? `${base}${url}` : url;
    return {
      city: settings.city,
      branding: settings.branding,
      assets: {
        headerBackgroundUrl: makeAbsolute(settings.assets.headerBackgroundUrl),
        sealLogoUrl: makeAbsolute(settings.assets.sealLogoUrl),
        faviconUrl: makeAbsolute(settings.assets.faviconUrl),
      },
      contact: settings.contact,
      faq: settings.faq,
      convenienceFee: settings.convenienceFee,
      updatedAt: (settings as SettingsDocument).updatedAt,
    };
  }

  @Permissions('manage_settings')
  @Get()
  async getAll() {
    return this.settingsService.getOrCreateSettings();
  }

  @Patch()
  @UsePipes(new ValidationPipe({ 
    whitelist: true, 
    forbidNonWhitelisted: false, // Allow extra properties like 'visible' that aren't in DTO
    transform: true 
  }))
  async update(@Body() body: any, @Req() req: any) {
    const user = req.user;
    const userPermissions = (user?.permissions || []) as string[];
    const isSuperAdmin = user?.role === 'super_admin';

    // Check permissions based on what's being updated
    if (body.addOnServices !== undefined) {
      // Updating add-on services requires application_management_setting permission
      if (!isSuperAdmin && !userPermissions.includes('application_management_setting')) {
        throw new ForbiddenException('Access denied. Required permission: application_management_setting');
      }
    } else if (body.customPaymentServices !== undefined) {
      // Updating custom payment services requires payment_management_setting permission
      if (!isSuperAdmin && !userPermissions.includes('payment_management_setting')) {
        throw new ForbiddenException('Access denied. Required permission: payment_management_setting');
      }
    } else {
      // Other settings updates require manage_settings permission
      if (!isSuperAdmin && !userPermissions.includes('manage_settings')) {
        throw new ForbiddenException('Access denied. Required permission: manage_settings');
      }
    }

    // In a real app, derive user id from request.user
    // Using 'any' type to allow visible property that's not in DTO
    return this.settingsService.updateSettings(body);
  }

  @Permissions('manage_settings')
  @Post('assets')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        return cb(new Error('Invalid file type'), false);
      },
    }),
  )
  async uploadAsset(@UploadedFile() file: { buffer: Buffer; mimetype: string }) {
    if (!file) throw new BadRequestException('No file uploaded');

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    const folder = process.env.CLOUDINARY_FOLDER || 'lgu-settings';
    const isFavicon = file.mimetype.includes('icon');
    const transformation = isFavicon
      ? []
      : [
          { width: 1920, height: 1080, crop: 'limit' },
          { fetch_format: 'auto', quality: 'auto' },
        ];

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          overwrite: true,
          transformation,
        },
        (error, res) => {
          if (error || !res?.secure_url) return reject(error || new Error('Upload failed'));
          resolve({ secure_url: res.secure_url });
        }
      );
      // file.buffer is available because we use memoryStorage
      Readable.from(file.buffer as Buffer).pipe(stream);
    });

    return { url: result.secure_url };
  }

  @Public()
  @Get('enabled-services')
  async getEnabledServices() {
    const enabledServiceIds = await this.settingsService.getEnabledServices();
    const enabledServices = SERVICES.filter(service =>
      enabledServiceIds.includes(service.id)
    );
    return enabledServices;
  }

  @Public()
  @Get('add-on-services')
  async getAddOnServices() {
    const settings = await this.settingsService.getOrCreateSettings();
    // Convert Mongoose document to plain object to ensure proper serialization
    const settingsObj = settings.toObject ? settings.toObject() : settings;
    const addOnServices = (settingsObj as any).addOnServices ?? [];
    
    // Ensure proper serialization of nested arrays
    const plainServices = Array.isArray(addOnServices) 
      ? addOnServices.map((service: any) => {
          const plainService: any = {
            id: service?.id || service?._id?.toString() || '',
            title: service?.title || '',
            description: service?.description || '',
            icon: service?.icon || 'FileText',
            color: service?.color || 'bg-blue-500',
            // Only show in citizen application list when explicitly true
            visible: service?.visible === true,
          };
          
          // Serialize formSteps
          if (service?.formSteps && Array.isArray(service.formSteps)) {
            plainService.formSteps = service.formSteps.map((step: any) => ({
              index: typeof step?.index === 'number' ? step.index : 0,
              letter: String(step?.letter || 'A'),
              label: String(step?.label || 'Step'),
              buttonTexts: step?.buttonTexts || undefined,
              buttonVisibility: step?.buttonVisibility || undefined,
            }));
          }
          
          // Serialize formFields
          if (service?.formFields && Array.isArray(service.formFields)) {
            plainService.formFields = service.formFields.map((field: any) => ({
              type: String(field?.type || 'text'),
              label: String(field?.label || ''),
              placeholder: field?.placeholder ? String(field.placeholder) : undefined,
              required: Boolean(field?.required),
              options: Array.isArray(field?.options) ? field.options : undefined,
              stepIndex: typeof field?.stepIndex === 'number' ? field.stepIndex : undefined,
              helpText: field?.helpText ? String(field.helpText) : undefined,
              fieldOrder: typeof field?.fieldOrder === 'number' ? field.fieldOrder : undefined,
              header: field?.header ? String(field.header) : undefined,
              reminder: field?.reminder ? String(field.reminder) : undefined,
            }));
          }
          
          // Serialize buttonTexts and buttonVisibility
          if (service?.buttonTexts) {
            plainService.buttonTexts = service.buttonTexts;
          }
          if (service?.buttonVisibility) {
            plainService.buttonVisibility = service.buttonVisibility;
          }
          
          return plainService;
        })
      : [];
    
    return plainServices;
  }

  @Public()
  @Get('form-config/:serviceId')
  async getFormConfig(@Param('serviceId') serviceId: string) {
    if (!isValidServiceId(serviceId)) return {};
    const cfg = await this.settingsService.getFormConfig(serviceId);
    return cfg || {};
  }

  @Permissions('payment_management_setting')
  @Patch('form-config/:serviceId')
  async updateFormConfig(@Param('serviceId') serviceId: string, @Body() body: {
    title: string;
    description: string;
    formFields: Array<{
      id: string;
      label: string;
      type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea' | 'file' | 'date' | 'cost';
      required?: boolean;
      placeholder?: string;
      options?: Array<{ value: string; label: string }>;
      validation?: { min?: number; max?: number; pattern?: string; message?: string };
    }>;
    baseAmount: number;
    processingFee: number;
  }) {
    if (!isValidServiceId(serviceId)) {
      throw new BadRequestException('Invalid service id');
    }
    const updated = await this.settingsService.saveFormConfig(serviceId, body);
    return updated;
  }
}


