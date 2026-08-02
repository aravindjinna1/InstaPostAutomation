/**
 * Global error-handling middleware. Must be registered LAST, after
 * all routes, in app.js/server.js: app.use(errorHandler)
 *
 * Any error passed to next(err) - including ones caught by
 * asyncHandler - ends up here instead of crashing the process.
 */
function errorHandler(err, req, res, next) {
  console.error("[Error]", err.message);

  // Mongoose CastError (e.g. an invalid ObjectId like "run-now") -> 400, not a crash
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      error: `Invalid ${err.path}: ${err.value}`,
    });
  }

  res.status(500).json({
    success: false,
    error: "Something went wrong on the server.",
  });
}

module.exports = errorHandler;