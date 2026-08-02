/**
 * Wraps an async Express route handler so any thrown error or
 * rejected promise is passed to next(err) instead of crashing
 * the whole Node process. Without this, an unhandled rejection
 * in any single request can take down the entire server.
 *
 * Usage: router.get("/:id", asyncHandler(getPostById));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;