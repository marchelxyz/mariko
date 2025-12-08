# Полный код процесса бронирования

Этот документ содержит весь код, связанный с процессом бронирования: как происходит бронирование, как передаются данные в ReMarked API и как прорисовывается сетка выбора диапазонов времени.

---

## 1. Фронтенд: Страница бронирования (`frontend/pages/booking.tsx`)

### Основной компонент страницы бронирования

```typescript
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import HallSchemeViewer from '@/components/HallSchemeViewer';
import TableSchemeViewer from '@/components/TableSchemeViewer';
import { useStore } from '@/store/useStore';
import api from '@/lib/api';
import { Slot, SlotsResponse, HallScheme, HallSchemesResponse } from '@/types/booking';

export default function Booking() {
  const router = useRouter();
  const { selectedRestaurant, user } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formUrl, setFormUrl] = useState<string | null>(null);
  
  // Состояние для слотов и выбранного слота
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedTableIds, setSelectedTableIds] = useState<number[]>([]);
  
  // Состояние для схем залов
  const [hallSchemes, setHallSchemes] = useState<HallScheme[]>([]);
  const [loadingHallSchemes, setLoadingHallSchemes] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: '',
    time: '',
    guests_count: 2,
    comment: '',
  });

  // Заполняем форму данными пользователя, если он авторизован
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || prev.name,
        phone: user.phoneNumber || prev.phone,
      }));
    }
  }, [user]);

  // Проверяем, выбран ли ресторан
  useEffect(() => {
    if (!selectedRestaurant) {
      router.push('/');
    }
  }, [selectedRestaurant, router]);

  // Загружаем схемы залов при выборе ресторана
  useEffect(() => {
    if (selectedRestaurant?.id) {
      loadHallSchemes();
    } else {
      setHallSchemes([]);
    }
  }, [selectedRestaurant?.id]);

  // Загружаем слоты при изменении даты или количества гостей
  useEffect(() => {
    if (selectedRestaurant?.id && formData.date && formData.guests_count >= 1) {
      loadSlots();
    } else {
      setSlots([]);
      setSelectedSlot(null);
      setSelectedTableIds([]);
      setFormData(prev => ({ ...prev, time: '' }));
    }
  }, [formData.date, formData.guests_count, selectedRestaurant?.id]);

  // Загрузка доступных слотов
  const loadSlots = async () => {
    if (!selectedRestaurant?.id || !formData.date || formData.guests_count < 1) {
      return;
    }

    setLoadingSlots(true);
    setError(null);
    setSelectedSlot(null);
    setSelectedTableIds([]);
    setFormData(prev => ({ ...prev, time: '' }));

    try {
      const response = await api.get<SlotsResponse>('/booking/slots', {
        params: {
          restaurantId: selectedRestaurant.id,
          date: formData.date,
          guests_count: formData.guests_count,
          with_rooms: true,
        },
      });

      if (response.data.success) {
        // Фильтруем только свободные слоты
        const freeSlots = response.data.data.slots.filter(slot => slot.is_free);
        setSlots(freeSlots);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки слотов:', error);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Выбор слота
  const handleSlotSelect = (slot: Slot) => {
    setSelectedSlot(slot);
    // Форматируем время для поля time (HH:mm)
    const timeStr = slot.start_datetime.split(' ')[1]?.substring(0, 5) || '';
    setFormData(prev => ({ ...prev, time: timeStr }));
    // Сбрасываем выбранные столы при смене слота
    setSelectedTableIds([]);
  };

  // Выбор/отмена выбора стола
  const handleTableToggle = (tableId: number) => {
    setSelectedTableIds(prev => {
      if (prev.includes(tableId)) {
        return prev.filter(id => id !== tableId);
      } else {
        return [...prev, tableId];
      }
    });
  };

  // Выбор комбинации столов (bundle)
  const handleBundleSelect = (tableIds: number[]) => {
    setSelectedTableIds(tableIds);
  };

  // Валидация формы
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Введите ваше имя');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Введите номер телефона');
      return false;
    }
    const phoneRegex = /^\+7\d{10}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      setError('Введите корректный номер телефона в формате +7XXXXXXXXXX');
      return false;
    }
    if (!formData.date) {
      setError('Выберите дату');
      return false;
    }
    if (!formData.time || !selectedSlot) {
      setError('Выберите доступное время');
      return false;
    }
    if (formData.guests_count < 1 || formData.guests_count > 20) {
      setError('Количество гостей должно быть от 1 до 20');
      return false;
    }
    return true;
  };

  // Отправка формы бронирования
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setFormUrl(null);

    if (!validateForm()) {
      return;
    }

    if (!selectedRestaurant?.id) {
      setError('Ресторан не выбран');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/booking', {
        restaurantId: selectedRestaurant.id,
        name: formData.name.trim(),
        phone: formData.phone.replace(/\s/g, ''),
        date: formData.date,
        time: formData.time,
        guests_count: formData.guests_count,
        comment: formData.comment.trim() || undefined,
        table_ids: selectedTableIds.length > 0 ? selectedTableIds : undefined,
        duration: selectedSlot ? Math.round(selectedSlot.duration / 60) : undefined,
      });

      if (response.data.success) {
        setSuccess(true);
        if (response.data.data?.form_url) {
          setFormUrl(response.data.data.form_url);
        }
        // Очищаем форму после успешной отправки
        setTimeout(() => {
          setFormData({
            name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
            phone: user?.phoneNumber || '',
            date: '',
            time: '',
            guests_count: 2,
            comment: '',
          });
          setSelectedSlot(null);
          setSelectedTableIds([]);
          setSlots([]);
          setSuccess(false);
          setFormUrl(null);
        }, 5000);
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      setError(
        error?.response?.data?.message || 
        'Не удалось создать бронирование. Попробуйте позже.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <Header title="Бронирование столика" showBackButton />
      <div className="px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 max-w-2xl mx-auto">
          {/* Форма бронирования */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Поля формы: имя, телефон, дата, время, количество гостей, комментарий */}
            
            {/* СЕТКА ВЫБОРА ВРЕМЕНИ - КЛЮЧЕВОЙ БЛОК */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Время <span className="text-red-500">*</span>
              </label>
              {loadingSlots ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center justify-center">
                  <span className="text-gray-500 text-sm">Загрузка доступного времени...</span>
                </div>
              ) : slots.length === 0 && formData.date ? (
                <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50">
                  <span className="text-red-600 text-sm">Нет доступного времени на эту дату</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* СЕТКА ВЫБОРА ВРЕМЕННЫХ СЛОТОВ */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-1">
                    {slots.map((slot) => {
                      const timeStr = slot.start_datetime.split(' ')[1]?.substring(0, 5) || '';
                      const isSelected = selectedSlot?.start_stamp === slot.start_stamp;
                      return (
                        <button
                          key={slot.start_stamp}
                          type="button"
                          onClick={() => handleSlotSelect(slot)}
                          className={`px-3 py-2 text-sm rounded-md border transition-all ${
                            isSelected
                              ? 'bg-primary text-text-secondary border-primary shadow-md'
                              : 'bg-white text-text-primary border-gray-300 hover:border-primary hover:bg-primary/5 hover:shadow-sm'
                          }`}
                        >
                          <span className="font-medium">{timeStr}</span>
                          {slot.tables_count !== undefined && slot.tables_count > 0 && (
                            <span className={`block text-xs mt-1 ${isSelected ? 'opacity-90' : 'opacity-60'}`}>
                              {slot.tables_count} {slot.tables_count === 1 ? 'стол' : slot.tables_count < 5 ? 'стола' : 'столов'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Выбор столов после выбора времени */}
                  {selectedSlot && selectedSlot.tables_ids && selectedSlot.tables_ids.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <TableSchemeViewer
                        restaurantId={selectedRestaurant.id}
                        date={formData.date}
                        guestsCount={formData.guests_count}
                        selectedTimestamp={selectedSlot?.start_stamp}
                        selectedTableIds={selectedTableIds}
                        availableTableIds={selectedSlot.tables_ids}
                        tableBundles={
                          selectedSlot.table_bundles
                            ? selectedSlot.table_bundles.map((bundle) =>
                                Array.isArray(bundle) ? bundle : bundle.tables || []
                              )
                            : []
                        }
                        onTableSelect={handleTableToggle}
                        onBundleSelect={handleBundleSelect}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-text-secondary px-4 py-3 rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Отправка...' : 'Забронировать столик'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
```

