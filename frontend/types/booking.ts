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
