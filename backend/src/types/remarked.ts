/**
 * Типы и интерфейсы для работы с ReMarked RESERVES API V1
 * Документация: https://app.remarked.ru/api/v1
 */

// ============================================================================
// Базовые типы
// ============================================================================

/**
 * Статус бронирования
 */
export type InnerStatus = 
  | "new"        // Бронь в статусе "Новая"
  | "waiting"    // Бронь в статусе "Ожидание"
  | "confirmed"  // Бронь в статусе "Подтверждена"
  | "started"    // Бронь в статусе "Гость пришел"
  | "closed"     // Бронь в статусе "Закрыта"
  | "canceled";  // Бронь в статусе "Отменена"

/**
 * Статус депозита
 */
export type DepositStatus = 
  | "no_deposit"   // Без депозита
  | "not_paid"     // Не оплачен
  | "paid";        // Оплачен

/**
 * Тип бронирования
 */
export type ReserveType = 
  | "booking"  // Обычное бронирование
  | "banquet"; // Банкет

/**
 * Источник брони
 */
export type ReserveSource = 
  | "site"        // Сайт
  | "mobile_app"; // Мобильное приложение

/**
 * Причина отмены бронирования
 */
export type CancelReason = 
  | "guest_didnt_connect"              // Не вышел на связь
  | "rescheduled_by_guest"             // Перенес резерв
  | "didnt_make_deposit"               // Не внесли депозит
  | "canceled_by_guest"                // Сам отменил резерв
  | "guest_confirmed_but_didnt_come"   // Подтвердил, но не пришел
  | "canceled_by_appwteguide"          // Отмена гостем в приложении WTEGuide
  | "other";                           // Другое

/**
 * Статус операции
 */
export type OperationStatus = 
  | "new" 
  | "waiting" 
  | "confirmed" 
  | "canceled" 
  | "started" 
  | "closed" 
  | "error";

/**
 * Направление сортировки
 */
export type SortDirection = "ASC" | "DESC";

/**
 * Ключ сортировки
 */
export type SortBy = "id" | "estimated_time";

// ============================================================================
// Структуры данных
// ============================================================================

/**
 * Структура столов, сгруппированных по ID зала
 */
export interface TablesStructure {
  [roomId: string]: {
    room_name: string;                    // Название зала
    tables: { [tableId: string]: string }; // ID стола -> номер стола
  };
}

/**
 * Период дат
 */
export interface DatePeriod {
  from: string;  // Дата начала (формат: YYYY-MM-DD)
  to: string;    // Дата окончания (формат: YYYY-MM-DD)
}

/**
 * Информация о вместимости
 */
export interface Capacity {
  min: number;  // Минимальное количество гостей
  max: number;  // Максимальное количество гостей
}

/**
 * Тег события
 */
export interface EventTag {
  id: number;      // ID тега
  name: string;    // Наименование тега
  color: string;   // Цвет тега в формате hex (например: "#ff0000")
}

/**
 * Информация о дне
 */
export interface DayState {
  date: string;    // Дата (формат: YYYY-MM-DD)
  is_free: boolean; // Доступна ли дата для бронирования
}

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
  table_bundles?: any[];      // Группы столов
}

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
  utm?: string;                      // UTM метки
  deposit_sum?: number;              // Сумма депозита
  deposit_status?: DepositStatus;    // Статус депозита
  comment?: string;                  // Комментарий
  type?: ReserveType;                // Тип бронирования
  source?: ReserveSource;            // Источник брони
  duration?: number;                 // Длительность в минутах
  table_ids?: number[];             // Массив ID столов
  eventTags?: number[];             // Массив ID тегов событий
  is_subscription?: boolean;        // Подписка на рассылку
}

/**
 * Информация о бронировании
 */
export interface Reserve {
  id?: number;                       // ID резерва
  surname?: string;                  // Фамилия гостя
  name: string;                     // Имя гостя
  phone: string;                    // Телефон гостя
  email: string;                     // Email гостя
  estimated_time: string;            // Время начала брони
  duration: number | string;         // Длительность (мин)
  guests_count: number | string;    // Кол-во гостей
  inner_status: InnerStatus;        // Статус брони
  tables: TablesStructure;           // Структура столов
  comment: string;                   // Комментарий
  manager: string;                   // Ответственный
  source: string;                    // Источник
  orders?: string;                   // Заказы, связанные с бронью
  cancel_reason?: string;            // Причина отмены
  point?: number;                    // ID заведения (если передан родительский ID)
  restaurant?: string;               // Название заведения (если передан родительский ID)
}

