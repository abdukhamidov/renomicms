export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function createHttpError(status, message) {
  return new HttpError(status, message);
}

export function assert(value, status, message) {
  if (!value) {
    throw new HttpError(status, message);
  }
}
