import axios from 'axios';

/**
 * Сервис для геокодирования адресов через Nominatim (OpenStreetMap)
 * Бесплатный сервис, не требует API ключа
 */
export class GeocodingService {
  private baseUrl = 'https://nominatim.openstreetmap.org/search';

  constructor() {
    // Не требует API ключа
  }

  /**
   * Геокодирует адрес в координаты (latitude, longitude)
   * @param address - Полный адрес (например: "Пенза, Мяснищева, 1")
   * @returns Координаты или null, если не удалось найти
   */
  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      // Nominatim требует User-Agent для идентификации приложения
      const response = await axios.get(this.baseUrl, {
        params: {
          q: address,
          format: 'json',
          limit: 1,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'Mariko Restaurant App (geocoding)', // Требуется Nominatim
        },
      });

      const results = response.data;
      
      if (!results || !Array.isArray(results) || results.length === 0) {
        console.warn(`[GeocodingService] Адрес не найден: ${address}`);
        return null;
      }

      const firstResult = results[0];
      const latitude = parseFloat(firstResult.lat);
      const longitude = parseFloat(firstResult.lon);

      if (isNaN(latitude) || isNaN(longitude)) {
        console.error(`[GeocodingService] Неверный формат координат для адреса: ${address}`);
        return null;
      }

      console.log(`[GeocodingService] Адрес "${address}" геокодирован: ${latitude}, ${longitude}`);
      
      return { latitude, longitude };
    } catch (error: any) {
      console.error(`[GeocodingService] Ошибка при геокодировании адреса "${address}":`, error.message);
      return null;
    }
  }

  /**
   * Геокодирует адрес ресторана (город + адрес)
   * @param city - Город
   * @param address - Адрес
   * @returns Координаты или null
   */
  async geocodeRestaurantAddress(city: string, address: string): Promise<{ latitude: number; longitude: number } | null> {
    const fullAddress = `${city}, ${address}`;
    return this.geocodeAddress(fullAddress);
  }
}

/**
 * Создает экземпляр GeocodingService из переменных окружения
 */
export function createGeocodingService(): GeocodingService {
  return new GeocodingService();
}
