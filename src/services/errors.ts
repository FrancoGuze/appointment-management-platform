export class ServiceError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}
