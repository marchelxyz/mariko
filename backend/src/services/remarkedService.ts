/**
 * Сервис для работы с ReMarked RESERVES API V1
 * 
 * Этот сервис предоставляет методы для взаимодействия с API бронирования ReMarked.
 * Все методы возвращают типизированные ответы и обрабатывают ошибки.
 * 
 * @example
 * ```typescript
 * const service = new RemarkedService();
 * const token = await service.getToken(7999999, true);
 * const slots = await service.getSlots(token, { from: "2024-06-25", to: "2024-06-25" }, 4);
 * ```
 */

import {
  GetTokenRequest,
  GetTokenResponse,
  GetDaysStatesRequest,
  GetDaysStatesResponse,
  GetSlotsRequest,
  GetSlotsResponse,
  GetSMSCodeRequest,
  GetSMSCodeResponse,
  CreateReserveRequest,
  CreateReserveResponse,
  GetReservesByPhoneRequest,
  GetReservesByPhoneResponse,
  ChangeReserveStatusRequest,
  ChangeReserveStatusResponse,
  GetReserveByIDRequest,
  GetReserveByIDResponse,
  IsReserveReadRequest,
  IsReserveReadResponse,
  GetEventTagsRequest,
  GetEventTagsResponse,
  DatePeriod,
  ReserveData,
  ReserveFilters,
  InnerStatus,
  CancelReason,
  SlotOptions,
  RemarkedError,
} from '../types/remarked';
import {
  getRemarkedTokenFromCache,
  setRemarkedTokenToCache,
  invalidateRemarkedTokenCache,
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
   * Создает объект ошибки на основе статуса ответа
   */
  private createError(status: number, data: any): RemarkedError {
    const baseError = {
      status: 'error' as const,
      date: new Date().toISOString(),
      code: status,
      message: data.message || 'Unknown error',
    };

    switch (status) {
      case 400:
        return { ...baseError, code: 400 } as RemarkedError;
      case 401:
        return { ...baseError, code: 401, message: data.message || 'Empty Bearer Token' } as RemarkedError;
      case 403:
        return { ...baseError, code: 403, message: data.message || 'Access Denied' } as RemarkedError;
      case 404:
        return { ...baseError, code: 404, message: data.message || 'Not Found' } as RemarkedError;
      case 520:
        return { code: baseError, message: data.message || 'Unknown Error' } as RemarkedError;
      default:
        return baseError as RemarkedError;
    }
  }

  /**
   * Получает токен для работы с API конкретного заведения
   * Использует кеширование для оптимизации производительности
   * 
   * @param pointId - ID заведения в системе ReMarked
   * @param additionalInfo - Флаг для получения информации о вместимости
   * @param requestId - IDEMPOTENCY KEY (опционально)
   * @param useCache - Использовать кеш (по умолчанию true)
   * @returns Токен и опционально информацию о вместимости
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
   * Получает информацию о доступности дней в указанном периоде
   * 
   * @param token - Токен, полученный методом getToken
   * @param period - Период дат для проверки
   * @param guestsCount - Количество гостей
   * @returns Информация о доступности дней
   */
  async getDaysStates(
    token: string,
    period: DatePeriod,
    guestsCount: number
  ): Promise<GetDaysStatesResponse> {
    const request: GetDaysStatesRequest = {
      method: 'GetDaysStates',
      token,
      reserve_date_period: period,
      guests_count: guestsCount,
    };

    return this.request<GetDaysStatesResponse>('/ApiReservesWidget', request);
  }

  /**
   * Получает доступные временные слоты для бронирования
   * 
   * @param token - Токен, полученный методом getToken
   * @param period - Период дат для проверки
   * @param guestsCount - Количество гостей
   * @param options - Дополнительные опции (with_rooms, slot_duration)
   * @returns Массив доступных слотов
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
   * Запрашивает SMS-код для подтверждения бронирования
   * 
   * @param token - Токен, полученный методом getToken
   * @param phone - Номер телефона в формате +79189999999
   * @param requestId - IDEMPOTENCY KEY (опционально)
   */
  async getSMSCode(
    token: string,
    phone: string,
    requestId?: string
  ): Promise<GetSMSCodeResponse> {
    const request: GetSMSCodeRequest = {
      method: 'GetSMSCode',
      token,
      phone,
      ...(requestId && { request_id: requestId }),
    };

    return this.request<GetSMSCodeResponse>('/ApiReservesWidget', request);
  }

  /**
   * Создает новое бронирование
   * 
   * @param token - Токен, полученный методом getToken
   * @param reserve - Данные бронирования
   * @param confirmCode - SMS код подтверждения (если требуется)
   * @param requestId - IDEMPOTENCY KEY (опционально)
   * @returns Результат создания бронирования (ID и опционально URL формы оплаты)
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

  /**
   * Получает список бронирований по номеру телефона
   * 
   * @param token - Токен, полученный методом getToken
   * @param phone - Номер телефона
   * @param guestsCount - Количество гостей
   * @param filters - Фильтры и параметры пагинации
   * @param requestId - IDEMPOTENCY KEY (опционально)
   * @returns Список бронирований с метаданными пагинации
   */
  async getReservesByPhone(
    token: string,
    phone: string,
    guestsCount: number,
    filters?: ReserveFilters,
    requestId?: string
  ): Promise<GetReservesByPhoneResponse> {
    const request: GetReservesByPhoneRequest = {
      method: 'GetReservesByPhone',
      token,
      phone,
      guests_count: guestsCount,
      ...(filters?.limit && { limit: filters.limit }),
      ...(filters?.offset && { offset: filters.offset }),
      ...(filters?.sort_by && { sort_by: filters.sort_by }),
      ...(filters?.sort_direction && { sort_direction: filters.sort_direction }),
      ...(filters?.from && { from: filters.from }),
      ...(filters?.to && { to: filters.to }),
      ...(requestId && { request_id: requestId }),
    };

    return this.request<GetReservesByPhoneResponse>('/ApiReservesWidget', request);
  }

  /**
   * Изменяет статус бронирования
   * 
   * @param token - Токен, полученный методом getToken
   * @param reserveId - ID бронирования
   * @param status - Новый статус
   * @param cancelReason - Причина отмены (только для статуса "canceled")
   */
  async changeReserveStatus(
    token: string,
    reserveId: number,
    status: InnerStatus | 'error',
    cancelReason?: CancelReason
  ): Promise<ChangeReserveStatusResponse> {
    const request: ChangeReserveStatusRequest = {
      method: 'ChangeReserveStatus',
      token,
      reserve_id: reserveId,
      status: status as any, // Приведение типа для совместимости с OperationStatus
      ...(cancelReason && { cancel_reason: cancelReason }),
    };

    return this.request<ChangeReserveStatusResponse>('/ApiReservesWidget', request);
  }

  /**
   * Получает информацию о конкретном бронировании по ID
   * 
   * @param token - Токен, полученный методом getToken
   * @param reserveId - ID бронирования
   * @param requestId - IDEMPOTENCY KEY (опционально)
   * @returns Информация о бронировании
   */
  async getReserveById(
    token: string,
    reserveId: number,
    requestId?: string
  ): Promise<GetReserveByIDResponse> {
    const request: GetReserveByIDRequest = {
      method: 'GetReserveByID',
      token,
      reserve_id: reserveId,
      ...(requestId && { request_id: requestId }),
    };

    return this.request<GetReserveByIDResponse>('/ApiReservesWidget', request);
  }

  /**
   * Проверяет, прочитано ли бронирование
   * 
   * @param token - Токен, полученный методом getToken
   * @param reserveId - ID бронирования
   * @param requestId - IDEMPOTENCY KEY (опционально)
   * @returns Результат проверки (is_read: boolean)
   */
  async isReserveRead(
    token: string,
    reserveId: number,
    requestId?: string
  ): Promise<IsReserveReadResponse> {
    const request: IsReserveReadRequest = {
      method: 'IsReserveRead',
      token,
      reserve_id: reserveId,
      ...(requestId && { request_id: requestId }),
    };

    return this.request<IsReserveReadResponse>('/ApiReservesWidget', request);
  }

  /**
   * Получает список тегов событий (использует JSON RPC формат)
   * 
   * @param token - Токен, полученный методом getToken
   * @param requestId - IDEMPOTENCY KEY (опционально)
   * @returns Список тегов событий
   */
  async getEventTags(
    token: string,
    requestId?: string
  ): Promise<GetEventTagsResponse> {
    const request: GetEventTagsRequest = {
      method: 'ReservesWidgetApi.getEventTags',
      jsonrpc: '2.0',
      params: { token },
      ...(requestId && { id: requestId }),
    };

    return this.request<GetEventTagsResponse>('/api', request);
  }
}

// Экспорт singleton экземпляра (опционально)
export const remarkedService = new RemarkedService();
