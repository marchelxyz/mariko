import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Restaurant } from '../models/Restaurant';
import { remarkedService } from '../services/remarkedService';
import { ReserveData } from '../types/remarked';
import { getRestaurantFromCache, setRestaurantToCache } from '../services/cacheService';

const router = Router();

/**
 * Создание бронирования столика через ReMarked API
 * 
 * Тело запроса должно содержать:
 * - restaurantId: string (UUID ресторана)
 * - name: string (Имя клиента)
 * - phone: string (Телефон в формате +79999999999)
 * - date: string (Дата в формате YYYY-MM-DD)
 * - time: string (Время в формате HH:mm)
 * - guests_count: number (Количество гостей)
 * - duration?: number (Длительность в минутах)
 * - comment?: string (Комментарий к бронированию)
 * - table_ids?: number[] (Массив ID столов)
 * - eventTags?: number[] (Массив ID тегов событий)
 * - confirm_code?: number (SMS код подтверждения, если требуется)
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const startTime = Date.now();
  const timings: Record<string, number> = {};

  try {
    const {
      restaurantId,
      name,
      phone,
      date,
      time,
      guests_count,
      duration,
      comment,
      table_ids,
      eventTags,
      confirm_code,
    } = req.body;

    // Валидация обязательных полей
    if (!restaurantId || !name || !phone || !date || !time || !guests_count) {
      return res.status(400).json({
        success: false,
        message: 'Отсутствуют обязательные поля: restaurantId, name, phone, date, time, guests_count',
      });
    }

    // Получаем ресторан из кеша или базы данных
    let restaurant: Restaurant | null = null;
    const cacheStart = Date.now();
    restaurant = await getRestaurantFromCache(restaurantId);
    timings.cache_lookup = Date.now() - cacheStart;

    if (!restaurant) {
      const dbStart = Date.now();
      const restaurantRepository = AppDataSource.getRepository(Restaurant);
      restaurant = await restaurantRepository.findOne({
        where: { id: restaurantId },
      });
      timings.db_restaurant = Date.now() - dbStart;

      // Сохраняем в кеш для следующих запросов
      if (restaurant) {
        await setRestaurantToCache(restaurantId, restaurant);
      }
    }

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Ресторан не найден',
      });
    }

    if (!restaurant.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Ресторан неактивен',
      });
    }

    // Проверяем наличие ReMarked Point ID
    if (!restaurant.remarkedPointId) {
      return res.status(400).json({
        success: false,
        message: 'Ресторан не настроен для бронирования. Обратитесь к администратору.',
      });
    }

    // Получаем токен от ReMarked API (с кешированием)
    let token: string;
    try {
      const tokenStart = Date.now();
      const tokenResponse = await remarkedService.getToken(restaurant.remarkedPointId);
      timings.remarked_token = Date.now() - tokenStart;
      token = tokenResponse.token;
    } catch (error: any) {
      console.error('Ошибка получения токена ReMarked:', error);
      return res.status(500).json({
        success: false,
        message: 'Не удалось подключиться к сервису бронирования. Попробуйте позже.',
      });
    }

    // Формируем данные для создания бронирования
    const reserveData: ReserveData = {
      name,
      phone,
      date,
      time,
      guests_count: Number(guests_count),
      ...(duration && { duration: Number(duration) }),
      ...(comment && { comment }),
      ...(table_ids && Array.isArray(table_ids) && { table_ids: table_ids.map(Number) }),
      ...(eventTags && Array.isArray(eventTags) && { eventTags: eventTags.map(Number) }),
      source: 'site', // Источник брони - сайт
    };

    // Создаем бронирование через ReMarked API
    let reserveResult;
    try {
      const reserveStart = Date.now();
      reserveResult = await remarkedService.createReserve(
        token,
        reserveData,
        confirm_code ? Number(confirm_code) : undefined
      );
      timings.remarked_create = Date.now() - reserveStart;
    } catch (error: any) {
      console.error('Ошибка создания бронирования ReMarked:', error);
      
      // Обработка различных типов ошибок
      if (error.code === 400) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Неверные данные для бронирования',
        });
      }
      
      if (error.code === 401 || error.code === 403) {
        return res.status(500).json({
          success: false,
          message: 'Ошибка авторизации в сервисе бронирования',
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message || 'Не удалось создать бронирование. Попробуйте позже.',
      });
    }

    const totalTime = Date.now() - startTime;
    
    // Логируем детальную информацию о производительности
    if (totalTime > 1000) {
      console.log(`[booking] Детальная статистика производительности (${totalTime}ms):`, {
        cache_lookup: timings.cache_lookup || 0,
        db_restaurant: timings.db_restaurant || 0,
        remarked_token: timings.remarked_token || 0,
        remarked_create: timings.remarked_create || 0,
        total: totalTime,
      });
    }

    // Возвращаем успешный результат
    res.status(201).json({
      success: true,
      data: {
        reserve_id: reserveResult.reserve_id,
        form_url: reserveResult.form_url, // URL для оплаты депозита, если требуется
        message: reserveResult.form_url
          ? 'Бронирование создано. Перейдите по ссылке для оплаты депозита.'
          : 'Бронирование успешно создано.',
      },
    });
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error(`[booking] Ошибка создания бронирования (${totalTime}ms):`, error);
    res.status(500).json({
      success: false,
      message: error.message || 'Не удалось создать бронирование',
    });
  }
});

export default router;
