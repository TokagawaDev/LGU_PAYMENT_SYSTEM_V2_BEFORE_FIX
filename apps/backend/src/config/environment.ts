/**
 * Environment configuration and validation
 * Ensures all required environment variables are present and valid
 */

export interface EnvironmentConfig {
  // Database
  mongodbUri: string;
  
  // JWT
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshExpiresIn: string;
  
  // Application
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  frontendUrl?: string;
  cookieDomain?: string;
  
  // Security
  bcryptSaltRounds: number;
  
  // Email (Mailgun)
  mailgunApiKey?: string;
  mailgunDomain?: string;

  // PayMongo
  paymongoPublicKey?: string;
  paymongoSecretKey?: string;
  paymongoWebhookSecret?: string;
}

/**
 * Load and validate environment configuration
 * @returns Validated environment configuration
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  // Validate required JWT secrets
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  
  if (!jwtAccessSecret || jwtAccessSecret.length < 32) {
    throw new Error(
      'JWT_ACCESS_SECRET must be set and at least 32 characters long. ' +
      'Generate a secure secret: openssl rand -base64 32'
    );
  }
  
  if (!jwtRefreshSecret || jwtRefreshSecret.length < 32) {
    throw new Error(
      'JWT_REFRESH_SECRET must be set and at least 32 characters long. ' +
      'Generate a secure secret: openssl rand -base64 32'
    );
  }
  
  if (jwtAccessSecret === jwtRefreshSecret) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
  }
  
  return {
    // Database
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/lgu-payment-system',
    
    // JWT
    jwtAccessSecret,
    jwtRefreshSecret,
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    
    // Application
    nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    port: parseInt(process.env.PORT || '3001', 10),
    frontendUrl: process.env.FRONTEND_URL,
    cookieDomain: process.env.COOKIE_DOMAIN,
    
    // Security
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
    
    // Email (Mailgun)
    mailgunApiKey: process.env.MAILGUN_API_KEY,
    mailgunDomain: process.env.MAILGUN_DOMAIN,

    // PayMongo
    paymongoPublicKey: process.env.PAYMONGO_PUBLIC_KEY,
    paymongoSecretKey: process.env.PAYMONGO_SECRET_KEY,
    paymongoWebhookSecret: process.env.PAYMONGO_WEBHOOK_SECRET,
  };
}

// Load configuration on module import
export const environmentConfig = loadEnvironmentConfig();