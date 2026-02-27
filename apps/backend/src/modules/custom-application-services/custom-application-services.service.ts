import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CustomApplicationService, CustomApplicationServiceDocument } from './schemas/custom-application-service.schema';
import { CreateCustomApplicationServiceDto } from './dto/create-custom-application-service.dto';
import { UpdateCustomApplicationServiceDto } from './dto/update-custom-application-service.dto';

@Injectable()
export class CustomApplicationServicesService {
  constructor(
    @InjectModel(CustomApplicationService.name)
    private customApplicationServiceModel: Model<CustomApplicationServiceDocument>,
  ) {}

  async create(createDto: CreateCustomApplicationServiceDto, userId?: string | Types.ObjectId): Promise<CustomApplicationService> {
    // Generate unique ID: title_date_time_count
    const slugify = (s: string): string =>
      String(s)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'application';

    const titleSlug = slugify(createDto.title);
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const time = now.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS

    // Count existing services with the same title created today
    const todayServices = await this.customApplicationServiceModel.find({
      id: new RegExp(`^${titleSlug}_${date}_`),
    }).exec();

    const count = todayServices.length + 1;
    const id = `${titleSlug}_${date}_${time}_${count}`;

    // Validate form fields
    const validFieldTypes = ['text', 'number', 'email', 'password', 'date', 'file', 'select', 'radio', 'checkbox', 'textarea', 'submit', 'reset'] as const;
    const formFields = (createDto.formFields || []).map((field) => {
      const fieldLabel = (field.label || '').trim();
      if (!fieldLabel) {
        throw new BadRequestException(`Field label is required for field at index ${(createDto.formFields || []).indexOf(field)}`);
      }

      if (!validFieldTypes.includes(field.type as typeof validFieldTypes[number])) {
        throw new BadRequestException(`Invalid field type: ${field.type}`);
      }

      const sanitized: any = {
        type: field.type,
        label: fieldLabel,
        required: Boolean(field.required),
      };

      if (field.placeholder) sanitized.placeholder = (field.placeholder || '').trim();
      if (field.stepIndex !== undefined) sanitized.stepIndex = field.stepIndex;
      if (field.helpText) sanitized.helpText = (field.helpText || '').trim();
      if (field.fieldOrder !== undefined) sanitized.fieldOrder = field.fieldOrder;
      if (field.header) sanitized.header = (field.header || '').trim();
      if (field.description) sanitized.description = (field.description || '').trim();
      if (field.reminder) sanitized.reminder = (field.reminder || '').trim();
      
      if ((field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && field.options && field.options.length > 0) {
        sanitized.options = field.options.filter((o) => o && o.label).map((o) => {
          const opt: { value: string; label: string; conditionalFields?: Array<{ type: string; label: string; placeholder?: string }> } = {
            value: String(o.value ?? '').trim().slice(0, 120),
            label: String(o.label || '').trim().slice(0, 120),
          };
          const condFields = Array.isArray(o.conditionalFields) ? o.conditionalFields : (o as { conditionalField?: { type: string; label: string; placeholder?: string; options?: Array<{ value: string; label: string }> } }).conditionalField ? [(o as { conditionalField: { type: string; label: string; placeholder?: string; options?: Array<{ value: string; label: string }> } }).conditionalField] : [];
          if (condFields.length > 0) {
            opt.conditionalFields = condFields
              .filter((cf) => cf && (cf.label || cf.type))
              .map((cf) => {
                const mapped: { type: string; label: string; placeholder?: string; options?: Array<{ value: string; label: string }> } = {
                  type: String(cf.type || 'text').trim().slice(0, 60),
                  label: String(cf.label || '').trim().slice(0, 200),
                  placeholder: cf.placeholder ? String(cf.placeholder).trim().slice(0, 200) : undefined,
                };
                const cfOpts = Array.isArray((cf as { options?: Array<{ value: string; label: string }> }).options) ? (cf as { options: Array<{ value: string; label: string }> }).options : [];
                if (cfOpts.length > 0) {
                  mapped.options = cfOpts
                    .filter((o2) => o2 && (o2.label || o2.value))
                    .map((o2) => ({
                      value: String(o2.value ?? o2.label ?? '').trim().slice(0, 200),
                      label: String(o2.label || o2.value || '').trim().slice(0, 200),
                    }));
                }
                return mapped;
              });
          }
          return opt;
        });
      }

      return sanitized;
    });

    // Validate form steps
    const formSteps = (createDto.formSteps || []).map((step) => {
      const sanitized: any = {
        index: step.index ?? 0,
        letter: (step.letter || '').trim().slice(0, 10),
        label: (step.label || '').trim().slice(0, 120),
      };

      if (step.buttonTexts) {
        sanitized.buttonTexts = {
          back: step.buttonTexts.back ? String(step.buttonTexts.back).trim().slice(0, 50) : undefined,
          next: step.buttonTexts.next ? String(step.buttonTexts.next).trim().slice(0, 50) : undefined,
          submit: step.buttonTexts.submit ? String(step.buttonTexts.submit).trim().slice(0, 50) : undefined,
          saveAsDraft: step.buttonTexts.saveAsDraft ? String(step.buttonTexts.saveAsDraft).trim().slice(0, 50) : undefined,
          cancel: step.buttonTexts.cancel ? String(step.buttonTexts.cancel).trim().slice(0, 50) : undefined,
        };
      }

      if (step.buttonVisibility) {
        sanitized.buttonVisibility = {
          back: step.buttonVisibility.back !== undefined ? Boolean(step.buttonVisibility.back) : undefined,
          next: step.buttonVisibility.next !== undefined ? Boolean(step.buttonVisibility.next) : undefined,
          submit: step.buttonVisibility.submit !== undefined ? Boolean(step.buttonVisibility.submit) : undefined,
          saveAsDraft: step.buttonVisibility.saveAsDraft !== undefined ? Boolean(step.buttonVisibility.saveAsDraft) : undefined,
          cancel: step.buttonVisibility.cancel !== undefined ? Boolean(step.buttonVisibility.cancel) : undefined,
        };
      }

      return sanitized;
    });

    // Sanitize button texts
    const buttonTexts = createDto.buttonTexts ? {
      back: createDto.buttonTexts.back ? String(createDto.buttonTexts.back).trim().slice(0, 50) : undefined,
      next: createDto.buttonTexts.next ? String(createDto.buttonTexts.next).trim().slice(0, 50) : undefined,
      submit: createDto.buttonTexts.submit ? String(createDto.buttonTexts.submit).trim().slice(0, 50) : undefined,
      saveAsDraft: createDto.buttonTexts.saveAsDraft ? String(createDto.buttonTexts.saveAsDraft).trim().slice(0, 50) : undefined,
      cancel: createDto.buttonTexts.cancel ? String(createDto.buttonTexts.cancel).trim().slice(0, 50) : undefined,
    } : undefined;

    // Sanitize button visibility
    const buttonVisibility = createDto.buttonVisibility ? {
      back: createDto.buttonVisibility.back !== undefined ? Boolean(createDto.buttonVisibility.back) : undefined,
      next: createDto.buttonVisibility.next !== undefined ? Boolean(createDto.buttonVisibility.next) : undefined,
      submit: createDto.buttonVisibility.submit !== undefined ? Boolean(createDto.buttonVisibility.submit) : undefined,
      saveAsDraft: createDto.buttonVisibility.saveAsDraft !== undefined ? Boolean(createDto.buttonVisibility.saveAsDraft) : undefined,
      cancel: createDto.buttonVisibility.cancel !== undefined ? Boolean(createDto.buttonVisibility.cancel) : undefined,
    } : undefined;

    const service = new this.customApplicationServiceModel({
      id,
      title: createDto.title.trim(),
      description: (createDto.description || '').trim(),
      icon: createDto.icon || 'FileText',
      color: createDto.color || 'bg-blue-500',
      visible: createDto.visible !== undefined ? Boolean(createDto.visible) : false,
      formFields,
      formSteps,
      buttonTexts,
      buttonVisibility,
      createdBy: userId ? (typeof userId === 'string' ? new Types.ObjectId(userId) : userId) : undefined,
      updatedBy: userId ? (typeof userId === 'string' ? new Types.ObjectId(userId) : userId) : undefined,
    });

    return service.save();
  }

  async findAll(visible?: boolean): Promise<CustomApplicationService[]> {
    const query: any = {};
    if (visible !== undefined) {
      query.visible = visible;
    }
    return this.customApplicationServiceModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<CustomApplicationService> {
    const service = await this.customApplicationServiceModel.findOne({ id }).exec();
    if (!service) {
      throw new NotFoundException(`Custom application service with ID "${id}" not found`);
    }
    return service;
  }

  /**
   * Returns service ids whose title contains the given text (case-insensitive).
   */
  async findIdsByTitleMatch(titlePattern: string): Promise<string[]> {
    if (!titlePattern || String(titlePattern).trim() === '') return [];
    const escaped = String(titlePattern).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const services = await this.customApplicationServiceModel
      .find({ title: { $regex: escaped, $options: 'i' } })
      .select('id')
      .lean()
      .exec();
    return (services as Array<{ id: string }>).map((s) => s.id);
  }

  /**
   * Returns a map of service id to title for the given ids (for admin list enrichment).
   */
  async findTitlesByIds(ids: string[]): Promise<Record<string, string>> {
    if (ids.length === 0) return {};
    const uniqueIds = [...new Set(ids.filter((id) => id != null && String(id).trim() !== ''))];
    const services = await this.customApplicationServiceModel
      .find({ id: { $in: uniqueIds } })
      .select('id title')
      .lean()
      .exec();
    return (services as Array<{ id: string; title: string }>).reduce(
      (acc, s) => {
        acc[s.id] = s.title;
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  async update(id: string, updateDto: UpdateCustomApplicationServiceDto, userId?: string | Types.ObjectId): Promise<CustomApplicationService> {
    const service = await this.customApplicationServiceModel.findOne({ id }).exec();
    if (!service) {
      throw new NotFoundException(`Custom application service with ID "${id}" not found`);
    }

    // Validate form fields if provided
    if (updateDto.formFields !== undefined) {
      const validFieldTypes = ['text', 'number', 'email', 'password', 'date', 'file', 'select', 'radio', 'checkbox', 'textarea', 'submit', 'reset'] as const;
      const formFields = updateDto.formFields.map((field) => {
        const fieldLabel = (field.label || '').trim();
        if (!fieldLabel) {
          throw new BadRequestException(`Field label is required`);
        }

        if (!validFieldTypes.includes(field.type as typeof validFieldTypes[number])) {
          throw new BadRequestException(`Invalid field type: ${field.type}`);
        }

        const sanitized: any = {
          type: field.type,
          label: fieldLabel,
          required: Boolean(field.required),
        };

        if (field.placeholder) sanitized.placeholder = (field.placeholder || '').trim();
        if (field.stepIndex !== undefined) sanitized.stepIndex = field.stepIndex;
        if (field.helpText) sanitized.helpText = (field.helpText || '').trim();
        if (field.fieldOrder !== undefined) sanitized.fieldOrder = field.fieldOrder;
        if (field.header) sanitized.header = (field.header || '').trim();
        if (field.description) sanitized.description = (field.description || '').trim();
        if (field.reminder) sanitized.reminder = (field.reminder || '').trim();
        
        if ((field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && field.options && field.options.length > 0) {
          sanitized.options = field.options.filter((o) => o && o.label).map((o) => {
            const opt: { value: string; label: string; conditionalFields?: Array<{ type: string; label: string; placeholder?: string }> } = {
              value: String(o.value ?? '').trim().slice(0, 120),
              label: String(o.label || '').trim().slice(0, 120),
            };
            const condFields = Array.isArray(o.conditionalFields) ? o.conditionalFields : (o as { conditionalField?: { type: string; label: string; placeholder?: string; options?: Array<{ value: string; label: string }> } }).conditionalField ? [(o as { conditionalField: { type: string; label: string; placeholder?: string; options?: Array<{ value: string; label: string }> } }).conditionalField] : [];
            if (condFields.length > 0) {
              opt.conditionalFields = condFields
                .filter((cf) => cf && (cf.label || cf.type))
                .map((cf) => {
                  const mapped: { type: string; label: string; placeholder?: string; options?: Array<{ value: string; label: string }> } = {
                    type: String(cf.type || 'text').trim().slice(0, 60),
                    label: String(cf.label || '').trim().slice(0, 200),
                    placeholder: cf.placeholder ? String(cf.placeholder).trim().slice(0, 200) : undefined,
                  };
                  const cfOpts = Array.isArray((cf as { options?: Array<{ value: string; label: string }> }).options) ? (cf as { options: Array<{ value: string; label: string }> }).options : [];
                  if (cfOpts.length > 0) {
                    mapped.options = cfOpts
                      .filter((o2) => o2 && (o2.label || o2.value))
                      .map((o2) => ({
                        value: String(o2.value ?? o2.label ?? '').trim().slice(0, 200),
                        label: String(o2.label || o2.value || '').trim().slice(0, 200),
                      }));
                  }
                  return mapped;
                });
            }
            return opt;
          });
        }

        return sanitized;
      });

      updateDto.formFields = formFields;
    }

    // Validate form steps if provided
    if (updateDto.formSteps !== undefined) {
      const formSteps = updateDto.formSteps.map((step) => {
        const sanitized: any = {
          index: step.index ?? 0,
          letter: (step.letter || '').trim().slice(0, 10),
          label: (step.label || '').trim().slice(0, 120),
        };

        if (step.buttonTexts) {
          sanitized.buttonTexts = {
            back: step.buttonTexts.back ? String(step.buttonTexts.back).trim().slice(0, 50) : undefined,
            next: step.buttonTexts.next ? String(step.buttonTexts.next).trim().slice(0, 50) : undefined,
            submit: step.buttonTexts.submit ? String(step.buttonTexts.submit).trim().slice(0, 50) : undefined,
            saveAsDraft: step.buttonTexts.saveAsDraft ? String(step.buttonTexts.saveAsDraft).trim().slice(0, 50) : undefined,
            cancel: step.buttonTexts.cancel ? String(step.buttonTexts.cancel).trim().slice(0, 50) : undefined,
          };
        }

        if (step.buttonVisibility) {
          sanitized.buttonVisibility = {
            back: step.buttonVisibility.back !== undefined ? Boolean(step.buttonVisibility.back) : undefined,
            next: step.buttonVisibility.next !== undefined ? Boolean(step.buttonVisibility.next) : undefined,
            submit: step.buttonVisibility.submit !== undefined ? Boolean(step.buttonVisibility.submit) : undefined,
            saveAsDraft: step.buttonVisibility.saveAsDraft !== undefined ? Boolean(step.buttonVisibility.saveAsDraft) : undefined,
            cancel: step.buttonVisibility.cancel !== undefined ? Boolean(step.buttonVisibility.cancel) : undefined,
          };
        }

        return sanitized;
      });

      updateDto.formSteps = formSteps;
    }

    // Sanitize button texts if provided
    if (updateDto.buttonTexts) {
      updateDto.buttonTexts = {
        back: updateDto.buttonTexts.back ? String(updateDto.buttonTexts.back).trim().slice(0, 50) : undefined,
        next: updateDto.buttonTexts.next ? String(updateDto.buttonTexts.next).trim().slice(0, 50) : undefined,
        submit: updateDto.buttonTexts.submit ? String(updateDto.buttonTexts.submit).trim().slice(0, 50) : undefined,
        saveAsDraft: updateDto.buttonTexts.saveAsDraft ? String(updateDto.buttonTexts.saveAsDraft).trim().slice(0, 50) : undefined,
        cancel: updateDto.buttonTexts.cancel ? String(updateDto.buttonTexts.cancel).trim().slice(0, 50) : undefined,
      };
    }

    // Sanitize button visibility if provided
    if (updateDto.buttonVisibility) {
      updateDto.buttonVisibility = {
        back: updateDto.buttonVisibility.back !== undefined ? Boolean(updateDto.buttonVisibility.back) : undefined,
        next: updateDto.buttonVisibility.next !== undefined ? Boolean(updateDto.buttonVisibility.next) : undefined,
        submit: updateDto.buttonVisibility.submit !== undefined ? Boolean(updateDto.buttonVisibility.submit) : undefined,
        saveAsDraft: updateDto.buttonVisibility.saveAsDraft !== undefined ? Boolean(updateDto.buttonVisibility.saveAsDraft) : undefined,
        cancel: updateDto.buttonVisibility.cancel !== undefined ? Boolean(updateDto.buttonVisibility.cancel) : undefined,
      };
    }

    if (updateDto.title) {
      updateDto.title = updateDto.title.trim();
    }
    if (updateDto.description !== undefined) {
      updateDto.description = (updateDto.description || '').trim();
    }
    if (updateDto.icon) {
      updateDto.icon = updateDto.icon.trim();
    }
    if (updateDto.color) {
      updateDto.color = updateDto.color.trim();
    }

    Object.assign(service, updateDto);
    if (userId) {
      service.updatedBy = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    }

    return service.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.customApplicationServiceModel.deleteOne({ id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Custom application service with ID "${id}" not found`);
    }
  }

  async updateVisible(id: string, visible: boolean, userId?: string | Types.ObjectId): Promise<CustomApplicationService> {
    const service = await this.findOne(id);
    service.visible = visible;
    if (userId) {
      service.updatedBy = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    }
    return service.save();
  }
}
