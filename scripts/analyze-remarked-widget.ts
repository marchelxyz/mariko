/**
 * Анализ виджета ReMarked для извлечения информации о схеме зала
 * 
 * Этот скрипт анализирует HTML страницу с виджетом ReMarked и извлекает:
 * 1. ID точки (pointId) из URL конфигурационных файлов
 * 2. Данные о схеме зала из конфигурационных файлов
 * 3. Данные через ReMarked API (если доступны)
 */

import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

interface ExtractedData {
  pointId?: number;
  configUrls?: string[];
  cssUrls?: string[];
  widgetUrls?: string[];
  backgroundImage?: string;
  logoUrl?: string;
}

/**
 * Извлекает ID точки и URL файлов из HTML
 */
function extractFromHTML(html: string): ExtractedData {
  const data: ExtractedData = {};

  // Извлекаем ID точки из URL конфигурационных файлов
  const configUrlPattern = /remarked\.ru\/widget\/new\/points\/(\d+)\//g;
  const pointIdMatches = html.match(configUrlPattern);
  if (pointIdMatches) {
    const pointIdMatch = pointIdMatches[0].match(/\/(\d+)\//);
    if (pointIdMatch) {
      data.pointId = parseInt(pointIdMatch[1]);
    }
  }

  // Извлекаем все URL конфигурационных файлов
  const configPattern = /https:\/\/remarked\.ru\/widget\/new\/points\/\d+\/[^"'\s]+/g;
  const configUrls = html.match(configPattern);
  if (configUrls) {
    data.configUrls = [...new Set(configUrls)];
  }

  // Извлекаем CSS файлы
  const cssPattern = /https:\/\/remarked\.ru\/widget\/new\/[^"'\s]+\.css/g;
  const cssUrls = html.match(cssPattern);
  if (cssUrls) {
    data.cssUrls = [...new Set(cssUrls)];
  }

  // Извлекаем JS файлы виджетов
  const jsPattern = /https:\/\/remarked\.ru\/widget\/new\/js\/[^"'\s]+\.js/g;
  const jsUrls = html.match(jsPattern);
  if (jsUrls) {
    data.widgetUrls = [...new Set(jsUrls)];
  }

  // Извлекаем фоновое изображение
  const bgImagePattern = /background-image:\s*url\(['"]?([^'")]+)['"]?\)/gi;
  const bgMatch = html.match(bgImagePattern);
  if (bgMatch) {
    const urlMatch = bgMatch[0].match(/url\(['"]?([^'")]+)['"]?\)/i);
    if (urlMatch) {
      data.backgroundImage = urlMatch[1];
    }
  }

  // Извлекаем URL логотипа
  const logoPattern = /<img[^>]+src=['"]([^'"]+logo[^'"]+)['"]/i;
  const logoMatch = html.match(logoPattern);
  if (logoMatch) {
    data.logoUrl = logoMatch[1];
  }

  return data;
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
 * Парсит JavaScript файл и извлекает конфигурацию
 */
function parseJSConfig(jsContent: string): any {
  const config: any = {};

  // Ищем объекты конфигурации
  const patterns = [
    {
      name: 'window.config',
      regex: /window\.config\s*=\s*({[\s\S]*?});/,
    },
    {
      name: 'var config',
      regex: /var\s+config\s*=\s*({[\s\S]*?});/,
    },
    {
      name: 'const config',
      regex: /const\s+config\s*=\s*({[\s\S]*?});/,
    },
    {
      name: 'tables',
      regex: /tables?\s*[:=]\s*(\[[\s\S]*?\])/,
    },
    {
      name: 'rooms',
      regex: /rooms?\s*[:=]\s*(\[[\s\S]*?\])/,
    },
  ];

  for (const pattern of patterns) {
    const match = jsContent.match(pattern.regex);
    if (match) {
      try {
        const value = eval(`(${match[1]})`);
        config[pattern.name] = value;
        console.log(`✓ Найдено: ${pattern.name}`);
      } catch (e) {
        // Игнорируем ошибки парсинга
      }
    }
  }

  return config;
}

/**
 * Парсит CSS файл и извлекает информацию о позициях
 */
function parseCSSConfig(cssContent: string): any {
  const config: any = {
    backgroundImages: [],
    tablePositions: [],
  };

  // Ищем background-image
  const bgPattern = /background-image:\s*url\(['"]?([^'")]+)['"]?\)/gi;
  let match;
  while ((match = bgPattern.exec(cssContent)) !== null) {
    config.backgroundImages.push(match[1]);
  }

  // Ищем позиции столов
  const tablePattern = /\.table[_-]?(\d+)\s*\{[^}]*left:\s*([\d.]+)(%|px)[^}]*top:\s*([\d.]+)(%|px)/gi;
  while ((match = tablePattern.exec(cssContent)) !== null) {
    config.tablePositions.push({
      id: parseInt(match[1]),
      x: parseFloat(match[2]),
      xUnit: match[3],
      y: parseFloat(match[4]),
      yUnit: match[5],
    });
  }

  return config;
}

/**
 * Основная функция анализа
 */
async function analyzeWidget(html: string): Promise<any> {
  console.log('Анализ HTML виджета...\n');

  // Извлекаем данные из HTML
  const extracted = extractFromHTML(html);
  
  console.log('=== Извлеченные данные из HTML ===');
  console.log(`Point ID: ${extracted.pointId || 'не найден'}`);
  console.log(`Конфигурационные файлы: ${extracted.configUrls?.length || 0}`);
  console.log(`CSS файлы: ${extracted.cssUrls?.length || 0}`);
  console.log(`JS виджеты: ${extracted.widgetUrls?.length || 0}`);
  if (extracted.backgroundImage) {
    console.log(`Фоновое изображение: ${extracted.backgroundImage}`);
  }
  if (extracted.logoUrl) {
    console.log(`Логотип: ${extracted.logoUrl}`);
  }

  const result: any = {
    pointId: extracted.pointId,
    extracted,
    configs: {},
    css: {},
  };

  // Загружаем и анализируем конфигурационные файлы
  if (extracted.configUrls) {
    console.log('\n=== Анализ конфигурационных файлов ===');
    for (const url of extracted.configUrls) {
      try {
        console.log(`Загрузка: ${url}`);
        const content = await fetchUrl(url);
        const config = parseJSConfig(content);
        if (Object.keys(config).length > 0) {
          result.configs[url] = config;
        }
      } catch (error: any) {
        console.warn(`  ✗ Ошибка: ${error.message}`);
      }
    }
  }

  // Загружаем и анализируем CSS файлы
  if (extracted.cssUrls) {
    console.log('\n=== Анализ CSS файлов ===');
    for (const url of extracted.cssUrls) {
      try {
        console.log(`Загрузка: ${url}`);
        const content = await fetchUrl(url);
        const cssConfig = parseCSSConfig(content);
        if (cssConfig.backgroundImages.length > 0 || cssConfig.tablePositions.length > 0) {
          result.css[url] = cssConfig;
        }
      } catch (error: any) {
        console.warn(`  ✗ Ошибка: ${error.message}`);
      }
    }
  }

  return result;
}

/**
 * Преобразует извлеченные данные в формат HallScheme
 */
function convertToHallScheme(analysisResult: any): any {
  const hallSchemes: any[] = [];
  const tables: any[] = [];

  // Собираем информацию о столах из всех источников
  for (const config of Object.values(analysisResult.configs || {}) as any[]) {
    if (config.tables && Array.isArray(config.tables)) {
      tables.push(...config.tables);
    }
  }

  // Собираем позиции из CSS
  for (const css of Object.values(analysisResult.css || {}) as any[]) {
    if (css.tablePositions && Array.isArray(css.tablePositions)) {
      css.tablePositions.forEach((pos: any) => {
        const existingTable = tables.find(t => t.id === pos.id);
        if (existingTable) {
          existingTable.x = pos.xUnit === '%' ? pos.x : (pos.x / 10); // Примерное преобразование
          existingTable.y = pos.yUnit === '%' ? pos.y : (pos.y / 10);
        } else {
          tables.push({
            id: pos.id,
            tableNumber: String(pos.id),
            x: pos.xUnit === '%' ? pos.x : 0,
            y: pos.yUnit === '%' ? pos.y : 0,
          });
        }
      });
    }
  }

  // Получаем фоновое изображение
  let imageUrl = analysisResult.extracted?.backgroundImage;
  if (!imageUrl) {
    for (const css of Object.values(analysisResult.css || {}) as any[]) {
      if (css.backgroundImages && css.backgroundImages.length > 0) {
        imageUrl = css.backgroundImages[0];
        break;
      }
    }
  }

  if (tables.length > 0) {
    hallSchemes.push({
      roomId: '1',
      roomName: 'Основной зал',
      imageUrl,
      tables: tables.map((table, index) => ({
        tableId: table.id || index + 1,
        tableNumber: table.number || table.tableNumber || String(table.id || index + 1),
        x: table.x || 0,
        y: table.y || 0,
        capacity: table.capacity,
        shape: table.shape || 'circle',
        width: table.width || 40,
        height: table.height || table.width || 40,
      })),
    });
  }

  return { hallSchemes };
}

// Основная функция
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Использование: ts-node analyze-remarked-widget.ts <html-file>');
    console.error('Или: ts-node analyze-remarked-widget.ts --html "<html content>"');
    process.exit(1);
  }

  let html: string;

  if (args[0] === '--html') {
    html = args.slice(1).join(' ');
  } else {
    const htmlFile = path.resolve(args[0]);
    if (!fs.existsSync(htmlFile)) {
      console.error(`Файл не найден: ${htmlFile}`);
      process.exit(1);
    }
    html = fs.readFileSync(htmlFile, 'utf-8');
  }

  try {
    const result = await analyzeWidget(html);
    
    console.log('\n=== Результат анализа ===');
    console.log(JSON.stringify(result, null, 2));

    const hallSchemes = convertToHallScheme(result);
    
    console.log('\n=== Преобразованная схема зала ===');
    console.log(JSON.stringify(hallSchemes, null, 2));

    // Сохраняем результаты
    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const analysisFile = path.join(outputDir, 'widget-analysis.json');
    fs.writeFileSync(analysisFile, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`\n✓ Анализ сохранен в ${analysisFile}`);

    if (hallSchemes.hallSchemes && hallSchemes.hallSchemes.length > 0) {
      const schemeFile = path.join(outputDir, 'hall-scheme.json');
      fs.writeFileSync(schemeFile, JSON.stringify(hallSchemes, null, 2), 'utf-8');
      console.log(`✓ Схема зала сохранена в ${schemeFile}`);
    }

  } catch (error: any) {
    console.error('Ошибка:', error.message);
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  main();
}

export { analyzeWidget, extractFromHTML, convertToHallScheme };
