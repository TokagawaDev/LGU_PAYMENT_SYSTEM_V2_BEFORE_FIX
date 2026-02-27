import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Settings, SettingsDocument, ServiceFormConfig } from './schemas/settings.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SERVICE_IDS, ServiceId } from '@shared/constants/services';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name) private readonly settingsModel: Model<SettingsDocument>,
  ) {}

  async getOrCreateSettings(): Promise<SettingsDocument> {
    const existing = await this.settingsModel.findOne();
    if (existing) {
      return existing;
    }
    const created = new this.settingsModel({});
    const saved = await created.save();
    return saved;
  }


  async getPublicSettings(): Promise<SettingsDocument> {
    const settings = await this.settingsModel.findOne();
    if (!settings) {
      return this.getOrCreateSettings();
    }
    return settings;
  }

  async updateSettings(update: UpdateSettingsDto, updatedBy?: string): Promise<SettingsDocument> {
    const settings = await this.getOrCreateSettings();

    if (update.city) {
      settings.city = {
        name: update.city.name ?? settings.city.name,
        fullName: update.city.fullName ?? settings.city.fullName,
      };
    }

    if (update.branding) {
      settings.branding = {
        systemName: update.branding.systemName ?? settings.branding.systemName,
        systemDescription: update.branding.systemDescription ?? settings.branding.systemDescription,
      };
    }

    if (update.assets) {
      settings.assets = {
        headerBackgroundUrl: update.assets.headerBackgroundUrl ?? settings.assets.headerBackgroundUrl,
        sealLogoUrl: update.assets.sealLogoUrl ?? settings.assets.sealLogoUrl,
        faviconUrl: update.assets.faviconUrl ?? settings.assets.faviconUrl,
      };
    }

    if (update.contact) {
      settings.contact = {
        address: update.contact.address ?? settings.contact?.address ?? '',
        phone: update.contact.phone ?? settings.contact?.phone ?? '',
        email: update.contact.email ?? settings.contact?.email ?? '',
        website: update.contact.website ?? settings.contact?.website ?? '',
      };
    }

    if (update.faq) {
      settings.faq = update.faq.map((item) => ({
        question: item.question,
        answer: item.answer,
        category: item.category,
      }));
    }

    if (update.enabledServices) {
      // Initialize enabledServices if it doesn't exist
      if (!settings.enabledServices) {
        settings.enabledServices = new Map();
        Object.values(SERVICE_IDS).forEach((serviceId) => {
          settings.enabledServices.set(serviceId, true);
        });
      }

      // Update enabled services
      Object.entries(update.enabledServices).forEach(([serviceId, enabled]) => {
        if (Object.values(SERVICE_IDS).includes(serviceId as ServiceId)) {
          settings.enabledServices.set(serviceId as ServiceId, enabled);
        }
      });
    }

    if (update.customPaymentServices !== undefined) {
      const slugify = (s: string): string =>
        String(s)
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 80) || 'payment';
      const validFieldTypes = ['text', 'email', 'tel', 'number', 'select', 'textarea', 'file', 'date', 'cost', 'password', 'radio', 'checkbox'] as const;
      settings.customPaymentServices = update.customPaymentServices.map((item) => {
        const serviceId = slugify(String(item.id ?? '').trim() || String(item.title ?? '').trim());
        const title = String(item.title ?? '').trim().slice(0, 120) || 'Payment Service';
        const description = String(item.description ?? '').trim().slice(0, 400);
        const baseAmount = typeof item.baseAmount === 'number' && isFinite(item.baseAmount) ? Math.max(0, item.baseAmount) : 0;
        const processingFee = typeof item.processingFee === 'number' && isFinite(item.processingFee) ? Math.max(0, item.processingFee) : 0;
        const enabled = item.enabled !== undefined ? Boolean(item.enabled) : true;

        const formFields = Array.isArray(item.formFields)
          ? item.formFields
            .filter((f) => f && validFieldTypes.includes(f.type as typeof validFieldTypes[number]))
            .map((f) => {
              const fieldId = slugify(String(f.id ?? '').trim() || String(f.label ?? '').trim());
              const fieldLabel = String(f.label ?? '').trim().slice(0, 120) || 'Field';
              const fieldPlaceholder = String(f.placeholder ?? '').trim().slice(0, 200);
              const fieldReminder = String(f.reminder ?? '').trim().slice(0, 200);
              const fieldRequired = Boolean(f.required);
              
              const fieldOptions = Array.isArray(f.options) && f.options.length > 0
                ? f.options
                    .filter((opt) => opt && opt.value && opt.label)
                    .map((opt) => ({
                      value: String(opt.value).trim().slice(0, 100),
                      label: String(opt.label).trim().slice(0, 100),
                    }))
                : undefined;

              const validation = f.validation
                ? {
                    min: typeof f.validation.min === 'number' && isFinite(f.validation.min) ? Math.max(0, f.validation.min) : undefined,
                    max: typeof f.validation.max === 'number' && isFinite(f.validation.max) ? Math.max(0, f.validation.max) : undefined,
                    pattern: String(f.validation.pattern ?? '').trim().slice(0, 200) || undefined,
                    message: String(f.validation.message ?? '').trim().slice(0, 160) || undefined,
                  }
                : undefined;

              return {
                id: fieldId,
                label: fieldLabel,
                type: f.type,
                required: fieldRequired,
                placeholder: fieldPlaceholder || undefined,
                reminder: fieldReminder || undefined,
                options: fieldOptions,
                validation: validation && (validation.min !== undefined || validation.max !== undefined || validation.pattern || validation.message) ? validation : undefined,
              };
            })
          : [];

        return {
          id: serviceId,
          title,
          description,
          baseAmount,
          processingFee,
          enabled,
          formFields,
        };
      });
    }

    if (update.addOnServices !== undefined) {
      const slugify = (s: string): string =>
        String(s)
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 80) || 'addon';
      const validFieldTypes = ['text', 'number', 'email', 'password', 'date', 'file', 'select', 'radio', 'checkbox', 'textarea', 'submit', 'reset'] as const;
      settings.addOnServices = update.addOnServices.map((item) => {
        // Ensure visible defaults to true if not provided
        // Only set visible if explicitly provided, otherwise use default from schema
        const formFields = Array.isArray(item.formFields)
          ? item.formFields
            .filter((f) => f && validFieldTypes.includes(f.type as typeof validFieldTypes[number]))
            .map((f) => ({
              type: f.type,
              label: String(f.label ?? '').trim().slice(0, 120) || 'Field',
              placeholder: String(f.placeholder ?? '').trim().slice(0, 200),
              required: Boolean(f.required),
              stepIndex: typeof f.stepIndex === 'number' ? f.stepIndex : undefined,
              helpText: typeof f.helpText === 'string' ? String(f.helpText).trim().slice(0, 200) : undefined,
              fieldOrder: typeof f.fieldOrder === 'number' ? f.fieldOrder : undefined,
              header: typeof f.header === 'string' ? String(f.header).trim().slice(0, 200) : undefined,
              reminder: typeof f.reminder === 'string' ? String(f.reminder).trim().slice(0, 200) : undefined,
              options: Array.isArray(f.options)
                ? f.options.map((o) => ({
                    value: String(o?.value ?? '').trim().slice(0, 120),
                    label: String(o?.label ?? '').trim().slice(0, 120),
                  })).filter((o) => o.value !== '' || o.label !== '')
                : [],
            }))
          : [];
        const formSteps = Array.isArray(item.formSteps)
          ? item.formSteps
            .map((s) => {
              const stepButtonTexts = s.buttonTexts && typeof s.buttonTexts === 'object'
                ? {
                    back: typeof s.buttonTexts.back === 'string' ? String(s.buttonTexts.back).trim().slice(0, 50) : undefined,
                    next: typeof s.buttonTexts.next === 'string' ? String(s.buttonTexts.next).trim().slice(0, 50) : undefined,
                    submit: typeof s.buttonTexts.submit === 'string' ? String(s.buttonTexts.submit).trim().slice(0, 50) : undefined,
                    saveAsDraft: typeof s.buttonTexts.saveAsDraft === 'string' ? String(s.buttonTexts.saveAsDraft).trim().slice(0, 50) : undefined,
                    cancel: typeof s.buttonTexts.cancel === 'string' ? String(s.buttonTexts.cancel).trim().slice(0, 50) : undefined,
                  }
                : undefined;

              const stepButtonVisibility = s.buttonVisibility && typeof s.buttonVisibility === 'object'
                ? {
                    back: typeof s.buttonVisibility.back === 'boolean' ? s.buttonVisibility.back : undefined,
                    next: typeof s.buttonVisibility.next === 'boolean' ? s.buttonVisibility.next : undefined,
                    submit: typeof s.buttonVisibility.submit === 'boolean' ? s.buttonVisibility.submit : undefined,
                    saveAsDraft: typeof s.buttonVisibility.saveAsDraft === 'boolean' ? s.buttonVisibility.saveAsDraft : undefined,
                    cancel: typeof s.buttonVisibility.cancel === 'boolean' ? s.buttonVisibility.cancel : undefined,
                  }
                : undefined;

              return {
                index: typeof s.index === 'number' ? s.index : 0,
                letter: String(s.letter ?? '').trim().slice(0, 10) || 'A',
                label: String(s.label ?? '').trim().slice(0, 120) || 'Step',
                buttonTexts: stepButtonTexts && (stepButtonTexts.back || stepButtonTexts.next || stepButtonTexts.submit || stepButtonTexts.saveAsDraft || stepButtonTexts.cancel) ? stepButtonTexts : undefined,
                buttonVisibility: stepButtonVisibility && (stepButtonVisibility.back !== undefined || stepButtonVisibility.next !== undefined || stepButtonVisibility.submit !== undefined || stepButtonVisibility.saveAsDraft !== undefined || stepButtonVisibility.cancel !== undefined) ? stepButtonVisibility : undefined,
              };
            })
            .sort((a, b) => a.index - b.index)
          : [];
        const buttonTexts = item.buttonTexts && typeof item.buttonTexts === 'object'
          ? {
              back: typeof item.buttonTexts.back === 'string' ? String(item.buttonTexts.back).trim().slice(0, 50) : undefined,
              next: typeof item.buttonTexts.next === 'string' ? String(item.buttonTexts.next).trim().slice(0, 50) : undefined,
              submit: typeof item.buttonTexts.submit === 'string' ? String(item.buttonTexts.submit).trim().slice(0, 50) : undefined,
              saveAsDraft: typeof item.buttonTexts.saveAsDraft === 'string' ? String(item.buttonTexts.saveAsDraft).trim().slice(0, 50) : undefined,
              cancel: typeof item.buttonTexts.cancel === 'string' ? String(item.buttonTexts.cancel).trim().slice(0, 50) : undefined,
            }
          : undefined;

        const buttonVisibility = item.buttonVisibility && typeof item.buttonVisibility === 'object'
          ? {
              back: typeof item.buttonVisibility.back === 'boolean' ? item.buttonVisibility.back : undefined,
              next: typeof item.buttonVisibility.next === 'boolean' ? item.buttonVisibility.next : undefined,
              submit: typeof item.buttonVisibility.submit === 'boolean' ? item.buttonVisibility.submit : undefined,
              saveAsDraft: typeof item.buttonVisibility.saveAsDraft === 'boolean' ? item.buttonVisibility.saveAsDraft : undefined,
              cancel: typeof item.buttonVisibility.cancel === 'boolean' ? item.buttonVisibility.cancel : undefined,
            }
          : undefined;
        const result: any = {
          id: slugify(item.id),
          title: String(item.title ?? '').trim().slice(0, 120) || 'Add-on',
          description: String(item.description ?? '').trim().slice(0, 400),
          icon: String(item.icon ?? 'FileText').trim().slice(0, 60) || 'FileText',
          color: String(item.color ?? 'bg-blue-500').trim().slice(0, 60) || 'bg-blue-500',
          formFields,
          formSteps: formSteps.length > 0 ? formSteps : undefined,
          buttonTexts: buttonTexts && (buttonTexts.back || buttonTexts.next || buttonTexts.submit || buttonTexts.saveAsDraft || buttonTexts.cancel) ? buttonTexts : undefined,
          buttonVisibility: buttonVisibility && (buttonVisibility.back !== undefined || buttonVisibility.next !== undefined || buttonVisibility.submit !== undefined || buttonVisibility.saveAsDraft !== undefined || buttonVisibility.cancel !== undefined) ? buttonVisibility : undefined,
        };
        
        // Persist visible so citizen portal can filter (default hidden)
        result.visible = (item as any).visible === true;
        
        return result;
      });
    }

    if (updatedBy) {
      settings.updatedBy = new Types.ObjectId(updatedBy);
    }

    await settings.save();
    return settings;
  }

  async getEnabledServices(): Promise<ServiceId[]> {
    const settings = await this.getOrCreateSettings();
    const enabledServices: ServiceId[] = [];

    if (settings.enabledServices) {
      Object.values(SERVICE_IDS).forEach((serviceId) => {
        if (settings.enabledServices.get(serviceId) !== false) {
          enabledServices.push(serviceId);
        }
      });
    } else {
      // If no settings exist, return all services as enabled
      enabledServices.push(...Object.values(SERVICE_IDS));
    }

    return enabledServices;
  }

  async isServiceEnabled(serviceId: ServiceId): Promise<boolean> {
    const settings = await this.getOrCreateSettings();
    return settings.enabledServices?.get(serviceId) !== false;
  }

  /**
   * Get the form configuration for a specific service.
   */
  async getFormConfig(serviceId: ServiceId): Promise<ServiceFormConfig | undefined> {
    const settings = await this.getOrCreateSettings();
    const cfg = settings.formConfigs?.get(serviceId) as unknown as ServiceFormConfig | undefined;
    return cfg;
  }

  /**
   * Save the form configuration for a specific service.
   * If a field of type "cost" is present, the baseAmount will be forced to 0,
   * allowing users to input the amount they wish to pay.
   */
  async saveFormConfig(serviceId: ServiceId, config: SaveFormConfigInput): Promise<ServiceFormConfig> {
    const settings = await this.getOrCreateSettings();

    const costFieldCount: number = (config.formFields ?? []).filter((f) => f.type === 'cost').length;
    if (costFieldCount > 1) {
      throw new BadRequestException('Only one cost field is allowed');
    }

    const sanitizeText = (value?: string, maxLen = 200): string => {
      const input = String(value ?? '');
      let out = '';
      for (let i = 0; i < input.length && out.length < maxLen; i++) {
        const code = input.charCodeAt(i);
        // Skip control chars (0-31, 127) and angle brackets
        if (code < 32 || code === 127) continue;
        const ch = input[i];
        if (ch === '<' || ch === '>') continue;
        out += ch;
      }
      return out.trim();
    };

    const slugifyId = (input: string): string => {
      return input
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'field';
    };

    const allowedTypes = new Set<SaveFormConfigInput['formFields'][number]['type']>([
      'text',
      'email',
      'tel',
      'number',
      'select',
      'textarea',
      'file',
      'date',
      'cost',
    ]);

    const normalizedFields: ServiceFormConfig['formFields'] = (config.formFields ?? []).map((f, index) => {
      if (!allowedTypes.has(f.type)) {
        throw new BadRequestException(`Invalid field type at index ${index}`);
      }

      const label = sanitizeText(f.label, 120);
      if (!label) {
        throw new BadRequestException(`Label is required for field at index ${index}`);
      }

      const id = slugifyId(sanitizeText(f.id || label, 120));
      const placeholder = sanitizeText(f.placeholder, 200);

      const options: Array<{ value: string; label: string }> = [];
      if (f.type === 'select') {
        const seen = new Set<string>();
        for (const opt of f.options ?? []) {
          const optLabel = sanitizeText(opt?.label ?? opt?.value ?? '', 80);
          const rawValue = sanitizeText(opt?.value ?? optLabel, 80);
          const value = slugifyId(rawValue);
          if (!optLabel || !value || seen.has(value)) continue;
          seen.add(value);
          options.push({ value, label: optLabel });
        }
        if (options.length === 0) {
          throw new BadRequestException(`Select field at index ${index} must have at least one option`);
        }
      }

      let validation = f.validation;
      if (validation) {
        const min = typeof validation.min === 'number' && isFinite(validation.min) ? validation.min : undefined;
        const max = typeof validation.max === 'number' && isFinite(validation.max) ? validation.max : undefined;
        const pattern = sanitizeText(validation.pattern, 200);
        const message = sanitizeText(validation.message, 160);
        let finalMin = typeof min === 'number' ? Math.max(0, min) : undefined;
        let finalMax = typeof max === 'number' ? Math.max(0, max) : undefined;
        if (typeof finalMin === 'number' && typeof finalMax === 'number' && finalMin > finalMax) {
          const tmp = finalMin;
          finalMin = finalMax;
          finalMax = tmp;
        }
        validation = { min: finalMin, max: finalMax, pattern, message };
      }

      return {
        id,
        label,
        type: f.type,
        required: Boolean(f.required),
        placeholder: placeholder || undefined,
        options: options.length ? options : f.type === 'select' ? [] : undefined,
        validation,
      } as ServiceFormConfig['formFields'][number];
    });

    const hasCustomCostField: boolean = costFieldCount === 1;
    const normalized: ServiceFormConfig = {
      title: sanitizeText(config.title, 120) || 'Service',
      description: sanitizeText(config.description, 400),
      formFields: normalizedFields,
      baseAmount: hasCustomCostField ? 0 : Math.max(0, config.baseAmount ?? 0),
      processingFee: Math.max(0, config.processingFee ?? 0),
    };

    if (!settings.formConfigs) {
      settings.formConfigs = new Map();
    }
    settings.formConfigs.set(serviceId, normalized);
    await settings.save();
    return normalized;
  }
}

export interface SaveFormConfigInput {
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
}


