import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CustomApplicationFormSubmission,
  CustomApplicationFormSubmissionDocument,
  CustomApplicationFormSubmissionStatus,
  CustomApplicationFormSubmissionAdminStatus,
} from './schemas/custom-application-form-submission.schema';
import { CreateCustomApplicationFormSubmissionDto } from './dto/create-custom-application-form-submission.dto';
import { UpdateCustomApplicationFormSubmissionDto } from './dto/update-custom-application-form-submission.dto';
import { UpdateAdminStatusDto } from './dto/update-admin-status.dto';
import { EmailService } from '../auth/services/email.service';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { CustomApplicationServicesService } from '../custom-application-services/custom-application-services.service';

export interface ListCustomApplicationFormSubmissionsOptions {
  userId?: string;
  customApplicationServiceId?: string;
  status?: CustomApplicationFormSubmissionStatus;
  page?: number;
  limit?: number;
}

export interface AdminListCustomApplicationFormSubmissionsOptions {
  userId?: string;
  customApplicationServiceId?: string;
  status?: CustomApplicationFormSubmissionStatus;
  adminStatus?: CustomApplicationFormSubmissionAdminStatus;
  /** Search by application ID, user ID, or form title (resolved server-side) */
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListCustomApplicationFormSubmissionsResult {
  items: CustomApplicationFormSubmissionDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class CustomApplicationFormSubmissionsService {
  constructor(
    @InjectModel(CustomApplicationFormSubmission.name)
    private readonly customApplicationFormSubmissionModel: Model<CustomApplicationFormSubmissionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly emailService: EmailService,
    private readonly customApplicationServicesService: CustomApplicationServicesService,
  ) {}

  async create(
    userId: string,
    dto: CreateCustomApplicationFormSubmissionDto,
  ): Promise<CustomApplicationFormSubmissionDocument> {
    const doc = await this.customApplicationFormSubmissionModel.create({
      userId: new Types.ObjectId(userId),
      customApplicationServiceId: dto.customApplicationServiceId.trim(),
      status: dto.status ?? 'draft',
      adminStatus: dto.status === 'submitted' ? 'pending' : undefined,
      formData: dto.formData ?? {},
    });
    return doc;
  }

  async list(
    options: ListCustomApplicationFormSubmissionsOptions,
  ): Promise<ListCustomApplicationFormSubmissionsResult> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    // userId is required for user endpoints, optional for admin
    if (options.userId) filter.userId = new Types.ObjectId(options.userId);
    if (options.customApplicationServiceId) filter.customApplicationServiceId = options.customApplicationServiceId;
    if (options.status) filter.status = options.status;
    if ((options as AdminListCustomApplicationFormSubmissionsOptions).adminStatus !== undefined) {
      filter.adminStatus = (options as AdminListCustomApplicationFormSubmissionsOptions).adminStatus;
    }
    const [rawItems, total] = await Promise.all([
      this.customApplicationFormSubmissionModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.customApplicationFormSubmissionModel.countDocuments(filter).exec(),
    ]);
    const items = (rawItems as Array<Record<string, unknown>>).map((i) => ({
      ...i,
      id: (i._id as { toString: () => string }).toString(),
    }));
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async adminList(
    options: AdminListCustomApplicationFormSubmissionsOptions,
  ): Promise<ListCustomApplicationFormSubmissionsResult> {
    const listOptions = { ...options };
    delete listOptions.search;
    if (options.search && String(options.search).trim() !== '') {
      const search = String(options.search).trim();
      if (Types.ObjectId.isValid(search) && search.length === 24) {
        return this.adminListWithSearchByIdOrUserId(search, options);
      }
      const serviceIds = await this.customApplicationServicesService.findIdsByTitleMatch(search);
      if (serviceIds.length === 0) {
        return this.adminListEnrichResult({ items: [], total: 0, page: options.page ?? 1, limit: options.limit ?? 20 });
      }
      if (serviceIds.length === 1) {
        listOptions.customApplicationServiceId = serviceIds[0];
      } else {
        return this.adminListWithSearchByServiceIds(serviceIds, options);
      }
    }
    const result = await this.list(listOptions);
    const serviceIds = [
      ...new Set(
        (result.items as Array<Record<string, unknown>>)
          .map((i) => (i.customApplicationServiceId != null ? String(i.customApplicationServiceId).trim() : ''))
          .filter((id) => id !== ''),
      ),
    ];
    const titleMap = await this.customApplicationServicesService.findTitlesByIds(serviceIds);
    result.items = (result.items as Array<Record<string, unknown>>).map((item) => {
      const serviceId = item.customApplicationServiceId != null ? String(item.customApplicationServiceId).trim() : '';
      const title = serviceId ? (titleMap[serviceId] ?? null) : null;
      return { ...item, customApplicationServiceTitle: title };
    }) as typeof result.items;
    return result;
  }

  private async adminListWithSearchByIdOrUserId(
    objectIdStr: string,
    options: AdminListCustomApplicationFormSubmissionsOptions,
  ): Promise<ListCustomApplicationFormSubmissionsResult> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {
      $or: [{ _id: new Types.ObjectId(objectIdStr) }, { userId: new Types.ObjectId(objectIdStr) }],
    };
    if (options.status) filter.status = options.status;
    if (options.adminStatus !== undefined) filter.adminStatus = options.adminStatus;
    const [rawItems, total] = await Promise.all([
      this.customApplicationFormSubmissionModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.customApplicationFormSubmissionModel.countDocuments(filter).exec(),
    ]);
    const items = (rawItems as Array<Record<string, unknown>>).map((i) => ({
      ...i,
      id: (i._id as { toString: () => string }).toString(),
    }));
    return this.adminListEnrichResult({ items, total, page, limit });
  }

  private async adminListWithSearchByServiceIds(
    serviceIds: string[],
    options: AdminListCustomApplicationFormSubmissionsOptions,
  ): Promise<ListCustomApplicationFormSubmissionsResult> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = { customApplicationServiceId: { $in: serviceIds } };
    if (options.status) filter.status = options.status;
    if (options.adminStatus !== undefined) filter.adminStatus = options.adminStatus;
    const [rawItems, total] = await Promise.all([
      this.customApplicationFormSubmissionModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.customApplicationFormSubmissionModel.countDocuments(filter).exec(),
    ]);
    const items = (rawItems as Array<Record<string, unknown>>).map((i) => ({
      ...i,
      id: (i._id as { toString: () => string }).toString(),
    }));
    return this.adminListEnrichResult({ items, total, page, limit });
  }