---

## 2. Бэкенд: Роуты бронирования (`backend/src/routes/booking.ts`)

### Получение доступных временных слотов

```typescript
import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Restaurant } from '../models/Restaurant';
import { remarkedService } from '../services/remarkedService';
import { ReserveData } from '../types/remarked';
import { getRestaurantFromCache, setRestaurantToCache } from '../services/cacheService';

const router = Router();

/**
 * GET /booking/slots
 * Получение доступных временных слотов со столами для бронирования
 * 
 * Query параметры:
 * - restaurantId: string (UUID ресторана) - обязательный
 * - date: string (Дата в формате YYYY-MM-DD) - обязательный
 * - guests_count: number (Количество гостей) - обязательный
 * - with_rooms: boolean (Получить информацию о залах и столах) - опционально, по умолчанию true
 */
router.get('/slots', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { restaurantId, date, guests_count, with_rooms } = req.query;

    // Валидация обязательных параметров
    if (!restaurantId || !date || !guests_count) {
      return res.status(400).json({
        success: false,
        message: 'Отсутствуют обязательные параметры: restaurantId, date, guests_count',
      });
    }

    // Получаем ресторан из кеша или базы данных
    let restaurant: Restaurant | null = null;
    restaurant = await getRestaurantFromCache(restaurantId as string);

    if (!restaurant) {
      const restaurantRepository = AppDataSource.getRepository(Restaurant);
      restaurant = await restaurantRepository.findOne({
        where: { id: restaurantId as string },
      });

      if (restaurant) {
        await setRestaurantToCache(restaurantId as string, restaurant);
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
      const tokenResponse = await remarkedService.getToken(restaurant.remarkedPointId);
      token = tokenResponse.token;
    } catch (error: any) {
      console.error('Ошибка получения токена ReMarked:', error);
      return res.status(500).json({
        success: false,
        message: 'Не удалось подключиться к сервису бронирования. Попробуйте позже.',
      });
    }

    // Формируем период (одна дата)
    const dateStr = date as string;
    const period = {
      from: dateStr,
      to: dateStr,
    };

    const guestsCount = Number(guests_count);
    const withRooms = with_rooms === 'true' || with_rooms === undefined || with_rooms === '';

    // Получаем слоты со столами из ReMarked API
    try {
      const slotsResponse = await remarkedService.getSlots(
        token,
        period,
        guestsCount,
        { with_rooms: withRooms }
      );

      return res.json({
        success: true,
        data: {
          slots: slotsResponse.slots,
          date: dateStr,
          guests_count: guestsCount,
        },
      });
    } catch (error: any) {
      console.error('Ошибка получения слотов ReMarked:', error);
      
      if (error.code === 400) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Неверные параметры запроса',
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message || 'Не удалось получить доступные слоты. Попробуйте позже.',
      });
    }
  } catch (error: any) {
    console.error('[booking/slots] Ошибка получения слотов:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Не удалось получить доступные слоты',
    });
  }
});
```

