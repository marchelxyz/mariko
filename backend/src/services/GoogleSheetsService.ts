import { google } from 'googleapis';
import { Restaurant } from '../models/Restaurant';
import { MenuItem } from '../models/MenuItem';
import { DishImage } from '../models/DishImage';
import { AppDataSource } from '../config/database';

export class GoogleSheetsService {
  private sheets: any;
  private spreadsheetId: string;

  constructor(spreadsheetId: string, credentials: any) {
    this.spreadsheetId = spreadsheetId;
    
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  /**
   * Создает новый лист для ресторана
   */
  async createSheetForRestaurant(restaurantName: string, restaurantId: string): Promise<string> {
    try {
      // Создаем название листа (убираем спецсимволы, ограничиваем длину)
      const sheetName = this.sanitizeSheetName(`${restaurantName}_${restaurantId.substring(0, 8)}`);
      
      // Проверяем, существует ли лист с таким именем
      const existingSheets = await this.getSheetNames();
      if (existingSheets.includes(sheetName)) {
        throw new Error(`Лист с именем ${sheetName} уже существует`);
      }

      // Создаем новый лист
      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });

      const sheetId = response.data.replies[0].addSheet.properties.sheetId;

      // Добавляем заголовки
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:H1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [
              'ID блюда',
              'Название блюда',
              'Стоимость блюда',
              'Калорийность блюда',
              'Состав блюда',
              'Описание блюда',
              'ID фотографии',
              'Категория блюда',
            ],
          ],
        },
      });

      // Форматируем заголовки (жирный шрифт)
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 8,
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: {
                      bold: true,
                    },
                    backgroundColor: {
                      red: 0.9,
                      green: 0.9,
                      blue: 0.9,
                    },
                  },
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor)',
              },
            },
          ],
        },
      });

      return sheetName;
    } catch (error) {
      console.error('Error creating sheet for restaurant:', error);
      throw error;
    }
  }

  /**
   * Получает список названий всех листов
   */
  async getSheetNames(): Promise<string[]> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      return response.data.sheets.map((sheet: any) => sheet.properties.title);
    } catch (error) {
      console.error('Error getting sheet names:', error);
      throw error;
    }
  }

  /**
   * Синхронизирует меню ресторана из Google Sheets
   */
  async syncMenuFromSheet(restaurant: Restaurant): Promise<{ created: number; updated: number; deleted: number }> {
    if (!restaurant.googleSheetName) {
      throw new Error('У ресторана не указан лист Google Sheets');
    }

    try {
      // Получаем все данные из листа
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${restaurant.googleSheetName}!A2:H`, // Пропускаем заголовок
      });

      const rows = response.data.values || [];
      const menuItemRepository = AppDataSource.getRepository(MenuItem);
      const dishImageRepository = AppDataSource.getRepository(DishImage);

      let created = 0;
      let updated = 0;
      const existingItems = await menuItemRepository.find({
        where: { restaurantId: restaurant.id },
      });

      const processedInternalIds = new Set<string>();

      // Обрабатываем каждую строку
      for (const row of rows) {
        if (!row[0] || !row[1]) continue; // Пропускаем пустые строки

        const internalDishId = String(row[0]).trim();
        const name = String(row[1]).trim();
        const price = parseFloat(String(row[2] || 0));
        const calories = row[3] ? parseFloat(String(row[3])) : null;
        const ingredients = row[4] ? String(row[4]).trim() : null;
        
        // Проверяем, есть ли новая колонка "Описание блюда" (обратная совместимость)
        // Если в строке меньше 8 элементов, значит это старая структура без колонки описания
        const hasDescriptionColumn = row.length >= 8;
        
        const description = hasDescriptionColumn && row[5] ? String(row[5]).trim() : null;
        const dishImageId = hasDescriptionColumn 
          ? (row[6] ? String(row[6]).trim() : null)
          : (row[5] ? String(row[5]).trim() : null);
        // Нормализуем категорию: убираем пробелы и приводим к правильному формату
        const category = hasDescriptionColumn
          ? (row[7] ? String(row[7]).trim() : 'Без категории')
          : (row[6] ? String(row[6]).trim() : 'Без категории');

        processedInternalIds.add(internalDishId);

        // Проверяем существование изображения
        let validDishImageId: string | null = null;
        if (dishImageId) {
          const dishImage = await dishImageRepository.findOne({
            where: { id: dishImageId },
          });
          if (dishImage) {
            validDishImageId = dishImageId;
          }
        }

        // Ищем существующий элемент меню по internalDishId
        let menuItem = existingItems.find(
          (item) => item.internalDishId === internalDishId
        );

        if (menuItem) {
          // Обновляем существующий элемент
          menuItem.name = name;
          menuItem.price = price;
          menuItem.category = category;
          menuItem.calories = calories || undefined;
          menuItem.ingredients = ingredients || undefined;
          menuItem.dishImageId = validDishImageId || undefined;
          // Используем описание из таблицы, если оно есть, иначе состав, иначе название
          menuItem.description = description || ingredients || name;

          await menuItemRepository.save(menuItem);
          updated++;
        } else {
          // Создаем новый элемент
          menuItem = menuItemRepository.create({
            restaurantId: restaurant.id,
            name,
            price,
            category,
            calories: calories || undefined,
            ingredients: ingredients || undefined,
            dishImageId: validDishImageId || undefined,
            // Используем описание из таблицы, если оно есть, иначе состав, иначе название
            description: description || ingredients || name,
            internalDishId,
            isAvailable: true,
          });

          await menuItemRepository.save(menuItem);
          created++;
        }
      }

      // Удаляем элементы, которых больше нет в таблице
      const toDelete = existingItems.filter(
        (item) => item.internalDishId && !processedInternalIds.has(item.internalDishId)
      );
      let deleted = 0;
      for (const item of toDelete) {
        item.isAvailable = false; // Мягкое удаление
        await menuItemRepository.save(item);
        deleted++;
      }

      // Обновляем время последней синхронизации
      restaurant.lastSyncAt = new Date();
      const restaurantRepository = AppDataSource.getRepository(Restaurant);
      await restaurantRepository.save(restaurant);

      return { created, updated, deleted };
    } catch (error) {
      console.error('Error syncing menu from sheet:', error);
      throw error;
    }
  }

  /**
   * Очищает спецсимволы из названия листа
   */
  private sanitizeSheetName(name: string): string {
    // Google Sheets ограничивает название листа 100 символами и запрещает некоторые символы
    return name
      .replace(/[\\\/\?\*\[\]]/g, '_')
      .substring(0, 100);
  }

  /**
   * Получает время последнего изменения листа
   */
  async getSheetLastModified(sheetName: string): Promise<Date> {
    try {
      // К сожалению, Google Sheets API не предоставляет прямого способа узнать время изменения
      // Мы можем использовать время последнего изменения всего документа
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        includeGridData: false,
      });
      
      // Возвращаем текущее время как приблизительное значение
      // В реальности лучше использовать Drive API для получения времени изменения
      return new Date();
    } catch (error) {
      console.error('Error getting sheet last modified:', error);
      return new Date();
    }
  }
}

/**
 * Создает экземпляр GoogleSheetsService из переменных окружения
 */
export function createGoogleSheetsService(): GoogleSheetsService {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_ID не установлен в переменных окружения');
  }

  // Поддерживаем два формата: JSON строка или путь к файлу
  let credentials: any;
  if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
    try {
      // Пробуем распарсить как JSON строку
      credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
    } catch (parseError) {
      throw new Error(
        'GOOGLE_SHEETS_CREDENTIALS должен быть валидным JSON. ' +
        'Убедитесь, что переносы строк в private_key экранированы как \\n'
      );
    }
  } else if (process.env.GOOGLE_SHEETS_CREDENTIALS_PATH) {
    try {
      const fs = require('fs');
      const path = require('path');
      const credentialsPath = path.resolve(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH);
      credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    } catch (fileError) {
      throw new Error(
        `Не удалось прочитать файл учетных данных: ${process.env.GOOGLE_SHEETS_CREDENTIALS_PATH}. ` +
        `Ошибка: ${fileError instanceof Error ? fileError.message : String(fileError)}`
      );
    }
  } else {
    throw new Error(
      'GOOGLE_SHEETS_CREDENTIALS или GOOGLE_SHEETS_CREDENTIALS_PATH должны быть установлены в переменных окружения'
    );
  }

  // Проверяем наличие обязательных полей
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Учетные данные должны содержать client_email и private_key');
  }

  return new GoogleSheetsService(spreadsheetId, credentials);
}
