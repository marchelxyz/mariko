import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Если ответ уже отправлен, не пытаемся отправить еще раз
  if (res.headersSent) {
    console.error(`[errorHandler] ⚠️ Ответ уже отправлен, пропускаем обработку ошибки`);
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Логируем ошибку с контекстом
  console.error(`[${new Date().toISOString()}] ❌ Error ${statusCode} on ${req.method} ${req.path}:`, {
    message: err.message,
    name: err.name,
    stack: err.stack,
    body: Object.keys(req.body || {}).length > 0 ? req.body : undefined,
    query: Object.keys(req.query || {}).length > 0 ? req.query : undefined,
    params: Object.keys(req.params || {}).length > 0 ? req.params : undefined,
  });

  // Определяем код ошибки на основе типа
  let errorCode = 'UNKNOWN_ERROR';
  if (err.name === 'QueryFailedError') {
    errorCode = 'DATABASE_QUERY_ERROR';
  } else if (err.name === 'TypeORMError') {
    errorCode = 'DATABASE_ERROR';
  } else if (err.message.includes('timeout')) {
    errorCode = 'TIMEOUT';
  } else if (err.message.includes('ECONNREFUSED')) {
    errorCode = 'CONNECTION_REFUSED';
  }

  // Не отправляем stack trace в production
  const response: any = {
    success: false,
    error: {
      message,
      code: errorCode,
      timestamp: new Date().toISOString(),
    },
  };

  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
    response.error.name = err.name;
  }

  // Убеждаемся, что отправляем правильный статус код
  try {
    res.status(statusCode).json(response);
  } catch (sendError) {
    console.error(`[errorHandler] ❌ Ошибка при отправке ответа об ошибке:`, sendError);
  }
};
