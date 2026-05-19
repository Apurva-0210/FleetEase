const { validationResult } = require('express-validator');

class ApiResponse {
  /**
   * Send a successful response
   * @param {Object} res - Express response object
   * @param {*} data - Data to send in the response
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Send an error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {Array} errors - Array of error details
   */
  static error(res, message = 'An error occurred', statusCode = 500, errors = []) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors: errors.length > 0 ? errors : undefined,
    });
  }

  /**
   * Handle validation errors from express-validator
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {boolean} - Whether there were validation errors
   */
  static handleValidationErrors(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      this.error(
        res,
        'Validation failed',
        400,
        errors.array().map((err) => ({
          field: err.param,
          message: err.msg,
          value: err.value,
        }))
      );
      return true;
    }
    return false;
  }

  /**
   * Send a not found response
   * @param {Object} res - Express response object
   * @param {string} resource - Name of the resource that wasn't found
   */
  static notFound(res, resource = 'Resource') {
    return this.error(res, `${resource} not found`, 404);
  }

  /**
   * Send an unauthorized response
   * @param {Object} res - Express response object
   * @param {string} message - Unauthorized message
   */
  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  /**
   * Send a forbidden response
   * @param {Object} res - Express response object
   * @param {string} message - Forbidden message
   */
  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  /**
   * Send a bad request response
   * @param {Object} res - Express response object
   * @param {string} message - Bad request message
   * @param {Array} errors - Array of error details
   */
  static badRequest(res, message = 'Bad Request', errors = []) {
    return this.error(res, message, 400, errors);
  }

  /**
   * Send a server error response
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   * @param {string} message - Custom error message
   */
  static serverError(res, error, message = 'Internal Server Error') {
    console.error('Server Error:', error);
    return this.error(
      res,
      process.env.NODE_ENV === 'development' ? error.message : message,
      500,
      process.env.NODE_ENV === 'development' ? [{ error: error.stack }] : []
    );
  }
}

module.exports = ApiResponse;
