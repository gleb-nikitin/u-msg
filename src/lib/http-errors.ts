/** Structured error shape returned by all backend error responses. */
export interface ApiError {
  error: string;
  code: string;
  statusCode: number;
}

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }

  toJSON(): ApiError {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

export function notImplemented(route: string): HttpError {
  return new HttpError(501, "NOT_IMPLEMENTED", `${route} is not yet implemented`);
}

export function badRequest(message: string): HttpError {
  return new HttpError(400, "BAD_REQUEST", message);
}

export function notFound(message: string): HttpError {
  return new HttpError(404, "NOT_FOUND", message);
}

export function adapterError(message: string): HttpError {
  return new HttpError(502, "ADAPTER_ERROR", message);
}

export function queueFailure(message: string): HttpError {
  return new HttpError(503, "QUEUE_FAILURE", message);
}

export function chainError(message: string): HttpError {
  return new HttpError(404, "CHAIN_ERROR", message);
}
