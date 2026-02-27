import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomPaymentService, CustomPaymentServiceSchema } from './schemas/custom-payment-service.schema';
import { CustomPaymentServicesService } from './custom-payment-services.service';
import { CustomPaymentServicesController } from './custom-payment-services.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomPaymentService.name, schema: CustomPaymentServiceSchema },
    ]),
  ],
  providers: [CustomPaymentServicesService],
  controllers: [CustomPaymentServicesController],
  exports: [CustomPaymentServicesService],
})
export class CustomPaymentServicesModule {}
