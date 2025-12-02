/**
 * Скрипт для извлечения информации о схеме зала из виджета ReMarked
 * 
 * Анализирует конфигурационные файлы виджета и извлекает данные о:
 * - Расположении столов
 * - Схемах залов
 * - Конфигурации виджета
 */

import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

interface TableConfig {
  id: number;
  number?: string;
  x?: number;
  y?: number;
  capacity?: number;
  shape?: 'circle' | 'rectangle';
  width?: number;
  height?: number;
}

interface RoomConfig {
  id: string;
  name: string;
  tables?: TableConfig[];
  imageUrl?: string;
}

interface WidgetConfig {
  pointId: number;
  rooms?: RoomConfig[];
  tables?: TableConfig[];
  hallScheme?: any;
}

/**
 * Загружает файл по URL
 */
function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Извлекает данные из JavaScript файла конфигурации
 */
function extractConfigFromJS(jsContent: string): any {
  // Пытаемся найти объект конфигурации
  // Обычно это что-то вроде window.config = {...} или var config = {...}
  
  const patterns = [
    /window\.config\s*=\s*({[\s\S]*?});/,
    /var\s+config\s*=\s*({[\s\S]*?});/,
    /const\s+config\s*=\s*({[\s\S]*?});/,
    /let\s+config\s*=\s*({[\s\S]*?});/,
    /config\s*=\s*({[\s\S]*?});/,
  ];

  for (const pattern of patterns) {
    const match = jsContent.match(pattern);
    if (match) {
      try {
        // Пытаемся выполнить код для получения объекта
        const configStr = match[1];
        // Заменяем возможные функции на строки
        const cleaned = configStr.replace(/function\s*\([^)]*\)\s*{[^}]*}/g, 'null');
        return eval(`(${cleaned})`);
      } catch (e) {
        console.warn('Не удалось распарсить конфигурацию:', e);
      }
    }
  }

  // Пытаемся найти данные о столах
  const tablesPattern = /tables?\s*[:=]\s*(\[[\s\S]*?\])/;
  const tablesMatch = jsContent.match(tablesPattern);
  if (tablesMatch) {
    try {
      return { tables: eval(tablesMatch[1]) };
    } catch (e) {
      console.warn('Не удалось распарсить таблицы:', e);
    }
  }

  return null;
}

/**
 * Извлекает данные о схеме зала из CSS файла
 */
function extractSchemeFromCSS(cssContent: string): any {
  // Ищем background-image с URL схемы зала
  const bgImagePattern = /background-image:\s*url\(['"]?([^'")]+)['"]?\)/gi;
  const bgImages: string[] = [];
  let match;
  while ((match = bgImagePattern.exec(cssContent)) !== null) {
    bgImages.push(match[1]);
  }

  // Ищем позиции столов через CSS селекторы
  const positionPattern = /\.table-(\d+)\s*\{[^}]*left:\s*([\d.]+)%?[^}]*top:\s*([\d.]+)%?/gi;
  const tables: TableConfig[] = [];
  while ((match = positionPattern.exec(cssContent)) !== null) {
    tables.push({
      id: parseInt(match[1]),
      x: parseFloat(match[2]),
      y: parseFloat(match[3]),
    });
  }

  return {
    backgroundImages: bgImages,
    tables,
  };
}

/**
 * Основная функция извлечения данных
 */