// ============================================================================
// Запросы (Request)
// ============================================================================

/**
 * Запрос на получение токена
 */
export interface GetTokenRequest {
  method: "GetToken";
  point: number;                     // ID заведения (int64) - Обязательно
  additional_info?: boolean;         // Флаг для отображения capacity
  request_id?: string;               // IDEMPOTENCY KEY (UUID)
}

/**
 * Запрос на получение состояний дней
 */
export interface GetDaysStatesRequest {
  method: "GetDaysStates";
  token: string;                     // Токен от GetToken - Обязательно
  reserve_date_period: DatePeriod;   // Период создания резервов - Обязательно
  guests_count: number;              // Количество гостей (int64) - Обязательно
}

/**
 * Запрос на получение слотов
 */
export interface GetSlotsRequest {
  method: "GetSlots";
  token: string;                     // Токен от GetToken - Обязательно
  reserve_date_period: DatePeriod;   // Период создания резервов - Обязательно
  guests_count: number;              // Количество гостей (int64) - Обязательно
  with_rooms?: boolean;              // При true возвращает залы и столы
  slot_duration?: number;           // Длительность слота в секундах (300-86400)
}

/**
 * Запрос на получение SMS кода
 */
export interface GetSMSCodeRequest {
  method: "GetSMSCode";
  token: string;                     // Токен от GetToken - Обязательно
  phone: string;                     // Номер телефона (формат: +79189999999) - Обязательно
  request_id?: string;               // IDEMPOTENCY KEY (UUID)
}

/**
 * Запрос на создание бронирования
 */
export interface CreateReserveRequest {
  method: "CreateReserve";
  token: string;                     // Токен от GetToken - Обязательно
  reserve: ReserveData;               // Данные бронирования - Обязательно
  confirm_code?: number;             // SMS код подтверждения (если требуется)
  request_id?: string;               // IDEMPOTENCY KEY (UUID)
}

/**
 * Фильтры для получения бронирований по телефону
 */
export interface ReserveFilters {
  limit?: string;                    // Лимит записей (по умолчанию: "100", максимум: 1000)
  offset?: string;                   // Отступ (по умолчанию: "0")
  sort_by?: SortBy;                 // Ключ сортировки (по умолчанию: "id")
  sort_direction?: SortDirection;    // Направление сортировки (по умолчанию: "ASC")
  from?: string;                    // Минимальное время начала брони (формат: date)
  to?: string;                      // Максимальное время начала брони (формат: date)
}

/**
 * Запрос на получение бронирований по телефону
 */
export interface GetReservesByPhoneRequest {
  method: "GetReservesByPhone";
  token: string;                     // Токен от GetToken - Обязательно
  phone: string;                     // Номер телефона - Обязательно
  guests_count: number;              // Количество гостей (int64) - Обязательно
  limit?: string;
  offset?: string;
  sort_by?: SortBy;
  sort_direction?: SortDirection;
  from?: string;
  to?: string;
  request_id?: string;               // IDEMPOTENCY KEY (UUID)
}

/**
 * Запрос на изменение статуса бронирования
 */
export interface ChangeReserveStatusRequest {
  method: "ChangeReserveStatus";
  token: string;                     // Токен от GetToken - Обязательно
  reserve_id: number;                // ID резерва/брони (int64) - Обязательно
  status: OperationStatus;           // Статус брони - Обязательно
  cancel_reason?: CancelReason;      // Причина отмены (только для статуса "canceled")
}

/**
 * Запрос на получение бронирования по ID
 */
export interface GetReserveByIDRequest {
  method: "GetReserveByID";
  token: string;                     // Токен от GetToken - Обязательно
  reserve_id: number;                // ID резерва (int64) - Обязательно
  request_id?: string;               // IDEMPOTENCY KEY (UUID)
}

/**
 * Запрос на проверку прочитанности бронирования
 */
export interface IsReserveReadRequest {
  method: "IsReserveRead";
  token: string;                     // Токен от GetToken - Обязательно
  reserve_id: number;                // ID резерва (int64) - Обязательно
  request_id?: string;               // IDEMPOTENCY KEY (UUID)
}

/**
 * Запрос на получение тегов событий (JSON RPC)
 */
