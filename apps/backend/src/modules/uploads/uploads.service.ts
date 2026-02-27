import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type AllowedUploadType = 'image' | 'pdf' | 'doc' | 'docx';

interface CreatePresignedPutInput {
  keyPrefix: string;
  contentType: string;
  maxBytes: number;
}

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
    const region = process.env.AWS_REGION || process.env.AWS_S3_REGION || 'ap-southeast-1';
    this.bucket = process.env.AWS_S3_BUCKET || '';
    if (!this.bucket) {
      throw new Error('AWS_S3_BUCKET must be set');
    }
    this.s3 = new S3Client({
      region,
      credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      } : undefined,
      endpoint: process.env.AWS_S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(process.env.AWS_S3_FORCE_PATH_STYLE === '1'),
    });
  }

  getAllowedMimeTypes(): Readonly<Record<AllowedUploadType, readonly string[]>> {
    return {
      image: [
        'image/jpeg',
        'image/png',
        'image/webp',
      ],
      pdf: ['application/pdf'],
      doc: ['application/msword'],
      docx: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    } as const;
  }

  private isMimeAllowed(mime: string): boolean {
    const allowed = Object.values(this.getAllowedMimeTypes()).flat();
    return allowed.includes(mime);
  }

  async createPresignedPut(input: CreatePresignedPutInput): Promise<{ key: string; uploadUrl: string; headers: Record<string, string> } > {
    const { keyPrefix, contentType, maxBytes } = input;
    if (!this.isMimeAllowed(contentType)) {
      throw new BadRequestException('Unsupported file type');
    }
    // Enforce max size via client and CDN; S3 cannot validate size in presign, so validate after upload if needed
    if (!Number.isFinite(maxBytes) || maxBytes <= 0 || maxBytes > 50 * 1024 * 1024) {
      throw new BadRequestException('Invalid size limit');
    }

    const extension = this.deriveExtensionFromMime(contentType);
    const key = `${keyPrefix.replace(/\/$/, '')}/${Date.now()}-${cryptoRandom(12)}${extension}`;
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      // Private by default
      ACL: undefined,
    });
    const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn: 60 });
    return { key, uploadUrl, headers: { 'Content-Type': contentType, 'Content-Length': String(maxBytes) } };
  }

  async createPresignedGet(key: string, expiresInSeconds = 60): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, cmd, { expiresIn: Math.min(3600, Math.max(30, expiresInSeconds)) });
  }

  private deriveExtensionFromMime(mime: string): string {
    switch (mime) {
      case 'image/jpeg': return '.jpg';
      case 'image/png': return '.png';
      case 'image/webp': return '.webp';
      case 'application/pdf': return '.pdf';
      case 'application/msword': return '.doc';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': return '.docx';
      default: return '';
    }
  }
}

function cryptoRandom(length: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  // Use Node crypto
  try {
    const nodeCrypto = require('crypto');
    nodeCrypto.randomFillSync(array);
  } catch {
    for (let i = 0; i < length; i++) array[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[array[i] % alphabet.length];
  return out;
}






