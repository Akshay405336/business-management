import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../../../config/app-config.js';
import { LOCAL_BUCKET } from '../../../../infrastructure/storage/local-object-storage.js';
import {
  STORED_FILE_SETTINGS,
  type StoredFileSettings,
} from '../../domain/ports/stored-file-settings.port.js';

@Injectable()
export class StoredFileSettingsAdapter implements StoredFileSettings {
  readonly employeeProfileMaxBytes: number;
  readonly presignedTtlSeconds: number;
  readonly storageProvider: 's3' | 'local';
  readonly s3Bucket: string;
  readonly localBucket: string;
  readonly cleanupWorkerEnabled: boolean;
  readonly cleanupIntervalMs: number;
  readonly cleanupBatchSize: number;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.employeeProfileMaxBytes = config.storage.employeeProfileMaxBytes;
    this.presignedTtlSeconds = config.storage.presignedTtlSeconds;
    this.storageProvider = config.storage.provider;
    this.s3Bucket = config.storage.s3.bucket;
    this.localBucket = LOCAL_BUCKET;
    this.cleanupWorkerEnabled = config.storage.cleanupWorkerEnabled;
    this.cleanupIntervalMs = config.storage.cleanupIntervalMs;
    this.cleanupBatchSize = config.storage.cleanupBatchSize;
  }
}

export const storedFileSettingsProviders = [
  StoredFileSettingsAdapter,
  { provide: STORED_FILE_SETTINGS, useExisting: StoredFileSettingsAdapter },
];