async function extractHallScheme(pointId: number): Promise<WidgetConfig> {
  const config: WidgetConfig = {
    pointId,
  };

  const baseUrl = 'https://remarked.ru/widget/new';
  const configUrl = `${baseUrl}/points/${pointId}/config.marico.js`;
  const cssUrl = `${baseUrl}/points/${pointId}/${pointId}.css`;
  const tablesWidgetUrl = `${baseUrl}/js/tables/Tables.widget.js`;

  console.log(`Извлечение данных для точки ${pointId}...`);
  console.log(`Конфигурация: ${configUrl}`);

  try {
    // Загружаем конфигурационный файл
    console.log('Загрузка конфигурационного файла...');
    const configJs = await fetchUrl(configUrl);
    const jsConfig = extractConfigFromJS(configJs);
    if (jsConfig) {
      Object.assign(config, jsConfig);
      console.log('✓ Конфигурация извлечена из JS');
    }

    // Загружаем CSS файл
    console.log('Загрузка CSS файла...');
    try {
      const cssContent = await fetchUrl(cssUrl);
      const cssData = extractSchemeFromCSS(cssContent);
      if (cssData.backgroundImages.length > 0) {
        console.log(`✓ Найдено ${cssData.backgroundImages.length} фоновых изображений`);
        if (config.rooms && config.rooms.length > 0) {
          config.rooms[0].imageUrl = cssData.backgroundImages[0];
        } else {
          config.hallScheme = { imageUrl: cssData.backgroundImages[0] };
        }
      }
      if (cssData.tables.length > 0) {
        console.log(`✓ Найдено ${cssData.tables.length} столов в CSS`);
        config.tables = cssData.tables;
      }
    } catch (e) {
      console.warn('Не удалось загрузить CSS:', e);
    }

    // Загружаем виджет таблиц
    console.log('Загрузка виджета таблиц...');
    try {
      const tablesWidgetJs = await fetchUrl(tablesWidgetUrl);
      const tablesConfig = extractConfigFromJS(tablesWidgetJs);
      if (tablesConfig) {
        console.log('✓ Данные из виджета таблиц извлечены');
        if (tablesConfig.tables && !config.tables) {
          config.tables = tablesConfig.tables;
        }
      }
    } catch (e) {
      console.warn('Не удалось загрузить виджет таблиц:', e);
    }

  } catch (error: any) {
    console.error(`Ошибка при извлечении данных: ${error.message}`);
    throw error;
  }

  return config;
}

/**
 * Преобразует конфигурацию в формат HallScheme
 */
function convertToHallScheme(config: WidgetConfig): any {
  const hallSchemes: any[] = [];

  if (config.rooms && config.rooms.length > 0) {
    // Если есть информация о залах
    config.rooms.forEach((room) => {
      const tables = (room.tables || config.tables || []).map((table, index) => ({
        tableId: table.id,
        tableNumber: table.number || String(index + 1),
        x: table.x || 0,
        y: table.y || 0,
        capacity: table.capacity,
        shape: table.shape || 'circle',
        width: table.width || 40,
        height: table.height || table.width || 40,
      }));

      hallSchemes.push({
        roomId: room.id,
        roomName: room.name,
        imageUrl: room.imageUrl || config.hallScheme?.imageUrl,
        tables,
      });
    });
  } else if (config.tables && config.tables.length > 0) {
    // Если есть только таблицы без залов
    const tables = config.tables.map((table, index) => ({
      tableId: table.id,
      tableNumber: table.number || String(index + 1),
      x: table.x || 0,
      y: table.y || 0,
      capacity: table.capacity,
      shape: table.shape || 'circle',
      width: table.width || 40,
      height: table.height || table.width || 40,
    }));

    hallSchemes.push({
      roomId: '1',
      roomName: 'Основной зал',
      imageUrl: config.hallScheme?.imageUrl,
      tables,
    });
  }

  return { hallSchemes };
}

// Основная функция
async function main() {
  const args = process.argv.slice(2);
  const pointId = args[0] ? parseInt(args[0]) : 203003;

  if (isNaN(pointId)) {
    console.error('Неверный ID точки. Использование: ts-node extract-hall-scheme.ts <pointId>');
    process.exit(1);
  }

  try {
    const config = await extractHallScheme(pointId);
    
    console.log('\n=== Извлеченная конфигурация ===');
    console.log(JSON.stringify(config, null, 2));

    const hallSchemes = convertToHallScheme(config);
    
    console.log('\n=== Преобразованная схема зала ===');
    console.log(JSON.stringify(hallSchemes, null, 2));

    // Сохраняем в файл
    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, `hall-scheme-${pointId}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(hallSchemes, null, 2), 'utf-8');
    console.log(`\n✓ Данные сохранены в ${outputFile}`);

  } catch (error: any) {
    console.error('Ошибка:', error.message);
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  main();
}

export { extractHallScheme, convertToHallScheme };
