import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CustomPaymentService, CustomPaymentServiceDocument } from './schemas/custom-payment-service.schema';
import { CreateCustomPaymentServiceDto } from './dto/create-custom-payment-service.dto';
import { UpdateCustomPaymentServiceDto } from './dto/update-custom-payment-service.dto';

@Injectable()
export class CustomPaymentServicesService {
  constructor(
    @InjectModel(CustomPaymentService.name)
    private customPaymentServiceModel: Model<CustomPaymentServiceDocument>,
  ) {}

  async create(createDto: CreateCustomPaymentServiceDto, userId?: string | Types.ObjectId): Promise<CustomPaymentService> {
    // Generate unique ID: title_date_time_count
    const slugify = (s: string): string =>
      String(s)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'payment';

    const titleSlug = slugify(createDto.title);
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const time = now.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS

    // Count existing services with the same title created today
    const todayServices = await this.customPaymentServiceModel.find({
      id: new RegExp(`^${titleSlug}_${date}_`),
    }).exec();

    const count = todayServices.length + 1;
    const id = `${titleSlug}_${date}_${time}_${count}`;

    // Validate form fields
    const formFields = (createDto.formFields || []).map((field) => {
      const fieldLabel = (field.label || '').trim();
      if (!fieldLabel) {
        throw new BadRequestException(`Field label is required for field at index ${(createDto.formFields || []).indexOf(field)}`);
      }

      const sanitized: any = {
        id: field.id.trim(),
        label: fieldLabel,
        type: field.type,
        required: Boolean(field.required),
      };

      if (field.placeholder) sanitized.placeholder = (field.placeholder || '').trim();
      if (field.reminder) sanitized.reminder = (field.reminder || '').trim();
      if ((field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && field.options && field.options.length > 0) {
        sanitized.options = field.options.filter((o) => o && o.value && o.label);
      }
      if (field.validation) sanitized.validation = field.validation;

      return sanitized;
    });

    // Check cost field count
    const costCount = formFields.filter((f) => f.type === 'cost').length;
    if (costCount > 1) {
      throw new BadRequestException('Only one cost field is allowed');
    }

    const hasCost = costCount === 1;
    const baseAmount = hasCost ? 0 : Math.max(0, createDto.baseAmount || 0);
    const processingFee = Math.max(0, createDto.processingFee || 0);

    const service = new this.customPaymentServiceModel({
      id,
      title: createDto.title.trim(),
      description: (createDto.description || '').trim(),
      baseAmount,
      processingFee,
      enabled: createDto.enabled !== false,
      formFields,
      createdBy: userId ? (typeof userId === 'string' ? new Types.ObjectId(userId) : userId) : undefined,
      updatedBy: userId ? (typeof userId === 'string' ? new Types.ObjectId(userId) : userId) : undefined,
    });

    return service.save();
  }

  async findAll(enabled?: boolean): Promise<CustomPaymentService[]> {
    const query: any = {};
    if (enabled !== undefined) {
      query.enabled = enabled;
    }
    return this.customPaymentServiceModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<CustomPaymentService> {
    const service = await this.customPaymentServiceModel.findOne({ id }).exec();
    if (!service) {
      throw new NotFoundException(`Custom payment service with ID "${id}" not found`);
    }
    return service;
  }

  async update(id: string, updateDto: UpdateCustomPaymentServiceDto, userId?: string | Types.ObjectId): Promise<CustomPaymentService> {
    const service = await this.customPaymentServiceModel.findOne({ id }).exec();
    if (!service) {
      throw new NotFoundException(`Custom payment service with ID "${id}" not found`);
    }

    // Validate form fields if provided
    if (updateDto.formFields !== undefined) {
      const formFields = updateDto.formFields.map((field) => {
        const fieldLabel = (field.label || '').trim();
        if (!fieldLabel) {
          throw new BadRequestException(`Field label is required`);
        }

        const sanitized: any = {
          id: field.id.trim(),
          label: fieldLabel,
          type: field.type,
          required: Boolean(field.required),
        };

        if (field.placeholder) sanitized.placeholder = (field.placeholder || '').trim();
        if (field.reminder) sanitized.reminder = (field.reminder || '').trim();
        if ((field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && field.options && field.options.length > 0) {
          sanitized.options = field.options.filter((o) => o && o.value && o.label);
        }
        if (field.validation) sanitized.validation = field.validation;

        return sanitized;
      });

      // Check cost field count
      const costCount = formFields.filter((f) => f.type === 'cost').length;
      if (costCount > 1) {
        throw new BadRequestException('Only one cost field is allowed');
      }

      const hasCost = costCount === 1;
      if (updateDto.baseAmount === undefined) {
        updateDto.baseAmount = hasCost ? 0 : service.baseAmount;
      } else if (!hasCost) {
        updateDto.baseAmount = Math.max(0, updateDto.baseAmount);
      } else {
        updateDto.baseAmount = 0;
      }

      updateDto.formFields = formFields;
    }

    if (updateDto.title) {
      updateDto.title = updateDto.title.trim();
    }
    if (updateDto.description !== undefined) {
      updateDto.description = (updateDto.description || '').trim();
    }
    if (updateDto.processingFee !== undefined) {
      updateDto.processingFee = Math.max(0, updateDto.processingFee);
    }

    Object.assign(service, updateDto);
    if (userId) {
      service.updatedBy = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    }

    return service.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.customPaymentServiceModel.deleteOne({ id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Custom payment service with ID "${id}" not found`);
    }
  }

  async updateEnabled(id: string, enabled: boolean, userId?: string | Types.ObjectId): Promise<CustomPaymentService> {
    const service = await this.findOne(id);
    service.enabled = enabled;
    if (userId) {
      service.updatedBy = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    }
    return service.save();
  }
}
