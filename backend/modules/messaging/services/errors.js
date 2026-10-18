/** Error carrying an HTTP status that errorMiddleware understands. */
const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

module.exports = { httpError };
