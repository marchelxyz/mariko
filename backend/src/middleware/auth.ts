import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User';
import { getUserFromCache, setUserToCache, invalidateUserCache } from '../services/cacheService';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  telegramId?: string;
}

/**
 * Проверяет, является ли Telegram ID админом
 * Админы определяются через переменную окружения TELEGRAM_ADMIN_IDS (через запятую)
 */
export const isTelegramAdmin = (telegramId: string | number | undefined | null): boolean => {
  if (!telegramId) {
    console.log('[isTelegramAdmin] Telegram ID is empty or undefined');
    return false;
  }

  // Нормализуем Telegram ID в строку
  const normalizedTelegramId = String(telegramId).trim();
  
  const adminIdsEnv = process.env.TELEGRAM_ADMIN_IDS;
  if (!adminIdsEnv) {
    console.log('[isTelegramAdmin] TELEGRAM_ADMIN_IDS environment variable is not set');
    return false;
  }

  const adminIds = adminIdsEnv.split(',').map(id => id.trim()).filter(id => id.length > 0);
  
  console.log('[isTelegramAdmin] Checking Telegram ID:', normalizedTelegramId);
  console.log('[isTelegramAdmin] Admin IDs from env:', adminIds);
  
  const isAdmin = adminIds.includes(normalizedTelegramId);
  console.log('[isTelegramAdmin] Result:', isAdmin);
  
  return isAdmin;
};

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as { userId: string; role: string };

    // Пытаемся получить пользователя из кеша
    let user: User | null = await getUserFromCache(decoded.userId);

    if (!user) {
      // Если пользователя нет в кеше, получаем из БД
      const userRepository = AppDataSource.getRepository(User);
      user = await userRepository.findOne({
        where: { id: decoded.userId },
      });

      if (!user) {
        res.status(401).json({ success: false, message: 'User not found' });
        return;
      }

      // Сохраняем в кеш для следующих запросов
      await setUserToCache(decoded.userId, user);
    }

    // Проверяем, является ли пользователь админом по Telegram ID
    // Если да, то принудительно устанавливаем роль admin
    let userRole = decoded.role;
    console.log('[authenticate] User Telegram ID:', user.telegramId);
    console.log('[authenticate] Current user role from token:', decoded.role);
    console.log('[authenticate] Current user role from DB:', user.role);
    
    if (isTelegramAdmin(user.telegramId)) {
      console.log('[authenticate] User is admin by Telegram ID, setting role to ADMIN');
      userRole = UserRole.ADMIN;
      // Обновляем роль в БД и кеше, если она изменилась
      if (user.role !== UserRole.ADMIN) {
        console.log('[authenticate] Updating user role in DB to ADMIN');
        user.role = UserRole.ADMIN;
        const userRepository = AppDataSource.getRepository(User);
        await userRepository.save(user);
        // Обновляем кеш
        await setUserToCache(decoded.userId, user);
      }
    } else {
      console.log('[authenticate] User is not admin by Telegram ID');
    }

    req.userId = decoded.userId;
    req.userRole = userRole;
    req.telegramId = user.telegramId;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    next();
  };
};
