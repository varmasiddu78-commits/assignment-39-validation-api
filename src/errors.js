// Custom error classes. Anything extending AppError is an "expected" (operational) error
// whose message is safe to show the client. Everything else becomes a generic 500.
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
class ValidationError extends AppError {
  constructor(details) { super(400, 'VALIDATION_ERROR', 'Request validation failed', details); }
}
class NotFoundError extends AppError {
  constructor(what = 'Resource') { super(404, 'NOT_FOUND', `${what} not found`); }
}
class ConflictError extends AppError {
  constructor(message = 'Resource already exists') { super(409, 'CONFLICT', message); }
}
class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') { super(401, 'UNAUTHORIZED', message); }
}
module.exports = { AppError, ValidationError, NotFoundError, ConflictError, UnauthorizedError };
