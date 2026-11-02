import type { StoredObjectCategory } from '../../domain/enums/stored-object.enums.js';
import type { UploadedFilePayload } from '../../domain/types/uploaded-file.types.js';

export type UploadFileCommand = {
  readonly organizationId: string;
  readonly adminId: string;
  readonly category: StoredObjectCategory;
  readonly file: UploadedFilePayload;
};
