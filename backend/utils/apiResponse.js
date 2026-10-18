class APIResponse {
  constructor() {}

  static success(res, data = null, message = 'Success', statusCode = 200) {
    res.status(statusCode).json({
      success: true,
      message,
      data,
      statusCode
    });
  }

  static created(res, data = null, message = 'Resource created successfully', statusCode = 201) {
    res.status(statusCode).json({
      success: true,
      message,
      data,
      statusCode
    });
  }

  static error(res, errorMessage = 'An error occurred', statusCode = 500, errorDetails = null) {
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: errorDetails,
      statusCode
    });
  }

  static notFound(res, resourceName = 'Resource', statusCode = 404) {
    res.status(statusCode).json({
      success: false,
      message: `${resourceName} not found`,
      statusCode
    });
  }

  static unauthorized(res, message = 'Not authorized', statusCode = 401) {
    res.status(statusCode).json({
      success: false,
      message,
      statusCode
    });
  }

  static forbidden(res, message = 'Access forbidden', statusCode = 403) {
    res.status(statusCode).json({
      success: false,
      message,
      statusCode
    });
  }

  static validationError(res, errors = [], message = 'Validation failed', statusCode = 400) {
    res.status(statusCode).json({
      success: false,
      message,
      errors,
      statusCode
    });
  }

  static paginated(res, data, total, page, limit, message = 'Success') {
    res.json({
      success: true,
      message,
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  }
}

module.exports = APIResponse;