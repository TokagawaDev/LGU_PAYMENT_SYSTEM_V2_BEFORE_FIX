import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { SettingsService } from '../../settings/settings.service';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly mailgun: Mailgun;
  private readonly domain: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService,
  ) {
    this.apiKey = this.configService.get<string>('MAILGUN_API_KEY') || '';
    this.domain = this.configService.get<string>('MAILGUN_DOMAIN') || '';

    if (!this.apiKey || !this.domain) {
      this.logger.warn('Mailgun configuration missing. Email service will not work properly.');
    }

    this.mailgun = new Mailgun(formData);
  }

  /**
   * Build a lightweight receipt HTML block matching the frontend ReceiptPaper
   */
  buildReceiptHtml(params: {
    sealLogoUrl: string;
    cityName: string;
    systemName: string;
    reference: string;
    dateTime: string;
    serviceName: string;
    items: Array<{ label: string; amount: string }>;
    total: string;
    note?: string;
  }): string {
    const rows = params.items
      .map(
        (i) => `
          <tr>
            <td style="padding:6px 0;">${i.label}</td>
            <td style="padding:6px 0;text-align:right;white-space:nowrap;">${i.amount}</td>
          </tr>`
      )
      .join('');
    return `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width:420px;background:#ffffff;color:#000000;border:1px solid #e5e7eb;border-radius:8px;font-family:Arial,Helvetica,Segoe UI,Roboto,'Helvetica Neue',sans-serif;font-size:12px;line-height:18px;">
        <tr>
          <td style="padding:16px 20px 0;">
            <table width="100%" role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td align="center" style="padding-bottom:8px;">
                  <img src="${params.sealLogoUrl}" alt="Seal" width="40" height="40" style="display:block;width:40px;height:40px;object-fit:contain;border:0;outline:none;text-decoration:none;"/>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-bottom:8px;">
                  <div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6b7280;">Official Receipt</div>
                  <div style="font-size:14px;font-weight:600;">${params.cityName}</div>
                  <div style="font-size:14px;font-weight:600;">${params.systemName}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 20px;">
            <div style="height:1px;border-top:1px dashed #d1d5db;margin:12px 0;"></div>
            <table width="100%" role="presentation" cellspacing="0" cellpadding="0" border="0" style="font-family:Consolas,'Courier New',monospace;">
              <tr>
                <td>Reference</td>
                <td style="text-align:right;font-weight:600;">${params.reference}</td>
              </tr>
              <tr>
                <td>Date</td>
                <td style="text-align:right;">${params.dateTime}</td>
              </tr>
              <tr>
                <td>Service</td>
                <td style="text-align:right;">${params.serviceName}</td>
              </tr>
            </table>
            <div style="height:1px;border-top:1px dashed #d1d5db;margin:12px 0;"></div>
            <table width="100%" role="presentation" cellspacing="0" cellpadding="0" border="0" style="font-family:Consolas,'Courier New',monospace;">
              <tr>
                <td>Description</td>
                <td style="text-align:right;">Amount</td>
              </tr>
              <tr><td colspan="2" style="border-top:1px solid #e5e7eb;height:1px;line-height:1px;font-size:0;">&nbsp;</td></tr>
              ${rows}
              <tr><td colspan="2" style="border-top:1px dashed #d1d5db;height:1px;line-height:1px;font-size:0;">&nbsp;</td></tr>
              <tr>
                <td style="font-weight:600;">Total</td>
                <td style="text-align:right;font-weight:600;white-space:nowrap;">${params.total}</td>
              </tr>
            </table>
            <div style="height:1px;border-top:1px dashed #d1d5db;margin:12px 0;"></div>
            <div style="font-size:10px;color:#6b7280;text-align:center;padding-bottom:16px;">${params.note || 'Keep this receipt for your records. Thank you for your payment.'}</div>
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Compose a standard email layout with header/branding and content block
   */
  buildBrandedEmailHtml(params: {
    title: string;
    preheader?: string;
    contentHtml: string;
  }, branding?: { cityName: string; systemName: string }): string {
    const cityName = branding?.cityName || 'Local Government Unit';
    const systemName = branding?.systemName || 'Payment System';
    const preheader = params.preheader || '';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${params.title}</title></head>
    <body style="background:#f8fafc;margin:0;padding:0;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
      <div style="max-width:640px;margin:0 auto;padding:24px;">
        <div style="background:#2563eb;color:#ffffff;border-radius:12px 12px 0 0;padding:20px;text-align:center;">
          <h1 style="margin:0;font-size:20px;">${cityName} ${systemName}</h1>
        </div>
        <div style="background:#ffffff;border-radius:0 0 12px 12px;padding:24px;border:1px solid #e5e7eb;border-top:0;">
          ${params.contentHtml}
        </div>
        <div style="text-align:center;margin-top:16px;color:#64748b;font-size:12px;">This is an automated message, please do not reply.</div>
      </div>
    </body></html>`;
  }

  /**
   * Send email using Mailgun
   * @param options Email options
   * @returns Promise<boolean> Success status
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.apiKey || !this.domain) {
        this.logger.error('Mailgun not configured');
        return false;
      }

      const mg = this.mailgun.client({
        username: 'api',
        key: this.apiKey,
      });

      // Try to get dynamic branding, fallback to default if it fails
      let fromName = 'LGU Payment System';
      try {
        const settings = await this.settingsService.getPublicSettings();
        fromName = `${settings.city.fullName} ${settings.branding.systemName}`;
      } catch {
        this.logger.warn('Failed to get settings for email branding, using default');
      }

      const msg = {
        from: `${fromName} <noreply@${this.domain}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        ...(options.text && { text: options.text }),
      };

      await mg.messages.create(this.domain, msg);
      return true;
    } catch {
      //
      return false;
    }
  }

  /**
   * Send email verification code
   * @param email User email
   * @param code 6-digit verification code
   * @param userName User's first name
   * @returns Promise<boolean> Success status
   */
  async sendVerificationEmail(email: string, code: string, userName: string): Promise<boolean> {
    try {
      const settings = await this.settingsService.getPublicSettings();
      const systemName = settings.branding.systemName;
      const fullCityName = settings.city.fullName;
      
      const subject = `Verify Your Email - ${fullCityName} ${systemName}`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .verification-code { background: #e2e8f0; padding: 20px; text-align: center; border-radius: 6px; margin: 20px 0; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1e293b; }
            .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${fullCityName} ${systemName}</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>Thank you for registering with the ${fullCityName} ${systemName}. To complete your registration, please verify your email address by entering the following verification code:</p>
              
              <div class="verification-code">${code}</div>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>This code will expire in 10 minutes</li>
                <li>If you didn't request this verification, please ignore this email</li>
                <li>For security reasons, never share this code with anyone</li>
              </ul>
              
              <p>Once verified, you'll be able to access all the payment services.</p>
              
              <p>Best regards,<br>${fullCityName} ${systemName} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
        Hello ${userName}!
        
        Thank you for registering with the ${fullCityName} ${systemName}. To complete your registration, please verify your email address by entering the following verification code:
        
        ${code}
        
        Important:
        - This code will expire in 10 minutes
        - If you didn't request this verification, please ignore this email
        - For security reasons, never share this code with anyone
        
        Once verified, you'll be able to access all the payment services.
        
        Best regards,
        ${fullCityName} ${systemName} Team
      `;

      return this.sendEmail({
        to: email,
        subject,
        html,
        text,
      });
    } catch (error) {
      this.logger.error(`Failed to get settings for verification email:`, error);
      // Fallback to default values if settings fail to load
      const subject = 'Verify Your Email - LGU Payment System';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .verification-code { background: #e2e8f0; padding: 20px; text-align: center; border-radius: 6px; margin: 20px 0; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1e293b; }
            .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>LGU Payment System</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>Thank you for registering with the LGU Payment System. To complete your registration, please verify your email address by entering the following verification code:</p>
              
              <div class="verification-code">${code}</div>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>This code will expire in 10 minutes</li>
                <li>If you didn't request this verification, please ignore this email</li>
                <li>For security reasons, never share this code with anyone</li>
              </ul>
              
              <p>Once verified, you'll be able to access all the payment services.</p>
              
              <p>Best regards,<br>LGU Payment System Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
        Hello ${userName}!
        
        Thank you for registering with the LGU Payment System. To complete your registration, please verify your email address by entering the following verification code:
        
        ${code}
        
        Important:
        - This code will expire in 10 minutes
        - If you didn't request this verification, please ignore this email
        - For security reasons, never share this code with anyone
        
        Once verified, you'll be able to access all the payment services.
        
        Best regards,
        LGU Payment System Team
      `;

      return this.sendEmail({
        to: email,
        subject,
        html,
        text,
      });
    }
  }

  /**
   * Send password reset code
   * @param email User email
   * @param code 6-digit reset code
   * @param userName User's first name
   * @returns Promise<boolean> Success status
   */
  async sendPasswordResetEmail(email: string, code: string, userName: string): Promise<boolean> {
    try {
      const settings = await this.settingsService.getPublicSettings();
      const systemName = settings.branding.systemName;
      const fullCityName = settings.city.fullName;
      
      const subject = `Password Reset - ${fullCityName} ${systemName}`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .reset-code { background: #fee2e2; padding: 20px; text-align: center; border-radius: 6px; margin: 20px 0; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #991b1b; }
            .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${fullCityName} ${systemName}</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>We received a request to reset your password for your ${fullCityName} ${systemName} account. To proceed with the password reset, please use the following verification code:</p>
              
              <div class="reset-code">${code}</div>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>This code will expire in 10 minutes</li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>For security reasons, never share this code with anyone</li>
                <li>Your password will remain unchanged until you enter this code</li>
              </ul>
              
              <p>If you have any questions or concerns, please contact our support team.</p>
              
              <p>Best regards,<br>${fullCityName} ${systemName} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
        Hello ${userName}!
        
        We received a request to reset your password for your ${fullCityName} ${systemName} account. To proceed with the password reset, please use the following verification code:
        
        ${code}
        
        Important:
        - This code will expire in 10 minutes
        - If you didn't request this password reset, please ignore this email
        - For security reasons, never share this code with anyone
        - Your password will remain unchanged until you enter this code
        
        If you have any questions or concerns, please contact our support team.
        
        Best regards,
        ${fullCityName} ${systemName} Team
      `;

      return this.sendEmail({
        to: email,
        subject,
        html,
        text,
      });
    } catch (error) {
      this.logger.error(`Failed to get settings for password reset email:`, error);
      // Fallback to default values if settings fail to load
      const subject = 'Password Reset - LGU Payment System';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .reset-code { background: #fee2e2; padding: 20px; text-align: center; border-radius: 6px; margin: 20px 0; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #991b1b; }
            .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>LGU Payment System</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>We received a request to reset your password for your LGU Payment System account. To proceed with the password reset, please use the following verification code:</p>
              
              <div class="reset-code">${code}</div>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>This code will expire in 10 minutes</li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>For security reasons, never share this code with anyone</li>
                <li>Your password will remain unchanged until you enter this code</li>
              </ul>
              
              <p>If you have any questions or concerns, please contact our support team.</p>
              
              <p>Best regards,<br>LGU Payment System Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
        Hello ${userName}!
        
        We received a request to reset your password for your LGU Payment System account. To proceed with the password reset, please use the following verification code:
        
        ${code}
        
        Important:
        - This code will expire in 10 minutes
        - If you didn't request this password reset, please ignore this email
        - For security reasons, never share this code with anyone
        - Your password will remain unchanged until you enter this code
        
        If you have any questions or concerns, please contact our support team.
        
        Best regards,
        LGU Payment System Team
      `;

      return this.sendEmail({
        to: email,
        subject,
        html,
        text,
      });
    }
  }
}
