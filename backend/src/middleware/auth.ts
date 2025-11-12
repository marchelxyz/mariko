import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  telegramId?: string;
}

/**
 * Проверяет, является ли Telegram ID админом
 * Админы определяются через переменную окружения TELEGRAM_ADMIN_IDS (через запятую)
 */
export const isTelegramAdmin = (telegramId: string): boolean => {
  const adminIds = process.env.TELEGRAM_ADMIN_IDS?.split(',').map(id => id.trim()) || [];
  return adminIds.includes(telegramId);
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

    // Получаем пользователя из БД для проверки Telegram ID
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: decoded.userId },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    // Проверяем, является ли пользователь админом по Telegram ID
    // Если да, то принудительно устанавливаем роль admin
    let userRole = decoded.role;
    if (isTelegramAdmin(user.telegramId)) {
      userRole = UserRole.ADMIN;
      // Обновляем роль в БД, если она изменилась
      if (user.role !== UserRole.ADMIN) {
        user.role = UserRole.ADMIN;
        await userRepository.save(user);
      }
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
