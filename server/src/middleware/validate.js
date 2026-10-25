import { AppError } from '../utils/AppError.js';

/**
 * Validates req[source] with a Zod schema and replaces it with the parsed value.
 * Unknown keys are stripped, so clients cannot mass-assign fields such as role.
 */
export function validate(schema, source = 'body') {
  return function validateRequest(req, _res, next) {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = result.error.issues;
      const details = {};
      for (const issue of issues) {
        const key = issue.path.join('.') || 'form';
        if (!details[key]) details[key] = issue.message;
      }
      return next(new AppError(422, issues[0]?.message || 'Invalid request.', details));
    }
    if (source === 'body') {
      req.body = result.data;
    } else {
      // req.query is a getter in Express, so replace it with a plain value.
      Object.defineProperty(req, source, {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    return next();
  };
}
