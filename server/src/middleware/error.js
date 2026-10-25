import { AppError } from '../utils/AppError.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} was not found.`));
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'The request body contains invalid JSON.' });
  }

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'The request body is too large.' });
  }

  if (err?.name === 'ValidationError') {
    const details = Object.fromEntries(
      Object.entries(err.errors || {}).map(([field, value]) => [field, value.message]),
    );
    return res.status(422).json({ message: 'Some fields are invalid.', details });
  }

  if (err?.name === 'CastError') {
    return res.status(404).json({ message: 'That resource does not exist.' });
  }

  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    return res.status(409).json({ message: `That ${field} is already in use.` });
  }

  console.error('[parkspot] Unhandled error:', err);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
}
