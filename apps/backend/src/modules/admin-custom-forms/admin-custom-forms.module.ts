import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AdminCustomForm,
  AdminCustomFormSchema,
} from './schemas/admin-custom-form.schema';
import {
  AdminCustomFormSubmission,
  AdminCustomFormSubmissionSchema,
} from './schemas/admin-custom-form-submission.schema';
import { AdminCustomFormsService } from './admin-custom-forms.service';
import { AdminCustomFormsController } from './admin-custom-forms.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminCustomForm.name, schema: AdminCustomFormSchema },
      {
        name: AdminCustomFormSubmission.name,
        schema: AdminCustomFormSubmissionSchema,
      },
    ]),
  ],
  providers: [AdminCustomFormsService],
  controllers: [AdminCustomFormsController],
  exports: [AdminCustomFormsService],
})
export class AdminCustomFormsModule {}
