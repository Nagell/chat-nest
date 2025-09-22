import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { TemplateService } from './templates/template.service';

@Module({
  providers: [EmailService, TemplateService],
  exports: [EmailService],
})
export class EmailModule {}
