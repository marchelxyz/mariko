import { Telegraf, Context } from 'telegraf';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';

let bot: Telegraf | null = null;

/**
 * Инициализация Telegram бота
 */
export const initializeBot = (): void => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN не установлен. Telegram бот не будет запущен.');
    return;
  }

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
        await ctx.reply('❌ Произошла ошибка. Пожалуйста, попробуйте позже.');
      }
    });

    // Обработка ошибок
    bot.catch((err: any, ctx: Context) => {
      console.error('[telegramBot] Error:', err);
      ctx.reply('❌ Произошла ошибка. Пожалуйста, попробуйте позже.');
    });

    // Запуск бота
    bot.launch().then(() => {
      console.log('✅ Telegram бот успешно запущен');
    }).catch((error) => {
      console.error('❌ Ошибка при запуске Telegram бота:', error);
    });

    // Graceful stop
    process.once('SIGINT', () => bot?.stop('SIGINT'));
    process.once('SIGTERM', () => bot?.stop('SIGTERM'));
  } catch (error) {
    console.error('❌ Ошибка при инициализации Telegram бота:', error);
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
    await bot.stop();
    bot = null;
    console.log('✅ Telegram бот остановлен');
  }
};
