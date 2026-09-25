import { Response } from 'express';
import { ApiResponse, PaginatedResult } from '../types/index.js';

export function sendSuccess<T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200
): Response {
  const payload: ApiResponse<T> = {
    success: true,
  };

  if (data !== undefined) {
    payload.data = data;
  }

  if (message) {
    payload.message = message;
  }

  return res.status(statusCode).json(payload);
}

export function sendCreated<T>(
  res: Response,
  data?: T,
  message?: string
): Response {
  return sendSuccess(res, data, message, 201);
}

export function sendPaginated<T>(
  res: Response,
  result: PaginatedResult<T>,
  message?: string,
  statusCode = 200
): Response {
  return sendSuccess(res, result, message, statusCode);
}
