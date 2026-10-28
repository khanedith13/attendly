export class ApiError extends Error {
  constructor(message, status = 500, errors = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}
