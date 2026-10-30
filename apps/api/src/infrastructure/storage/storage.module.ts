import { Global, Module } from '@nestjs/common';
import { join } from 'node:path';
import { APP_CONFIG, type AppConfig } from '../../config/app-config.js';
import { LocalObjectStorage, LOCAL_BUCKET } from './local-object-storage.js';
import { OBJECT_STORAGE } from './object-storage.types.js';
import { S3ObjectStorage } from './s3-object-storage.js';

export { LOCAL_BUCKET };

@Global()
@Module({
  providers: [
    {
      provide: OBJECT_STORAGE,
      useFactory: (config: AppConfig) => {
        if (config.storage.provider === 's3') {
          return new S3ObjectStorage(config.storage);
        }
        return new LocalObjectStorage(join(process.cwd(), 'data', 'uploads', 'objects'));
      },
      inject: [APP_CONFIG],
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