  private async adminListEnrichResult(
    raw: { items: Array<Record<string, unknown>>; total: number; page: number; limit: number },
  ): Promise<ListCustomApplicationFormSubmissionsResult> {
    const serviceIds = [
      ...new Set(
        raw.items
          .map((i) => (i.customApplicationServiceId != null ? String(i.customApplicationServiceId).trim() : ''))
          .filter((id) => id !== ''),
      ),
    ];
    const titleMap = await this.customApplicationServicesService.findTitlesByIds(serviceIds);
    const items = raw.items.map((item) => {
      const serviceId = item.customApplicationServiceId != null ? String(item.customApplicationServiceId).trim() : '';
      const title = serviceId ? (titleMap[serviceId] ?? null) : null;
      return { ...item, customApplicationServiceTitle: title };
    });
    return {
      items: items as unknown as typeof raw.items,
      total: raw.total,
      page: raw.page,
      limit: raw.limit,
      totalPages: Math.ceil(raw.total / raw.limit),
    };
  }

  async adminFindOne(id: string): Promise<CustomApplicationFormSubmissionDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Submission not found');
    }
    const doc = await this.customApplicationFormSubmissionModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException('Submission not found');
    }
    return doc;
  }

  async findOne(id: string, userId: string): Promise<CustomApplicationFormSubmissionDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Submission not found');
    }
    const doc = await this.customApplicationFormSubmissionModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException('Submission not found');
    }
    if (doc.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return doc;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateCustomApplicationFormSubmissionDto,
  ): Promise<CustomApplicationFormSubmissionDocument> {
    const doc = await this.findOne(id, userId);
    if (dto.status !== undefined) {
      doc.status = dto.status;
      // When user submits, set admin status to pending if not already set
      if (dto.status === 'submitted' && !doc.adminStatus) {
        doc.adminStatus = 'pending';
      }
      // If changing back to draft, clear admin status
      if (dto.status === 'draft') {
        doc.adminStatus = undefined;
        doc.adminNotes = undefined;
      }
    }
    if (dto.formData !== undefined) doc.formData = dto.formData;
    await doc.save();
    return doc;
  }

  async remove(id: string, userId: string): Promise<void> {
    const doc = await this.findOne(id, userId);
    await this.customApplicationFormSubmissionModel.deleteOne({ _id: doc._id }).exec();
  }

  async updateAdminStatus(
    id: string,
    dto: UpdateAdminStatusDto,
  ): Promise<CustomApplicationFormSubmissionDocument> {
    const doc = await this.adminFindOne(id);
    
    // Only allow admin status updates for submitted applications
    if (doc.status !== 'submitted') {
      throw new ForbiddenException('Admin status can only be updated for submitted applications');
    }

    const oldStatus = doc.adminStatus;
    doc.adminStatus = dto.adminStatus;
    if (dto.adminNotes !== undefined) {
      doc.adminNotes = dto.adminNotes;
    }
    await doc.save();

    // Send email notification if status changed
    if (oldStatus !== dto.adminStatus) {
      await this.sendStatusUpdateEmail(doc, oldStatus || 'pending', dto.adminStatus);
    }

    return doc;
  }

  private async sendStatusUpdateEmail(
    submission: CustomApplicationFormSubmissionDocument,
    oldStatus: CustomApplicationFormSubmissionAdminStatus,
    newStatus: CustomApplicationFormSubmissionAdminStatus,
  ): Promise<void> {
    try {
      const user = await this.userModel.findById(submission.userId).lean().exec();
      if (!user || !user.email) {
        return;
      }

      const statusMessages: Record<CustomApplicationFormSubmissionAdminStatus, { subject: string; message: string; color: string }> = {
        pending: {
          subject: 'Application Received - Under Review',
          message: 'Your application has been received and is pending review.',
          color: '#f59e0b',
        },
        reviewing: {
          subject: 'Application Under Review',
          message: 'Your application is currently being reviewed by our team.',
          color: '#3b82f6',
        },
        rejected: {
          subject: 'Application Status Update',
          message: 'Unfortunately, your application has been rejected.',
          color: '#ef4444',
        },
        approved: {
          subject: 'Application Approved!',
          message: 'Congratulations! Your application has been approved.',
          color: '#10b981',
        },
      };

      const statusInfo = statusMessages[newStatus];
      const userName = user.firstName || 'Valued Customer';
      const serviceTitle = submission.customApplicationServiceId || 'Application';

      const html = this.emailService.buildBrandedEmailHtml(
        {
          title: statusInfo.subject,
          preheader: statusInfo.message,
          contentHtml: `
            <h2 style="margin-top:0;color:#1e293b;">Hello ${userName}!</h2>
            <p style="color:#475569;line-height:1.6;">
              ${statusInfo.message}
            </p>
            <div style="background:${statusInfo.color}15;border-left:4px solid ${statusInfo.color};padding:16px;border-radius:6px;margin:20px 0;">
              <div style="font-weight:600;color:#1e293b;margin-bottom:8px;">Application Details:</div>
              <div style="color:#475569;font-size:14px;">
                <div><strong>Application Type:</strong> ${serviceTitle}</div>
                <div style="margin-top:8px;"><strong>Status:</strong> <span style="color:${statusInfo.color};font-weight:600;text-transform:capitalize;">${newStatus}</span></div>
                <div style="margin-top:8px;"><strong>Application ID:</strong> ${submission._id}</div>
                ${submission.adminNotes ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;"><strong>Admin Notes:</strong><br><div style="margin-top:4px;color:#64748b;">${submission.adminNotes}</div></div>` : ''}
              </div>
            </div>
            <p style="color:#475569;line-height:1.6;">
              ${newStatus === 'approved' 
                ? 'You can now proceed with the next steps. If you have any questions, please contact our support team.' 
                : newStatus === 'rejected' 
                  ? 'If you have any questions about this decision or would like to appeal, please contact our support team.' 
                  : 'We will notify you once there are any updates to your application.'}
            </p>
            <p style="color:#475569;line-height:1.6;margin-top:24px;">
              Best regards,<br>
              <strong>LGU Payment System Team</strong>
            </p>
          `,
        },
        undefined, // Will use default branding
      );

      await this.emailService.sendEmail({
        to: user.email,
        subject: statusInfo.subject,
        html,
      });
    } catch (error) {
      // Log error but don't fail the status update
      console.error('Failed to send status update email:', error);
    }
  }
}
