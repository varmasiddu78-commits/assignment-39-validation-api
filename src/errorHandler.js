const crypto = require('crypto');
const { AppError, NotFoundError } = require('./errors');

const requestId = (req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
};

const notFoundHandler = (req, _res, next) => next(new NotFoundError(`Route ${req.method} ${req.path}`));

// ONE error middleware: every error leaves the API in the same JSON shape.
// Stack traces are logged server-side only, never sent to the client.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let status = 500, code = 'INTERNAL_ERROR', message = 'Something went wrong', details;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err.type === 'entity.parse.failed') {
    status = 400; code = 'MALFORMED_JSON'; message = 'Request body is not valid JSON';
  } else if (err.type === 'entity.too.large') {
    status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Request body too large';
  }

  // Server-side log keeps the full detail (stack) for debugging.
  console.error(JSON.stringify({
    level: status >= 500 ? 'error' : 'warn',
    requestId: req.id, method: req.method, path: req.originalUrl,
    status, code, message: err.message, stack: status >= 500 ? err.stack : undefined,
  }));

  const error = { code, message, requestId: req.id };
  if (details) error.details = details;
  res.status(status).json({ error });
};
module.exports = { requestId, notFoundHandler, errorHandler };
