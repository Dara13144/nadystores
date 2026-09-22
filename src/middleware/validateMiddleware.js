function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.safeParse(req[source]);
      if (!parsed.success) {
        const errors = parsed.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }
      req[source] = parsed.data;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { validate };
