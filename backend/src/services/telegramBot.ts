import { Telegraf, Context } from 'telegraf';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';

let bot: Telegraf | null = null;
let isInitializing = false;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;
const INIT_RETRY_DELAY = 5000; // 5 секунд

/**
 * Инициализация Telegram бота
 */
export const initializeBot = async (): Promise<void> => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN не установлен. Telegram бот не будет запущен.');
    return;
  }

  // Защита от множественных одновременных запусков
  if (isInitializing) {
    console.warn('⚠️  Telegram бот уже инициализируется. Пропускаем повторный запуск.');
    return;
  }

  if (bot) {
    console.warn('⚠️  Telegram бот уже запущен. Пропускаем повторный запуск.');
    return;
  }

  isInitializing = true;
  initializationAttempts++;

  try {
    bot = new Telegraf(botToken);

    // Обработка команды /start
    bot.command('start', async (ctx: Context) => {
      try {
        const telegramId = ctx.from?.id.toString();
        
        if (!telegramId) {
          await ctx.reply('❌ Не удалось определить ваш Telegram ID. Пожалуйста, попробуйте позже.');
          return;
        }

        // Проверяем, существует ли пользователь в БД
        let isNewUser = false;
        if (AppDataSource.isInitialized) {
          try {
            const userRepository = AppDataSource.getRepository(User);
            const existingUser = await userRepository.findOne({
              where: { telegramId },
            });

            if (!existingUser) {
              isNewUser = true;
            }
          } catch (error) {
            console.error('[telegramBot] Error checking user:', error);
          }
        }

        // URL приложения (Web App)
        const webAppUrl = process.env.FRONTEND_URL || 'https://mariko-azure.vercel.app';
        
        // Приветственное сообщение
        const welcomeMessage = isNewUser
          ? `👋 Добро пожаловать в Марико!\n\n` +
            `Мы рады видеть вас в нашем приложении для ресторанов. Здесь вы можете:\n\n` +
            `🍽️ Просматривать меню ресторанов\n` +
            `📅 Бронировать столики\n` +
            `🚚 Заказывать доставку\n` +
            `⭐ Оставлять отзывы\n\n` +
            `Нажмите кнопку ниже, чтобы открыть приложение!`
          : `👋 С возвращением в Марико!\n\n` +
            `Нажмите кнопку ниже, чтобы открыть приложение.`;

        // Отправляем сообщение с кнопкой Web App
        await ctx.reply(welcomeMessage, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🚀 Открыть приложение',
                  web_app: {
                    url: webAppUrl,
                  },
                },
              ],
            ],
          },
        });

        console.log(`[telegramBot] /start command processed for user ${telegramId}, isNewUser: ${isNewUser}`);
      } catch (error) {
        console.error('[telegramBot] Error processing /start command:', error);
        try {
          await ctx.reply('❌ Произошла ошибка. Пожалуйста, попробуйте позже.');
        } catch (replyError) {
          console.error('[telegramBot] Error sending error message:', replyError);
        }
      }
    });

    // Обработка ошибок
    bot.catch((err: any, ctx: Context) => {
      console.error('[telegramBot] Error:', err);
      if (ctx && typeof ctx.reply === 'function') {
        ctx.reply('❌ Произошла ошибка. Пожалуйста, попробуйте позже.').catch((replyError) => {
          console.error('[telegramBot] Error sending error message:', replyError);
        });
      }
    });

    // Запуск бота с обработкой ошибки 409 (конфликт множественных экземпляров)
    try {
      await bot.launch();
      console.log('✅ Telegram бот успешно запущен');
      isInitializing = false;
      initializationAttempts = 0;
    } catch (error: any) {
      isInitializing = false;
      
      // Проверяем, является ли это ошибкой конфликта (409)
      if (error?.response?.error_code === 409 || 
          error?.message?.includes('409') ||
          error?.message?.includes('Conflict') ||
          error?.message?.includes('terminated by other getUpdates')) {
        console.warn('⚠️  Telegram бот уже запущен в другом экземпляре приложения.');
        console.warn('   Это нормально при перезапуске или если запущено несколько реплик.');
        console.warn('   Бот будет работать только в одном экземпляре.');
        
        // Очищаем ссылку на бота, так как он не запущен
        bot = null;
        
        // Пробуем повторно запустить через некоторое время (если не превышен лимит попыток)
        if (initializationAttempts < MAX_INIT_ATTEMPTS) {
          console.log(`   Повторная попытка запуска через ${INIT_RETRY_DELAY / 1000} секунд...`);
          setTimeout(() => {
            initializeBot().catch((retryError) => {
              console.error('❌ Ошибка при повторной попытке запуска бота:', retryError);
            });
          }, INIT_RETRY_DELAY);
        } else {
          console.error(`❌ Превышено максимальное количество попыток запуска бота (${MAX_INIT_ATTEMPTS})`);
        }
        return;
      }
      
      // Для других ошибок логируем и очищаем бота
      console.error('❌ Ошибка при запуске Telegram бота:', error);
      bot = null;
    }

    // Graceful stop - используем once, чтобы избежать множественных обработчиков
    if (!process.listeners('SIGINT').some((listener: any) => listener.name === 'telegramBotSIGINT')) {
      const stopHandler = () => {
        if (bot) {
          bot.stop('SIGINT').catch((err) => {
            console.error('[telegramBot] Error stopping bot:', err);
          });
        }
      };
      stopHandler.name = 'telegramBotSIGINT';
      process.once('SIGINT', stopHandler);
    }

    if (!process.listeners('SIGTERM').some((listener: any) => listener.name === 'telegramBotSIGTERM')) {
      const stopHandler = () => {
        if (bot) {
          bot.stop('SIGTERM').catch((err) => {
            console.error('[telegramBot] Error stopping bot:', err);
          });
        }
      };
      stopHandler.name = 'telegramBotSIGTERM';
      process.once('SIGTERM', stopHandler);
    }
  } catch (error) {
    isInitializing = false;
    console.error('❌ Ошибка при инициализации Telegram бота:', error);
    bot = null;
  }
};