### Создание бронирования

```typescript
/**
 * POST /booking
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
```

---

## 3. Сервис ReMarked (`backend/src/services/remarkedService.ts`)

### Получение токена

```typescript
import {
  GetTokenRequest,
  GetTokenResponse,
  GetSlotsRequest,
  GetSlotsResponse,
  CreateReserveRequest,
  CreateReserveResponse,
  ReserveData,
  SlotOptions,
  DatePeriod,
  RemarkedError,
} from '../types/remarked';
import {
  getRemarkedTokenFromCache,
  setRemarkedTokenToCache,
} from './cacheService';

export class RemarkedService {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(baseUrl?: string, timeout: number = 30000) {
    this.baseUrl = baseUrl || 'https://app.remarked.ru/api/v1';
    this.timeout = timeout;
  }

  /**
   * Выполняет HTTP запрос к API
   */
  private async request<T>(
    endpoint: string,
    data: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.createError(response.status, errorData);
      }

      const result = await response.json();
      return result as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Получает токен для работы с API конкретного заведения
   * Использует кеширование для оптимизации производительности
   */
  async getToken(
    pointId: number,
    additionalInfo: boolean = false,
    requestId?: string,
    useCache: boolean = true
  ): Promise<GetTokenResponse> {
    // Если не требуется дополнительная информация и кеш включен, пытаемся получить токен из кеша
    if (!additionalInfo && useCache) {
      const cachedToken = await getRemarkedTokenFromCache(pointId);
      if (cachedToken) {
        return {
          token: cachedToken,
        } as GetTokenResponse;
      }
    }

    const request: GetTokenRequest = {
      method: 'GetToken',
      point: pointId,
      additional_info: additionalInfo,
      ...(requestId && { request_id: requestId }),
    };

    const response = await this.request<GetTokenResponse>('/ApiReservesWidget', request);

    // Кешируем токен, если он успешно получен и не требуется дополнительная информация
    if (response.token && !additionalInfo && useCache) {
      await setRemarkedTokenToCache(pointId, response.token);
    }

    return response;
  }

  /**
   * Получает доступные временные слоты для бронирования
   */
  async getSlots(
    token: string,
    period: DatePeriod,
    guestsCount: number,
    options?: SlotOptions
  ): Promise<GetSlotsResponse> {
    const request: GetSlotsRequest = {
      method: 'GetSlots',
      token,
      reserve_date_period: period,
      guests_count: guestsCount,
      ...(options?.with_rooms !== undefined && { with_rooms: options.with_rooms }),
      ...(options?.slot_duration !== undefined && { slot_duration: options.slot_duration }),
    };

    return this.request<GetSlotsResponse>('/ApiReservesWidget', request);
  }

  /**
   * Создает новое бронирование
   */
  async createReserve(
    token: string,
    reserve: ReserveData,
    confirmCode?: number,
    requestId?: string
  ): Promise<CreateReserveResponse> {
    const request: CreateReserveRequest = {
      method: 'CreateReserve',
      token,
      reserve,
      ...(confirmCode !== undefined && { confirm_code: confirmCode }),
      ...(requestId && { request_id: requestId }),
    };

    return this.request<CreateReserveResponse>('/ApiReservesWidget', request);
  }
}

// Экспорт singleton экземпляра
export const remarkedService = new RemarkedService();
```

