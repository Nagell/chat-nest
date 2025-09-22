import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from './app.config';

// Extract leaf paths from nested config object
type Leaves<T> = T extends object
  ? {
      [K in keyof T]: `${Exclude<K, symbol>}${Leaves<T[K]> extends never
        ? ''
        : `.${Leaves<T[K]>}`}`;
    }[keyof T]
  : never;

// Get the type of a nested property based on the path
type LeafTypes<T, S extends string> = S extends `${infer T1}.${infer T2}`
  ? T1 extends keyof T
    ? LeafTypes<T[T1], T2>
    : never
  : S extends keyof T
  ? T[S]
  : never;

// Type for all possible config paths
type ConfigPaths = Leaves<AppConfig>;

@Injectable()
export class TypedConfigService {
  constructor(private configService: ConfigService) {}

  /**
   * Get a configuration value with full type safety and intellisense
   * 
   * @param propertyPath - Dot-notation path to the config value (e.g., 'email.smtp.host')
   * @returns The typed configuration value
   */
  get<T extends ConfigPaths>(
    propertyPath: T,
  ): LeafTypes<AppConfig, T> {
    const value = this.configService.get(`app.${propertyPath}`);
    if (value === undefined) {
      throw new Error(`Configuration value not found: app.${propertyPath}`);
    }
    return value as LeafTypes<AppConfig, T>;
  }

  /**
   * Get the entire app configuration object
   */
  getAppConfig(): AppConfig {
    const config = this.configService.get('app');
    if (!config) {
      throw new Error('App configuration not found');
    }
    return config as AppConfig;
  }
}