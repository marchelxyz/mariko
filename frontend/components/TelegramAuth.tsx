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
        
        // Также пытаемся получить данные пользователя напрямую из SDK
        const userData = WebApp.initDataUnsafe?.user || (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        
        if (initData) {
          // Если есть данные пользователя напрямую, добавляем их к initData
          let dataToSend = initData;
          if (userData && typeof initData === 'string') {
            // Если initData - строка, пытаемся добавить photo_url если его нет
            try {
              const params = new URLSearchParams(initData);
              const userParam = params.get('user');
              if (userParam && userData.photo_url) {
                const userObj = JSON.parse(decodeURIComponent(userParam));
                if (!userObj.photo_url && userData.photo_url) {
                  userObj.photo_url = userData.photo_url;
                  params.set('user', encodeURIComponent(JSON.stringify(userObj)));
                  dataToSend = params.toString();
                }
              }
            } catch (e) {
              // Если не удалось обработать, отправляем как есть
            }
          }
          
          const response = await api.post('/auth/telegram', { initData: dataToSend });
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