---

## 4. Типы данных (`frontend/types/booking.ts` и `backend/src/types/remarked.ts`)

### Типы для фронтенда

```typescript
/**
 * Временной слот
 */
export interface Slot {
  start_stamp: number;        // Unix timestamp начала
  end_stamp: number;          // Unix timestamp окончания
  duration: number;            // Длительность в секундах
  start_datetime: string;      // Дата и время начала (формат: YYYY-MM-DD HH:mm:ss)
  end_datetime: string;       // Дата и время окончания (формат: YYYY-MM-DD HH:mm:ss)
  is_free: boolean;           // Свободен ли слот
  tables_count?: number;      // Количество доступных столов
  tables_ids?: number[];      // Массив ID столов
  table_bundles?: TableBundle[] | number[][]; // Группы столов
  rooms?: Room[];             // Информация о залах
}

export interface SlotsResponse {
  success: boolean;
  data: {
    slots: Slot[];
    date: string;
    guests_count: number;
  };
}
```

### Типы для бэкенда (ReMarked API)

```typescript
/**
 * Данные для создания бронирования
 */
export interface ReserveData {
  name: string;                      // Имя клиента - Обязательно
  phone: string;                     // Телефон (формат: +79999999999) - Обязательно
  date: string;                      // Дата (формат: YYYY-MM-DD) - Обязательно
  time: string;                      // Время (формат: HH:mm) - Обязательно
  guests_count: number;              // Количество гостей - Обязательно
  email?: string;                    // Email
  comment?: string;                  // Комментарий
  source?: ReserveSource;            // Источник брони
  duration?: number;                 // Длительность в минутах
  table_ids?: number[];             // Массив ID столов
  eventTags?: number[];             // Массив ID тегов событий
}

/**
 * Ответ на создание бронирования
 */
export interface CreateReserveResponse {
  status: "success";
  reserve_id?: number;               // ID созданного бронирования
  form_url?: string;                 // URL формы оплаты (если требуется депозит)
}
```

