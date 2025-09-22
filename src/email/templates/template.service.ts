import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  EmailTemplate,
  EmailTemplateVariables,
  TemplateRenderer,
} from './template.types';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templatesPath = join(
    __dirname,
    '..',
    '..',
    '..',
    'src',
    'email',
    'templates',
  );

  private readonly simpleRenderer: TemplateRenderer = (
    template: string,
    variables: EmailTemplateVariables,
  ): string => {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key as keyof EmailTemplateVariables];
      return value !== undefined ? String(value) : match;
    });
  };

  /**
   * Load and render admin notification email template
   */
  getAdminNotificationTemplate(
    variables: EmailTemplateVariables,
  ): EmailTemplate {
    const htmlTemplate = this.loadTemplate('admin-notification.html');
    const textTemplate = this.loadTemplate('admin-notification.txt');

    return {
      html: this.simpleRenderer(htmlTemplate, variables),
      text: this.simpleRenderer(textTemplate, variables),
    };
  }

  private loadTemplate(filename: string): string {
    const templatePath = join(this.templatesPath, filename);
    return readFileSync(templatePath, 'utf-8');
  }
}
