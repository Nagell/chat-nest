import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TypedConfigService } from '../config/typed-config.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient;

  constructor(private configService: TypedConfigService) {}

  async onModuleInit() {
    const supabaseUrl = this.configService.get('supabase.url');
    const supabaseKey = this.configService.get('supabase.serviceRoleKey');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Supabase configuration is missing. Please check your environment variables.',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    });

    // Test connection
    try {
      const { data, error } = await this.supabase
        .from('chat_sessions')
        .select('count', { count: 'exact', head: true });

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = table doesn't exist yet
        throw error;
      }

      this.logger.log('✅ Supabase connection established successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect to Supabase:', error.message);
      throw error;
    }
  }

  get client(): SupabaseClient {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }
    return this.supabase;
  }

  /**
   * Execute a query with automatic error handling and logging
   */
  async executeQuery<T>(
    operation: string,
    queryFn: (client: SupabaseClient) => Promise<{ data: T; error: any }>,
  ): Promise<T> {
    try {
      const { data, error } = await queryFn(this.supabase);

      if (error) {
        this.logger.error(`Database error in ${operation}:`, error);
        throw new Error(`Database operation failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error(`Failed to execute ${operation}:`, error.message);
      throw error;
    }
  }

  /**
   * Execute multiple operations in a transaction-like manner
   * Note: Supabase doesn't support true transactions via the client,
   * but this provides a pattern for handling related operations
   */
  async executeTransaction<T>(
    operations: Array<() => Promise<any>>,
    rollbackFn?: () => Promise<void>,
  ): Promise<T[]> {
    const results: T[] = [];

    try {
      for (const operation of operations) {
        const result = await operation();
        results.push(result);
      }
      return results;
    } catch (error) {
      this.logger.error(
        'Transaction failed, attempting rollback:',
        error.message,
      );

      if (rollbackFn) {
        try {
          await rollbackFn();
          this.logger.log('Rollback completed successfully');
        } catch (rollbackError) {
          this.logger.error('Rollback failed:', rollbackError.message);
        }
      }

      throw error;
    }
  }
}