---

## 5. Как прорисовывается сетка выбора времени

### Компонент сетки времени (из `booking.tsx`)

```typescript
{/* СЕТКА ВЫБОРА ВРЕМЕННЫХ СЛОТОВ */}
<div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-1">
  {slots.map((slot) => {
    // Извлекаем время из start_datetime (формат: "YYYY-MM-DD HH:mm:ss")
    const timeStr = slot.start_datetime.split(' ')[1]?.substring(0, 5) || '';
    const isSelected = selectedSlot?.start_stamp === slot.start_stamp;
    
    return (
      <button
        key={slot.start_stamp}
        type="button"
        onClick={() => handleSlotSelect(slot)}
        className={`px-3 py-2 text-sm rounded-md border transition-all ${
          isSelected
            ? 'bg-primary text-text-secondary border-primary shadow-md'
            : 'bg-white text-text-primary border-gray-300 hover:border-primary hover:bg-primary/5 hover:shadow-sm'
        }`}
      >
        {/* Отображаем время (HH:mm) */}
        <span className="font-medium">{timeStr}</span>
        
        {/* Отображаем количество доступных столов */}
        {slot.tables_count !== undefined && slot.tables_count > 0 && (
          <span className={`block text-xs mt-1 ${isSelected ? 'opacity-90' : 'opacity-60'}`}>
            {slot.tables_count} {slot.tables_count === 1 ? 'стол' : slot.tables_count < 5 ? 'стола' : 'столов'}
          </span>
        )}
      </button>
    );
  })}
</div>
```

### Логика загрузки и отображения слотов

1. **Загрузка слотов**: При изменении даты или количества гостей вызывается `loadSlots()`
2. **Запрос к API**: `GET /booking/slots` с параметрами `restaurantId`, `date`, `guests_count`, `with_rooms: true`
3. **Фильтрация**: Оставляем только свободные слоты (`slot.is_free === true`)
4. **Отображение**: Слоты отображаются в сетке 3x4 (на мобильных) или 4 колонки (на десктопе)
5. **Выбор слота**: При клике вызывается `handleSlotSelect(slot)`, который:
   - Сохраняет выбранный слот в состояние
   - Извлекает время из `start_datetime` и устанавливает в поле `time`
   - Сбрасывает выбранные столы

---

## 6. Поток данных при бронировании

### Схема процесса

```
1. Пользователь выбирает дату и количество гостей
   ↓
2. Фронтенд: useEffect вызывает loadSlots()
   ↓
3. Фронтенд: api.get('/booking/slots', { restaurantId, date, guests_count, with_rooms: true })
   ↓
4. Бэкенд: GET /booking/slots
   - Получает ресторан из кеша/БД
   - Проверяет remarkedPointId
   - Получает токен от ReMarked API (с кешированием)
   - Вызывает remarkedService.getSlots(token, period, guestsCount, { with_rooms: true })
   ↓
5. ReMarked API: POST /ApiReservesWidget
   {
     method: "GetSlots",
     token: "...",
     reserve_date_period: { from: "2024-01-15", to: "2024-01-15" },
     guests_count: 4,
     with_rooms: true
   }
   ↓
6. ReMarked API возвращает слоты:
   {
     status: "success",
     slots: [
       {
         start_stamp: 1705320000,
         end_stamp: 1705323600,
         duration: 3600,
         start_datetime: "2024-01-15 18:00:00",
         end_datetime: "2024-01-15 19:00:00",
         is_free: true,
         tables_count: 5,
         tables_ids: [101, 102, 103, 104, 105],
         table_bundles: [[101, 102], [103, 104]],
         rooms: [...]
       },
       ...
     ]
   }
   ↓
7. Бэкенд возвращает слоты фронтенду
   ↓
8. Фронтенд фильтрует свободные слоты и отображает их в сетке
   ↓
9. Пользователь выбирает время (слот)
   ↓
10. Пользователь заполняет форму и нажимает "Забронировать"
    ↓
11. Фронтенд: api.post('/booking', { restaurantId, name, phone, date, time, guests_count, table_ids, duration, comment })
    ↓
12. Бэкенд: POST /booking
    - Получает ресторан из кеша/БД
    - Получает токен от ReMarked API
    - Формирует ReserveData:
      {
        name: "Иван Иванов",
        phone: "+79991234567",
        date: "2024-01-15",
        time: "18:00",
        guests_count: 4,
        duration: 60,
        table_ids: [101, 102],
        comment: "...",
        source: "site"
      }
    - Вызывает remarkedService.createReserve(token, reserveData)
    ↓
13. ReMarked API: POST /ApiReservesWidget
    {
      method: "CreateReserve",
      token: "...",
      reserve: {
        name: "Иван Иванов",
        phone: "+79991234567",
        date: "2024-01-15",
        time: "18:00",
        guests_count: 4,
        duration: 60,
        table_ids: [101, 102],
        comment: "...",
        source: "site"
      }
    }
    ↓
14. ReMarked API возвращает результат:
    {
      status: "success",
      reserve_id: 1234567890,
      form_url: "https://..." // если требуется депозит
    }
    ↓
15. Бэкенд возвращает результат фронтенду
    ↓
16. Фронтенд показывает сообщение об успехе и ссылку на оплату депозита (если есть)
```

