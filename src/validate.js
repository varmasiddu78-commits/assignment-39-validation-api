const { ValidationError } = require('./errors');

// validate({ params, query, body }) -> validates every part, collects ALL issues,
// and stores parsed (coerced, stripped) data on req.validated.
const validate = (schemas) => (req, _res, next) => {
  const details = [];
  req.validated = {};
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part]);
    if (result.success) {
      req.validated[part] = result.data;
    } else {
      details.push(...result.error.issues.map((i) => ({
        location: part,
        field: i.path.join('.') || '(root)',
        message: i.message,
      })));
    }
  }
  return details.length ? next(new ValidationError(details)) : next();
};
module.exports = { validate };
