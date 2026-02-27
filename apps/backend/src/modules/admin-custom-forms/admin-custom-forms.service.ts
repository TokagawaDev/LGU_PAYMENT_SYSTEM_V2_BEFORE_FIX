import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AdminCustomForm,
  AdminCustomFormDocument,
  AdminCustomFormField,
} from './schemas/admin-custom-form.schema';
import {
  AdminCustomFormSubmission,
  AdminCustomFormSubmissionDocument,
} from './schemas/admin-custom-form-submission.schema';
import { CreateAdminCustomFormDto } from './dto/create-admin-custom-form.dto';
import { UpdateAdminCustomFormDto } from './dto/update-admin-custom-form.dto';
import { CreateFormSubmissionDto } from './dto/create-form-submission.dto';
import { UpdateFormSubmissionDto } from './dto/update-form-submission.dto';

const VALID_FIELD_TYPES = [
  'text',
  'number',
  'email',
  'password',
  'date',
  'file',
  'select',
  'radio',
  'checkbox',
  'textarea',
  'submit',
  'reset',
] as const;

function sanitizeFormFields(
  fields: CreateAdminCustomFormDto['formFields'],
): AdminCustomFormField[] {
  if (!Array.isArray(fields)) return [];
  return fields
    .filter((f) => f && VALID_FIELD_TYPES.includes(f.type as (typeof VALID_FIELD_TYPES)[number]))
    .map((f) => ({
      type: f.type,
      label: String(f.label ?? '').trim().slice(0, 120) || 'Field',
      placeholder: String(f.placeholder ?? '').trim().slice(0, 200),
      required: Boolean(f.required),
      options: Array.isArray(f.options)
        ? f.options
            .map((o) => ({
              value: String(o?.value ?? '').trim().slice(0, 120),
              label: String(o?.label ?? '').trim().slice(0, 120),
            }))
            .filter((o) => o.value !== '' || o.label !== '')
        : [],
      validation:
        f.validation && typeof f.validation === 'object'
          ? {
              min: typeof f.validation.min === 'number' ? f.validation.min : undefined,
              max: typeof f.validation.max === 'number' ? f.validation.max : undefined,
              pattern: typeof f.validation.pattern === 'string' ? f.validation.pattern.slice(0, 500) : undefined,
              message: typeof f.validation.message === 'string' ? f.validation.message.slice(0, 200) : undefined,
            }
          : undefined,
    }));
}

@Injectable()
export class AdminCustomFormsService {
  constructor(
    @InjectModel(AdminCustomForm.name)
    private readonly formModel: Model<AdminCustomFormDocument>,
    @InjectModel(AdminCustomFormSubmission.name)
    private readonly submissionModel: Model<AdminCustomFormSubmissionDocument>,
  ) {}

  async create(
    userId: string,
    dto: CreateAdminCustomFormDto,
  ): Promise<AdminCustomFormDocument> {
    const doc = await this.formModel.create({
      userId: new Types.ObjectId(userId),
      title: String(dto.title ?? '').trim().slice(0, 120) || 'Untitled form',
      description: String(dto.description ?? '').trim().slice(0, 400),
      status: dto.status ?? 'draft',
      formFields: sanitizeFormFields(dto.formFields),
    });
    return doc;
  }

  async list(
    userId: string,
    status?: 'draft' | 'published',
  ): Promise<Array<AdminCustomFormDocument & { id: string }>> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (status) filter.status = status;
    const list = await this.formModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    return (list as Array<Record<string, unknown> & { _id: Types.ObjectId }>).map(
      (item) => ({ ...item, id: item._id.toString() })
    ) as Array<AdminCustomFormDocument & { id: string }>;
  }

  async listPublished(): Promise<Array<AdminCustomFormDocument & { id: string }>> {
    const list = await this.formModel
      .find({ status: 'published' })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    return (list as Array<Record<string, unknown> & { _id: Types.ObjectId }>).map(
      (item) => ({ ...item, id: item._id.toString() })
    ) as Array<AdminCustomFormDocument & { id: string }>;
  }

  async findOnePublished(id: string): Promise<AdminCustomFormDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Form not found');
    }
    const doc = await this.formModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException('Form not found');
    }
    if (doc.status !== 'published') {
      throw new NotFoundException('Form not found');
    }
    return doc;
  }

  async findOne(id: string, userId: string): Promise<AdminCustomFormDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Form not found');
    }
    const doc = await this.formModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException('Form not found');
    }
    if (doc.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return doc;
  }

  async findOnePublic(id: string): Promise<AdminCustomFormDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.formModel
      .findOne({ _id: new Types.ObjectId(id), status: 'published' })
      .exec();
    return doc;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateAdminCustomFormDto,
  ): Promise<AdminCustomFormDocument> {
    const doc = await this.findOne(id, userId);
    if (dto.title !== undefined)
      doc.title = String(dto.title).trim().slice(0, 120) || doc.title;
    if (dto.description !== undefined)
      doc.description = String(dto.description).trim().slice(0, 400);
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.formFields !== undefined) doc.formFields = sanitizeFormFields(dto.formFields);
    await doc.save();
    return doc;
  }

  async remove(id: string, userId: string): Promise<void> {
    const doc = await this.findOne(id, userId);
    await this.submissionModel.deleteMany({ adminFormId: doc._id }).exec();
    await this.formModel.deleteOne({ _id: doc._id }).exec();
  }

  // Submissions
  async createSubmission(
    formId: string,
    userId: string,
    dto: CreateFormSubmissionDto,
  ): Promise<AdminCustomFormSubmissionDocument> {
    const form = await this.findOne(formId, userId);
    const doc = await this.submissionModel.create({
      userId: new Types.ObjectId(userId),
      adminFormId: form._id,
      status: dto.status ?? 'draft',
      formData: dto.formData ?? {},
    });
    return doc;
  }

  async listSubmissions(
    formId: string,
    userId: string,
    status?: 'draft' | 'submitted',
  ): Promise<Array<AdminCustomFormSubmissionDocument & { id: string }>> {
    const form = await this.findOne(formId, userId);
    const filter: Record<string, unknown> = {
      adminFormId: form._id,
      userId: new Types.ObjectId(userId),
    };
    if (status) filter.status = status;
    const list = await this.submissionModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    return (list as Array<Record<string, unknown> & { _id: Types.ObjectId }>).map(
      (s) => ({ ...s, id: s._id.toString() })
    ) as Array<AdminCustomFormSubmissionDocument & { id: string }>;
  }

  async findOneSubmission(
    formId: string,
    submissionId: string,
    userId: string,
  ): Promise<AdminCustomFormSubmissionDocument> {
    await this.findOne(formId, userId);
    if (!Types.ObjectId.isValid(submissionId)) {
      throw new NotFoundException('Submission not found');
    }
    const doc = await this.submissionModel.findById(submissionId).exec();
    if (!doc || doc.userId.toString() !== userId) {
      throw new NotFoundException('Submission not found');
    }
    return doc;
  }

  async updateSubmission(
    formId: string,
    submissionId: string,
    userId: string,
    dto: UpdateFormSubmissionDto,
  ): Promise<AdminCustomFormSubmissionDocument> {
    const doc = await this.findOneSubmission(formId, submissionId, userId);
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.formData !== undefined) doc.formData = dto.formData;
    await doc.save();
    return doc;
  }

  async removeSubmission(
    formId: string,
    submissionId: string,
    userId: string,
  ): Promise<void> {
    const doc = await this.findOneSubmission(formId, submissionId, userId);
    await this.submissionModel.deleteOne({ _id: doc._id }).exec();
  }
}
