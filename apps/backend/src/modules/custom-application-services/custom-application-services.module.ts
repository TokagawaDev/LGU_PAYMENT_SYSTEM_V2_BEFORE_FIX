import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomApplicationService, CustomApplicationServiceSchema } from './schemas/custom-application-service.schema';
import { CustomApplicationServicesService } from './custom-application-services.service';
import { CustomApplicationServicesController } from './custom-application-services.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomApplicationService.name, schema: CustomApplicationServiceSchema },
    ]),
  ],
  providers: [CustomApplicationServicesService],
  controllers: [CustomApplicationServicesController],
  exports: [CustomApplicationServicesService],
})
export class CustomApplicationServicesModule {}
