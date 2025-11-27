import axios from 'axios';

/**
 * Сервис для геокодирования адресов через Yandex Geocoding API
 */
export class GeocodingService {
  private apiKey: string | null;
  private baseUrl = 'https://geocode-maps.yandex.ru/1.x';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.YANDEX_GEOCODING_API_KEY || null;
  }

  /**
   * Геокодирует адрес в координаты (latitude, longitude)
   * @param address - Полный адрес (например: "Пенза, Мяснищева, 1")
   * @returns Координаты или null, если не удалось найти
   */
  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
    if (!this.apiKey) {
      console.warn('[GeocodingService] YANDEX_GEOCODING_API_KEY не установлен. Геокодирование недоступно.');
      return null;
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          apikey: this.apiKey,
          geocode: address,
          format: 'json',
          results: 1,
        },
      });

      const featureMembers = response.data?.response?.GeoObjectCollection?.featureMember;
      
      if (!featureMembers || featureMembers.length === 0) {
        console.warn(`[GeocodingService] Адрес не найден: ${address}`);
        return null;
      }

      const geoObject = featureMembers[0].GeoObject;
      const pos = geoObject.Point.pos.split(' '); // Формат: "longitude latitude"
      
      const longitude = parseFloat(pos[0]);
      const latitude = parseFloat(pos[1]);

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
