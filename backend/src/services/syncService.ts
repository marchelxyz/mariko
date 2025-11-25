import { AppDataSource } from '../config/database';
import { Restaurant } from '../models/Restaurant';
import { createGoogleSheetsService } from './GoogleSheetsService';
import { 
  invalidateMenuCache, 
  invalidateAllMenuCache,
  invalidateMenuPageCache,
  invalidateAllMenuPageCache
} from './cacheService';

/**
 * Синхронизирует меню всех ресторанов из Google Sheets
 */
export async function syncAllRestaurantsMenu(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Начало синхронизации меню всех ресторанов...`);
  
  try {
    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    const restaurants = await restaurantRepository.find({
      where: { isActive: true },
    });

    const restaurantsWithSheets = restaurants.filter(
      (r) => r.googleSheetName && r.googleSheetId
    );

    console.log(`Найдено ${restaurantsWithSheets.length} ресторанов с настроенными Google Sheets`);

    const sheetsService = createGoogleSheetsService();
    let successCount = 0;
    let errorCount = 0;

    for (const restaurant of restaurantsWithSheets) {
      try {
        console.log(`Синхронизация меню для ресторана: ${restaurant.name} (${restaurant.id})`);
        const result = await sheetsService.syncMenuFromSheet(restaurant);
        console.log(
          `Ресторан ${restaurant.name}: создано ${result.created}, обновлено ${result.updated}, удалено ${result.deleted}`
        );
        
        // Инвалидируем кэш меню и страницы меню для этого ресторана
        await invalidateMenuCache(restaurant.id);
        await invalidateMenuPageCache(restaurant.id);
        
        successCount++;
      } catch (error) {
        console.error(
          `Ошибка синхронизации для ресторана ${restaurant.name} (${restaurant.id}):`,
          error
        );
        errorCount++;
      }
    }

    // Инвалидируем весь кэш меню и страниц меню после синхронизации всех ресторанов
    await invalidateAllMenuCache();
    await invalidateAllMenuPageCache();

    console.log(
      `[${new Date().toISOString()}] Синхронизация завершена. Успешно: ${successCount}, Ошибок: ${errorCount}`
    );
  } catch (error) {
    console.error('Критическая ошибка при синхронизации всех ресторанов:', error);
    throw error;
  }
}

/**
 * Синхронизирует меню конкретного ресторана
 */
export async function syncRestaurantMenu(restaurantId: string): Promise<void> {
  try {
    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    const restaurant = await restaurantRepository.findOne({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new Error(`Ресторан с ID ${restaurantId} не найден`);
    }

    if (!restaurant.googleSheetName) {
      throw new Error(`У ресторана ${restaurant.name} не настроен лист Google Sheets`);
    }

    const sheetsService = createGoogleSheetsService();
    const result = await sheetsService.syncMenuFromSheet(restaurant);
    
    // Инвалидируем кэш меню и страницы меню для этого ресторана
    await invalidateMenuCache(restaurantId);
    await invalidateMenuPageCache(restaurantId);
    
    console.log(
      `Синхронизация меню для ресторана ${restaurant.name} завершена: создано ${result.created}, обновлено ${result.updated}, удалено ${result.deleted}`
    );
  } catch (error) {
    console.error(`Ошибка синхронизации меню для ресторана ${restaurantId}:`, error);
    throw error;
  }
}
