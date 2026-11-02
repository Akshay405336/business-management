export interface StoredFileSettings {
  readonly employeeProfileMaxBytes: number;
  readonly presignedTtlSeconds: number;
  readonly storageProvider: 's3' | 'local';
  readonly s3Bucket: string;
  readonly localBucket: string;
  readonly cleanupWorkerEnabled: boolean;
  readonly cleanupIntervalMs: number;
  readonly cleanupBatchSize: number;
}

export const STORED_FILE_SETTINGS = Symbol('STORED_FILE_SETTINGS');
