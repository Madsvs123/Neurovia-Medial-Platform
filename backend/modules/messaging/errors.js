/** Error carrying an HTTP status that errorMiddleware (err.statusCode) understands. */
class HttpError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

const badRequest = (msg, details) => new HttpError(400, msg, details);
const forbidden = (msg = 'Forbidden') => new HttpError(403, msg);
const notFound = (msg = 'Not found') => new HttpError(404, msg);
const conflict = (msg) => new HttpError(409, msg);

/** Throw unless a policy result is ok. */
const assertAllowed = (result, status = 403) => {
  if (!result.ok) throw new HttpError(status, result.reason || 'Forbidden');
};

module.exports = { HttpError, badRequest, forbidden, notFound, conflict, assertAllowed };