/**
 * Отправка сообщения пользователю
 */
export const sendMessage = async (telegramId: string, message: string): Promise<boolean> => {
  if (!bot) {
    console.warn('[telegramBot] Bot not initialized');
    return false;
  }

  try {
    await bot.telegram.sendMessage(telegramId, message);
    return true;
  } catch (error) {
    console.error(`[telegramBot] Error sending message to ${telegramId}:`, error);
    return false;
  }
};

/**
 * Отправка сообщения с кнопкой Web App
 */
export const sendMessageWithWebAppButton = async (
  telegramId: string,
  message: string,
  buttonText: string = 'Открыть приложение'
): Promise<boolean> => {
  if (!bot) {
    console.warn('[telegramBot] Bot not initialized');
    return false;
  }

  const webAppUrl = process.env.FRONTEND_URL || 'https://mariko-azure.vercel.app';

  try {
    await bot.telegram.sendMessage(telegramId, message, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: buttonText,
              web_app: {
                url: webAppUrl,
              },
            },
          ],
        ],
      },
    });
    return true;
  } catch (error) {
    console.error(`[telegramBot] Error sending message with button to ${telegramId}:`, error);
    return false;
  }
};

/**
 * Остановка бота
 */
export const stopBot = async (): Promise<void> => {
  if (bot) {
    try {
      await bot.stop();
      bot = null;
      isInitializing = false;
      initializationAttempts = 0;
      console.log('✅ Telegram бот остановлен');
    } catch (error) {
      console.error('⚠️  Ошибка при остановке Telegram бота:', error);
      bot = null;
      isInitializing = false;
      initializationAttempts = 0;
    }
  }
};
