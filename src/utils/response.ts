import { Response } from 'express';
import { ApiResponse } from '../types';

export class ResponseUtil {
  static success<T>(
    res: Response,
    message: string = 'Success',
    data?: T,
    statusCode: number = 200,
    meta?: any
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      meta
    };
    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string = 'Internal Server Error',
    statusCode: number = 500,
    error?: string
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      error
    };
    return res.status(statusCode).json(response);
  }

  static badRequest(
    res: Response,
    message: string = 'Bad Request',
    error?: string
  ): Response {
    return this.error(res, message, 400, error);
  }

  static unauthorized(
    res: Response,
    message: string = 'Unauthorized',
    error?: string
  ): Response {
    return this.error(res, message, 401, error);
  }

  static forbidden(
    res: Response,
    message: string = 'Forbidden',
    error?: string
  ): Response {
    return this.error(res, message, 403, error);
  }

  static notFound(
    res: Response,
    message: string = 'Not Found',
    error?: string
  ): Response {
    return this.error(res, message, 404, error);
  }

  static validationError(
    res: Response,
    message: string = 'Validation Error',
    errors?: any
  ): Response {
    return res.status(422).json({
      success: false,
      message,
      errors
    });
  }
}