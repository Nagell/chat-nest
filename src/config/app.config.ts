import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  nodeEnv: string;
  supabase: {
    url: string;
    serviceRoleKey: string;
  };
  email: {
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    adminEmail: string;
  };
  frontend: {
    developmentUrl: string;
    productionUrl: string;
    adminDashboardUrl: string;
  };
  websocket: {
    corsOrigins: string[];
  };
}

export default registerAs('app', (): AppConfig => ({
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    },
    adminEmail: process.env.ADMIN_EMAIL || '',
  },
  
  frontend: {
    developmentUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    productionUrl: process.env.PRODUCTION_FRONTEND_URL || 'https://your-portfolio.com',
    adminDashboardUrl: process.env.ADMIN_DASHBOARD_URL || 'http://localhost:3000',
  },
  
  websocket: {
    corsOrigins: process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || [
      'http://localhost:3000'
    ],
  },
}));