---

## 7. Ключевые моменты

### Как передаются данные в ReMarked

1. **Токен**: Получается через `GetToken` метод с `pointId` (remarkedPointId ресторана)
2. **Слоты**: Запрашиваются через `GetSlots` с параметрами:
   - `token` - токен от GetToken
   - `reserve_date_period` - период дат `{ from: "YYYY-MM-DD", to: "YYYY-MM-DD" }`
   - `guests_count` - количество гостей
   - `with_rooms: true` - для получения информации о залах и столах
3. **Создание бронирования**: Через `CreateReserve` с данными:
   - `name`, `phone`, `date`, `time`, `guests_count` - обязательные поля
   - `table_ids` - массив ID столов (опционально)
   - `duration` - длительность в минутах (опционально)
   - `comment` - комментарий (опционально)
   - `source: "site"` - источник бронирования

### Как прорисовывается сетка времени

1. **Структура**: CSS Grid с `grid-cols-3 sm:grid-cols-4` (3 колонки на мобильных, 4 на десктопе)
2. **Данные**: Массив `slots`, отфильтрованный по `is_free === true`
3. **Отображение**: Каждый слот отображается как кнопка с:
   - Временем (извлекается из `start_datetime`)
   - Количеством доступных столов (если есть)
   - Визуальным выделением при выборе
4. **Интерактивность**: При клике вызывается `handleSlotSelect`, который:
   - Сохраняет выбранный слот
   - Устанавливает время в поле формы
   - Показывает схему зала для выбора столов (если доступна)

---

## 8. Файлы, участвующие в процессе

- **Фронтенд**:
  - `frontend/pages/booking.tsx` - страница бронирования
  - `frontend/components/TableSchemeViewer.tsx` - компонент выбора столов
  - `frontend/types/booking.ts` - типы данных
  - `frontend/lib/api.ts` - HTTP клиент

- **Бэкенд**:
  - `backend/src/routes/booking.ts` - роуты бронирования
  - `backend/src/services/remarkedService.ts` - сервис для работы с ReMarked API
  - `backend/src/types/remarked.ts` - типы для ReMarked API
  - `backend/src/services/cacheService.ts` - кеширование токенов

---

## Заключение

Процесс бронирования работает следующим образом:

1. **Загрузка слотов**: При выборе даты и количества гостей запрашиваются доступные временные слоты через ReMarked API
2. **Отображение сетки**: Слоты отображаются в виде сетки кнопок с временем и количеством столов
3. **Выбор времени**: Пользователь выбирает слот, после чего может выбрать конкретные столы (если доступна схема зала)
4. **Создание бронирования**: Данные отправляются в ReMarked API через бэкенд, который обрабатывает запрос и возвращает результат

Все данные передаются в ReMarked API через стандартизированные методы: `GetToken`, `GetSlots`, `CreateReserve`.
