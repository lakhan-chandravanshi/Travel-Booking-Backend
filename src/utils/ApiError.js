/**
 * Operational error with an attached HTTP status code.
 * Thrown anywhere in the request lifecycle and translated into a JSON
 * response by the global error handler.
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', details) {
    return new ApiError(400, msg, details);
  }

  static unauthorized(msg = 'Not authenticated') {
    return new ApiError(401, msg);
  }

  static forbidden(msg = 'Not allowed') {
    return new ApiError(403, msg);
  }

  static notFound(msg = 'Resource not found') {
    return new ApiError(404, msg);
  }

  static conflict(msg = 'Conflict') {
    return new ApiError(409, msg);
  }

  static internal(msg = 'Something went wrong') {
    return new ApiError(500, msg);
  }
}

export default ApiError;
