import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import type { AppConfig } from '../../config/app-config.js';
import type {
  DeleteObjectInput,
  ObjectStoragePort,
  PresignedDownloadInput,
  PutObjectInput,
} from './object-storage.types.js';

export class S3ObjectStorage implements ObjectStoragePort {
  private readonly client: S3Client;

  constructor(private readonly config: AppConfig['storage']) {
    const { accessKeyId, secretAccessKey, region } = config.s3;
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('S3 credentials are not configured.');
    }
    this.client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async putObject(input: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        ContentLength: input.contentLength,
      }),
    );
  }

  async deleteObject(input: DeleteObjectInput): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
      }),
    );
  }

  async getPresignedDownloadUrl(input: PresignedDownloadInput): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      ResponseContentType: input.responseContentType,
      ResponseContentDisposition: input.responseContentDisposition,
    });
    return getSignedUrl(this.client, command, { expiresIn: input.expiresInSeconds });
  }

  async readObject(input: DeleteObjectInput): Promise<{ body: Buffer; contentType: string }> {
    const output = await this.client.send(
      new GetObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
      }),
    );
    const bodyStream = output.Body;
    if (!bodyStream) {
      throw new Error('Empty object body.');
    }
    const chunks: Uint8Array[] = [];
    for await (const chunk of bodyStream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return {
      body: Buffer.concat(chunks),
      contentType: output.ContentType ?? 'application/octet-stream',
    };
  }
}
