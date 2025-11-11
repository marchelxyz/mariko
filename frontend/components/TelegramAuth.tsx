import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import api from '@/lib/api';

export default function TelegramAuth() {
  const router = useRouter();
  const { setToken, setUser } = useStore();

  useEffect(() => {
    const initTelegramAuth = async () => {
      if (typeof window === 'undefined') return;

      try {
        // Динамический импорт SDK только на клиенте
        const { default: WebApp } = await import('@twa-dev/sdk');
        
        // Получаем initData из Telegram WebApp через SDK
        const initData = WebApp.initData || (window as any).Telegram?.WebApp?.initData;
        if (initData) {
          const response = await api.post('/auth/telegram', { initData });
          if (response.data.success) {
            setToken(response.data.token);
            setUser(response.data.user);
          }
        }
      } catch (error) {
        console.error('Telegram auth failed:', error);
      }
    };

    initTelegramAuth();
  }, [setToken, setUser]);

  return null;
}
