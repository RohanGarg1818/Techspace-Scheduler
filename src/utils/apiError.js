class ApiError extends Error {
  constructor(
    statusCode,
    code,
    message = "Something went wrong",
    { details, ...extra } = {},
    stack = "",
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.message = message;
    if (details) {
      this.details = details;
    }
    this.extra = extra;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
