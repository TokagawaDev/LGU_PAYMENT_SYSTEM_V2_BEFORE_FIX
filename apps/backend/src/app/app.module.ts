import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../modules/auth/auth.module';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { SettingsModule } from '../modules/settings/settings.module';
import { TransactionsModule } from '../modules/transactions/transactions.module';
import { PaymentsModule } from '../modules/payments/payments.module';
import { UploadsModule } from '../modules/uploads/uploads.module';
import { CustomApplicationFormSubmissionsModule } from '../modules/custom-application-form-submissions/custom-application-form-submissions.module';
import { AdminCustomFormsModule } from '../modules/admin-custom-forms/admin-custom-forms.module';
import { CustomPaymentServicesModule } from '../modules/custom-payment-services/custom-payment-services.module';
import { CustomApplicationServicesModule } from '../modules/custom-application-services/custom-application-services.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/lgu-payment-system',
      {
        retryWrites: true,
        w: 'majority',
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 1,
      }
    ),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3, // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per 10 seconds
      },
    ]),
    AuthModule,
    SettingsModule,
    TransactionsModule,
    PaymentsModule,
    UploadsModule,
    CustomApplicationFormSubmissionsModule,
    AdminCustomFormsModule,
    CustomPaymentServicesModule,
    CustomApplicationServicesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global authentication guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global roles guard
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
