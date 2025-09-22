export interface EmailTemplateVariables {
  visitorName: string;
  visitorEmail: string;
  timestamp: string;
  messageContent: string;
  dashboardLink: string;
  sessionId: number;
  messageId: number;
}

export interface EmailTemplate {
  html: string;
  text: string;
}

export type TemplateRenderer = (
  template: string,
  variables: EmailTemplateVariables,
) => string;
