import type { EmployeeActor } from '../shared/employee-actor.js';

export type UploadedProfileImageFile = {
  readonly buffer: Buffer;
  readonly mimetype: string;
  readonly size: number;
  readonly originalname: string;
};

export type UploadEmployeeProfileImageCommand = {
  readonly actor: EmployeeActor;
  readonly file: UploadedProfileImageFile;
};
