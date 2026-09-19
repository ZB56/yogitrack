/**
 * server/middleware/errorHandler.js
 * ---------------------------------
 * One place that turns any error thrown anywhere in the app into a clean JSON
 * response. Java analogy: a single catch block wrapped around every request,
 * like a servlet filter or Spring's @ControllerAdvice.
 *
 * Express recognises a middleware function as an error handler purely by its
 * FOUR parameters (err, req, res, next). Drop the unused `next` and Express
 * treats it as ordinary middleware and never calls it — a classic gotcha.
 */

/**
 * Handles a request for a route that does not exist.
 * Registered after all real routes, so it only runs when nothing else matched.
 */
export function notFound(req, res) {
  res.status(404).json({
    error: 'Not found',
    message: `No route matches ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Converts an error into an HTTP status code and a JSON body.
 * The React client reads `message` and shows it to the manager.
 */
// eslint-disable-next-line no-unused-vars -- the 4th parameter is required (see above)
export function errorHandler(err, req, res, next) {
  // Mongoose throws a ValidationError when a document fails its schema rules
  // (a required field missing, a value outside an enum). That is the user's
  // mistake, not a server fault, so it is a 400 rather than a 500.
  if (err.name === 'ValidationError') {
    const fields = {};
    for (const [path, detail] of Object.entries(err.errors)) {
      fields[path] = detail.message;
    }
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please correct the highlighted fields.',
      fields,
    });
  }

  // A CastError means a value could not be converted to the schema's type,
  // e.g. the text "abc" sent where a Number was expected.
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid value',
      message: `"${err.value}" is not a valid value for ${err.path}.`,
    });
  }

  // Error 11000 is MongoDB's duplicate-key error, raised when a value that a
  // unique index protects (instructorId, customerId) is inserted twice.
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate value',
      message: `A record with that ${Object.keys(err.keyValue).join(', ')} already exists.`,
    });
  }

  // Anything else is an unexpected server fault. Log the whole thing for the
  // developer, but send the client only a generic message: internal details
  // (file paths, stack frames) should not leak to a browser.
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: 'Server error',
    message: 'Something went wrong on the server. Please try again.',
  });
}
