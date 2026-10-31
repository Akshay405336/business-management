import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { StoredObjectMetadataResponse, StoredObjectUploadResponse } from '@techwin/contracts';
import { storedObjectCategorySchema } from '@techwin/validation';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import {
  CrmContext,
  CrmOrganizationGuard,
  type CrmRequestContext,
} from '../../../../crm/index.js';
import {
  RequirePermissions,
  RequirePermissionsGuard,
} from '../../../../org-access/index.js';
import { StoredFileService } from '../../../application/stored-file.service.js';
import { MediaExceptionFilter } from '../filters/media-exception.filter.js';

@ApiTags('Media')
@ApiBearerAuth()
@Controller('media/objects')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(MediaExceptionFilter)
export class MediaController {
  constructor(@Inject(StoredFileService) private readonly storedFiles: StoredFileService) {}

  @Post()
  @RequirePermissions('media.upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload a stored object' })
  async upload(
    @CrmContext() ctx: CrmRequestContext,
    @Query('category') categoryRaw: string,
    @UploadedFile()
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
  ): Promise<StoredObjectUploadResponse> {
    const category = storedObjectCategorySchema.parse(categoryRaw);
    return this.storedFiles.upload({
      organizationId: ctx.organizationId,
      adminId: ctx.adminId,
      category,
      file,
    });
  }

  @Get(':id')
  @RequirePermissions('media.read')
  @ApiOperation({ summary: 'Get stored object metadata' })
  async metadata(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
  ): Promise<StoredObjectMetadataResponse> {
    const record = await this.storedFiles.getGenericRecord(ctx.organizationId, id);
    return {
      id: record.id,
      previewUrl: this.storedFiles.previewPath(record.id),
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      displayFileName: record.displayFileName,
      category: record.category,
      createdAt: record.createdAt,
    };
  }

  @Get(':id/content')
  @RequirePermissions('media.read')
  @ApiOperation({ summary: 'Download or preview stored object content' })
  async content(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
    @Res() response: Response,
  ): Promise<void> {
    const opened = await this.storedFiles.openDownload(ctx.organizationId, id);
    if (opened.redirectUrl) {
      response.redirect(HttpStatus.TEMPORARY_REDIRECT, opened.redirectUrl);
      return;
    }
    if (opened.stream) {
      response.setHeader('Content-Type', opened.stream.contentType);
      response.setHeader('Cache-Control', 'private, max-age=60');
      response.send(opened.stream.body);
      return;
    }
    response.status(HttpStatus.NOT_FOUND).end();
  }

  @Delete(':id')
  @RequirePermissions('media.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an unreferenced stored object' })
  async remove(@CrmContext() ctx: CrmRequestContext, @Param('id') id: string): Promise<void> {
    await this.storedFiles.deleteUnreferenced(ctx.organizationId, id);
  }
}
