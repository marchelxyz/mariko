/**
 * Простой пример извлечения информации о схеме зала из HTML виджета ReMarked
 * 
 * Этот скрипт демонстрирует, как можно извлечь базовую информацию
 * из HTML кода виджета без необходимости загружать внешние файлы.
 */

// HTML код виджета (из вашего примера)
const widgetHTML = `<!DOCTYPE html>
<html lang="ru-RU">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Забронировать</title>
	<script defer="defer" src="https://remarked.ru/widget/new/js/newidget.js"></script>
	<script defer="defer" src="https://remarked.ru/widget/new/points/203003/config.marico.js"></script>
	<link href="https://remarked.ru/widget/new/css/stylesheet.css" rel="stylesheet">
	<link href="https://remarked.ru/widget/new/points/203003/203003.css" rel="stylesheet">
	<link rel="stylesheet" href="https://remarked.ru/widget/new/css/tables/Tables.widget.css">
    <script src="https://remarked.ru/widget/new/js/tables/newidget.js"></script>
    <script src="https://remarked.ru/widget/new/js/tables/Tables.widget.js"></script>
</head>
<body style="background-image: url(https://access.clientomer.ru/widget/203003/bg1.png);position: relative;margin: 0;padding: 0;background-size: cover;background-repeat: no-repeat;background-position: center;">
	<section style="min-height: 100vh;display: flex;align-items: center;justify-content: center;flex-direction: column;">
		<div id="logo">
			<img src="https://access.clientomer.ru/widget/203003/logo.png" style="width: 100%;max-width: 290px;">
		</div>
		<a href='#openReMarkedWidget' class="open__primary__widget">Забронировать</a>
	</section>
</body>
</html>`;

/**
 * Извлекает базовую информацию из HTML
 */
function extractBasicInfo(html: string) {
  const info: any = {};

  // 1. Извлекаем Point ID из URL конфигурационных файлов
  const pointIdMatch = html.match(/\/points\/(\d+)\//);
  if (pointIdMatch) {
    info.pointId = parseInt(pointIdMatch[1]);
  }

  // 2. Извлекаем фоновое изображение
  const bgImageMatch = html.match(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/i);
  if (bgImageMatch) {
    info.backgroundImage = bgImageMatch[1];
  }

  // 3. Извлекаем логотип
  const logoMatch = html.match(/<img[^>]+src=['"]([^'"]*logo[^'"]+)['"]/i);
  if (logoMatch) {
    info.logoUrl = logoMatch[1];
  }

  // 4. Извлекаем URL конфигурационных файлов
  const configUrls: string[] = [];
  const configPattern = /https:\/\/remarked\.ru\/widget\/new\/points\/\d+\/[^"'\s<>]+/g;
  let match;
  while ((match = configPattern.exec(html)) !== null) {
    configUrls.push(match[0]);
  }
  info.configUrls = [...new Set(configUrls)];

  // 5. Извлекаем URL CSS файлов
  const cssUrls: string[] = [];
  const cssPattern = /https:\/\/remarked\.ru\/widget\/new\/[^"'\s<>]+\.css/g;
  while ((match = cssPattern.exec(html)) !== null) {
    cssUrls.push(match[0]);
  }
  info.cssUrls = [...new Set(cssUrls)];

  // 6. Извлекаем URL JS файлов виджетов
  const jsUrls: string[] = [];
  const jsPattern = /https:\/\/remarked\.ru\/widget\/new\/js\/[^"'\s<>]+\.js/g;
  while ((match = jsPattern.exec(html)) !== null) {
    jsUrls.push(match[0]);
  }
  info.widgetUrls = [...new Set(jsUrls)];

  return info;
}

/**
 * Формирует базовую схему зала на основе извлеченной информации
 */
function createBasicHallScheme(info: any) {
  return {
    hallSchemes: [
      {
        roomId: '1',
        roomName: 'Основной зал',
        imageUrl: info.backgroundImage,
        tables: [], // Таблицы нужно получить из API или конфигурационных файлов
      },
    ],
    metadata: {
      pointId: info.pointId,
      logoUrl: info.logoUrl,
      configUrls: info.configUrls,
      note: 'Для получения полной информации о столах используйте ReMarked API или загрузите конфигурационные файлы',
    },
  };
}

// Основная функция
function main() {
  console.log('=== Извлечение информации из HTML виджета ===\n');

  const info = extractBasicInfo(widgetHTML);

  console.log('Извлеченная информация:');
  console.log(JSON.stringify(info, null, 2));

  console.log('\n=== Базовая схема зала ===');
  const scheme = createBasicHallScheme(info);
  console.log(JSON.stringify(scheme, null, 2));

  console.log('\n=== Рекомендации ===');
  console.log(`
Для получения полной информации о схеме зала:

1. Используйте Point ID (${info.pointId}) для запроса к ReMarked API:
   - Получите токен: getToken(${info.pointId})
   - Получите слоты с залами: getSlots(token, period, guests, { with_rooms: true })

2. Загрузите конфигурационные файлы для получения позиций столов:
   ${info.configUrls.map((url: string) => `   - ${url}`).join('\n')}

3. Используйте синхронизацию схем залов:
   POST /restaurants/:id/sync-hall-schemes

4. Или используйте скрипты для автоматического извлечения:
   npx ts-node scripts/extract-hall-scheme.ts ${info.pointId}
   npx ts-node scripts/analyze-remarked-widget.ts widget.html
  `);
}

// Запуск скрипта
main();

export { extractBasicInfo, createBasicHallScheme };
