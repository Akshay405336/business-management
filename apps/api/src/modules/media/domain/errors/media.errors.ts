export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaValidationError';
  }
}

export class MediaNotFoundError extends Error {
  constructor() {
    super('File not found.');
    this.name = 'MediaNotFoundError';
  }
}

export class MediaForbiddenError extends Error {
  constructor(message = 'You do not have access to this file.') {
    super(message);
    this.name = 'MediaForbiddenError';
  }
}

export class MediaConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaConflictError';
  }
}

export class MediaStorageError extends Error {
  constructor(message = 'Storage operation failed.') {
    super(message);
    this.name = 'MediaStorageError';
  }
}