export interface GetEventTagsRequest {
  method: "ReservesWidgetApi.getEventTags";
  jsonrpc: "2.0";                    // Версия JSON RPC - Обязательно
  params: {
    token: string;                   // Токен от GetToken - Обязательно
  };
  id?: string;                       // IDEMPOTENCY KEY (UUID)
}

// ============================================================================
// Ответы (Response)
// ============================================================================

/**
 * Ответ на получение токена
 */
export interface GetTokenResponse {
  token: string;                     // Токен для последующих запросов
  capacity?: Capacity;                // Информация о вместимости (если additional_info=true)
}

/**
 * Ответ на получение состояний дней
 */
export interface GetDaysStatesResponse {
  status: "success";
  slots: { [date: string]: DayState };
}

/**
 * Ответ на получение слотов
 */
export interface GetSlotsResponse {
  status: "success";
  slots: Slot[];
}

/**
 * Ответ на получение SMS кода
 */
export interface GetSMSCodeResponse {
  status: "success";
}

/**
 * Ответ на создание бронирования
 */
export interface CreateReserveResponse {
  status: "success";
  reserve_id?: number;               // ID созданного бронирования (int64)
  form_url?: string;                  // URL формы оплаты (если требуется депозит)
}

/**
 * Ответ на получение бронирований по телефону
 */
export interface GetReservesByPhoneResponse {
  total: number;                      // Всего резервов в базе по этому номеру за период
  count: number;                      // Резервов возвращено в ответе
  offset: number;                     // Отступ
  limit: number;                      // Лимит
  reserves: Reserve[];
}

/**
 * Ответ на изменение статуса бронирования
 */
export interface ChangeReserveStatusResponse {
  status: "success";
  reserve_id: number;                // ID резерва/брони (int64)
}

/**
 * Ответ на получение бронирования по ID
 */
export interface GetReserveByIDResponse {
  reserve: Reserve;
}

/**
 * Ответ на проверку прочитанности бронирования
 */
export interface IsReserveReadResponse {
  status: "success";
  is_read: boolean;                  // Прочитан ли резерв
}

/**
 * Ответ на получение тегов событий (JSON RPC)
 */
export interface GetEventTagsResponse {
  jsonrpc: "2.0";
  result: {
    status: "success";
    eventTags: EventTag[];
  };
}

// ============================================================================
// Ошибки
// ============================================================================

/**
 * Базовая структура ошибки
 */
export interface ApiError {
  status: "error";
  date: string;                      // Дата и время (формат: date-time или date)
  code: number;                      // Код ошибки
  message: string;                   // Сообщение об ошибке
}

/**
 * Ошибка 400 (Bad Request)
 */
export interface Error400 extends ApiError {
  code: 400;
}

/**
 * Ошибка 401 (Unauthorized)
 */
export interface Error401 extends ApiError {
  code: 401;
  message: "Empty Bearer Token" | string;
}

/**
 * Ошибка 403 (Forbidden)
 */
export interface Error403 extends ApiError {
  code: 403;
  message: "Access Denied" | string;
}

/**
 * Ошибка 404 (Not Found)
 */
export interface Error404 extends ApiError {
  code: 404;
  message: "Not Found" | string;
}

/**
 * Ошибка 520 (Unknown Error)
 */
export interface Error520 {
  code: ApiError;
  message: string;
}

// ============================================================================
// Утилиты
// ============================================================================

/**
 * Опции для получения слотов
 */
export interface SlotOptions {
  with_rooms?: boolean;
  slot_duration?: number;
}

/**
 * Тип объединения всех возможных запросов
 */
export type RemarkedRequest = 
  | GetTokenRequest
  | GetDaysStatesRequest
  | GetSlotsRequest
  | GetSMSCodeRequest
  | CreateReserveRequest
  | GetReservesByPhoneRequest
  | ChangeReserveStatusRequest
  | GetReserveByIDRequest
  | IsReserveReadRequest;

/**
 * Тип объединения всех возможных ответов
 */
export type RemarkedResponse = 
  | GetTokenResponse
  | GetDaysStatesResponse
  | GetSlotsResponse
  | GetSMSCodeResponse
  | CreateReserveResponse
  | GetReservesByPhoneResponse
  | ChangeReserveStatusResponse
  | GetReserveByIDResponse
  | IsReserveReadResponse;

/**
 * Тип объединения всех возможных ошибок
 */
export type RemarkedError = Error400 | Error401 | Error403 | Error404 | Error520;
