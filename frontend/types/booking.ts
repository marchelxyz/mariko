/**
 * Типы для работы с бронированием
 */

export interface Slot {
  start_stamp: number;
  end_stamp: number;
  duration: number;
  start_datetime: string;
  end_datetime: string;
  is_free: boolean;
  tables_count?: number;
  tables_ids?: number[];
  table_bundles?: any[];
}

export interface SlotsResponse {
  success: boolean;
  data: {
    slots: Slot[];
    date: string;
    guests_count: number;
  };
}

/**
 * Типы для схем залов
 */

export interface TablePosition {
  tableId: number;                  // ID стола в ReMarked
  tableNumber: string;              // Номер стола (для отображения)
  x: number;                        // Позиция X на схеме (в процентах)
  y: number;                        // Позиция Y на схеме (в процентах)
  capacity?: number;                // Вместимость стола (опционально)
  shape?: 'circle' | 'rectangle';  // Форма стола (опционально)
  width?: number;                   // Ширина стола в пикселях (опционально)
  height?: number;                  // Высота стола в пикселях (опционально)
}

export interface HallScheme {
  roomId: string;                    // ID зала в ReMarked
  roomName: string;                  // Название зала
  imageUrl?: string;                 // URL изображения схемы зала (опционально)
  width?: number;                    // Ширина схемы в пикселях (для масштабирования)
  height?: number;                   // Высота схемы в пикселях (для масштабирования)
  tables: TablePosition[];          // Массив столов в зале
}

export interface HallSchemesResponse {
  success: boolean;
  data: {
    restaurantId: string;
    restaurantName: string;
    hallSchemes: HallScheme[];
  };
}
