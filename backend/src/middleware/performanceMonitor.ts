import { Request, Response, NextFunction } from 'express';

interface PerformanceMetrics {
  count: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  errors: number;
}

const metrics: Map<string, PerformanceMetrics> = new Map();

export const performanceMonitor = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const route = `${req.method} ${req.path}`;

  // Инициализируем метрики для маршрута
  if (!metrics.has(route)) {
    metrics.set(route, {
      count: 0,
      totalTime: 0,
      averageTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: 0,
    });
  }

  // Отслеживаем завершение запроса
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const routeMetrics = metrics.get(route)!;

    routeMetrics.count++;
    routeMetrics.totalTime += duration;
    routeMetrics.averageTime = routeMetrics.totalTime / routeMetrics.count;
    routeMetrics.minTime = Math.min(routeMetrics.minTime, duration);
    routeMetrics.maxTime = Math.max(routeMetrics.maxTime, duration);

    if (res.statusCode >= 400) {
      routeMetrics.errors++;
    }

    // Логируем медленные запросы (более 1 секунды)
    if (duration > 1000) {
      console.warn(`⚠️  Медленный запрос: ${route} - ${duration}ms (статус: ${res.statusCode})`);
    }
  });

  next();
};

// Эндпоинт для получения метрик
export const getMetrics = () => {
  return Object.fromEntries(metrics);
};

// Эндпоинт для сброса метрик
export const resetMetrics = () => {
  metrics.clear();
};
