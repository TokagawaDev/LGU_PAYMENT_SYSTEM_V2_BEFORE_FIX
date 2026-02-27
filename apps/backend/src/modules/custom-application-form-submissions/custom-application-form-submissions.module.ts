import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CustomApplicationFormSubmission,
  CustomApplicationFormSubmissionSchema,
} from './schemas/custom-application-form-submission.schema';
import { CustomApplicationFormSubmissionsService } from './custom-application-form-submissions.service';
import { UserCustomApplicationFormSubmissionsController } from './user-custom-application-form-submissions.controller';
import { AdminCustomApplicationFormSubmissionsController } from './admin-custom-application-form-submissions.controller';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { CustomApplicationServicesModule } from '../custom-application-services/custom-application-services.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomApplicationFormSubmission.name, schema: CustomApplicationFormSubmissionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
    CustomApplicationServicesModule,
  ],
  providers: [CustomApplicationFormSubmissionsService],
  controllers: [UserCustomApplicationFormSubmissionsController, AdminCustomApplicationFormSubmissionsController],
  exports: [CustomApplicationFormSubmissionsService],
})
export class CustomApplicationFormSubmissionsModule {}
