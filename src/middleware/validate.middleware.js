import { ApiError } from '../utils/ApiError.js';

/**
 * Validate req[source] against a Zod schema. On success the parsed (and
 * coerced) value replaces the original; on failure a 400 with field details.
 */
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }
    req[source] = result.data;
    next();
  };

export default validate;
