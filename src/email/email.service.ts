import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ChatMessage, ChatSession } from '../chat/types/chat.types';
import { TypedConfigService } from '../config/typed-config.service';
import { TemplateService } from './templates/template.service';
import { EmailTemplateVariables } from './templates/template.types';
import { SecurityUtil } from '../common/utils/security.util';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private adminEmail: string;
  private dashboardUrl: string;

  constructor(
    private configService: TypedConfigService,
    private templateService: TemplateService,
  ) {}

  async onModuleInit() {
    this.adminEmail = this.configService.get('email.adminEmail') || '';
    this.dashboardUrl =
      this.configService.get('frontend.adminDashboardUrl') ||
      'http://localhost:3000';

    if (!this.adminEmail) {
      this.logger.warn(
        'Admin email not configured - email notifications will be disabled',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.configService.get('email.smtp.host'),
      port: this.configService.get('email.smtp.port'),
      secure: this.configService.get('email.smtp.secure'),
      auth: {
        user: this.configService.get('email.smtp.auth.user'),
        pass: this.configService.get('email.smtp.auth.pass'),
      },
    });

    // Verify SMTP configuration
    try {
      await this.transporter.verify();
      this.logger.log('✅ Email service configured successfully');
    } catch (error) {
      this.logger.error('❌ Failed to configure email service:', error.message);
      throw error;
    }
  }

  /**
   * Send email notification to admin with retry mechanism
   */
  async notifyAdmin(
    message: ChatMessage,
    session: ChatSession,
  ): Promise<boolean> {
    if (!this.transporter || !this.adminEmail) {
      this.logger.warn('Email service not available - skipping notification');
      return false;
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.sendAdminNotification(message, session);
        this.logger.log(
          `✅ Email notification sent successfully (attempt ${attempt})`,
        );
        return true;
      } catch (error) {
        lastError = error;
        this.logger.warn(`❌ Email attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          // Exponential backoff: 2s, 4s, 8s
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
        }
      }
    }

    this.logger.error(
      `❌ All email attempts failed after ${maxRetries} retries:`,
      lastError?.message || 'Unknown error',
    );
    return false;
  }

  private async sendAdminNotification(
    message: ChatMessage,
    session: ChatSession,
  ): Promise<void> {
    const templateVariables: EmailTemplateVariables = {
      visitorName: session.visitor_name || 'Anonymous',
      visitorEmail: session.visitor_email,
      timestamp: new Date(message.created_at).toLocaleString(),
      messageContent: message.content,
      dashboardLink: `${this.dashboardUrl}/admin/chat?session=${session.id}`,
      sessionId: session.id,
      messageId: message.id,
    };

    const emailTemplate =
      this.templateService.getAdminNotificationTemplate(templateVariables);

    await this.transporter.sendMail({
      from: `"Portfolio Chat System" <${this.configService.get('email.smtp.auth.user')}>`,
      replyTo: session.visitor_email, // Allow direct replies to visitor
      to: this.adminEmail,
      subject: `💬 New chat message from ${session.visitor_email}`,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Test email configuration by sending a test message
   */
  async testEmailConfiguration(): Promise<boolean> {
    if (!this.transporter || !this.adminEmail) {
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: `"Portfolio Chat System" <${this.configService.get('email.smtp.auth.user')}>`,
        to: this.adminEmail,
        subject: '🧪 Chat System Email Test',
        html: `
          <h2>✅ Email Configuration Test</h2>
          <p>Your chat system email notifications are working correctly!</p>
          <p><small>Sent at: ${new Date().toLocaleString()}</small></p>
        `,
        text: 'Chat system email test - configuration is working correctly!',
      });

      return true;
    } catch (error) {
      this.logger.error('Email test failed:', error.message);
      return false;
    }
  }
}
