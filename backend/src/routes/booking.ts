import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Restaurant } from '../models/Restaurant';
import { remarkedService } from '../services/remarkedService';
import { ReserveData } from '../types/remarked';

const router = Router();

/**
 * Создание бронирования столика через ReMarked API
 * 
 * Тело запроса должно содержать:
 * - restaurantId: string (UUID ресторана)
 * - name: string (Имя клиента)
 * - phone: string (Телефон в формате +79999999999)
 * - email?: string (Email клиента)
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
  try {
    const {
      restaurantId,
      name,
      phone,
      email,
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

    // Получаем ресторан из базы данных
    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    const restaurant = await restaurantRepository.findOne({
      where: { id: restaurantId },
    });

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

    // Получаем токен от ReMarked API
    let token: string;
    try {
      const tokenResponse = await remarkedService.getToken(restaurant.remarkedPointId);
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
      ...(email && { email }),
      ...(duration && { duration: Number(duration) }),
      ...(comment && { comment }),
      ...(table_ids && Array.isArray(table_ids) && { table_ids: table_ids.map(Number) }),
      ...(eventTags && Array.isArray(eventTags) && { eventTags: eventTags.map(Number) }),
      source: 'site', // Источник брони - сайт
    };

    // Создаем бронирование через ReMarked API
    let reserveResult;
    try {
      reserveResult = await remarkedService.createReserve(
        token,
        reserveData,
        confirm_code ? Number(confirm_code) : undefined
      );
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
    console.error('Ошибка создания бронирования:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Не удалось создать бронирование',
    });
  }
});

export default router;
