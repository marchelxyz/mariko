import { useEffect, useState } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useStore } from '@/store/useStore';
import '../styles/globals.css';

// Динамический импорт TelegramAuth только на клиенте
const TelegramAuth = dynamic(() => import('@/components/TelegramAuth'), {
  ssr: false,
});

function MyApp({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { selectedRestaurant, prefetchBanners, fetchRestaurants, fetchProfile, token } = useStore();

  useEffect(() => {
    setMounted(true);
    // Инициализация WebApp только на клиенте
    if (typeof window !== 'undefined') {
      import('@twa-dev/sdk').then(({ default: WebApp }) => {
        WebApp.ready();
      }).catch((error) => {
        console.warn('Telegram WebApp SDK not available:', error);
      });
    }
  }, []);

  // Предзагрузка баннеров при инициализации приложения
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    // Если пользователь авторизован, загружаем его профиль для получения любимого ресторана
    const loadUserProfile = async () => {
      if (token) {
        try {
          await fetchProfile();
        } catch (error) {
          console.error('Failed to fetch profile on app init:', error);
        }
      }
    };

    loadUserProfile();

    // Проверяем кэш любимого ресторана перед загрузкой
    const cachedRestaurantStr = localStorage.getItem('cachedRestaurant');
    const cachedRestaurantId = localStorage.getItem('favoriteRestaurantId');
    
    if (cachedRestaurantStr && cachedRestaurantId) {
      try {
        const cachedRestaurant = JSON.parse(cachedRestaurantStr);
        // Устанавливаем кэшированный ресторан сразу для быстрой загрузки
        const { setSelectedRestaurant } = useStore.getState();
        setSelectedRestaurant(cachedRestaurant);
      } catch (error) {
        console.error('Failed to parse cached restaurant:', error);
      }
    }

    // Загружаем рестораны, если они еще не загружены
    fetchRestaurants().then(() => {
      // После загрузки ресторанов предзагружаем баннеры для выбранного ресторана
      const restaurantId = selectedRestaurant?.id || cachedRestaurantId;
      prefetchBanners(restaurantId);
    });
  }, [mounted, token, fetchProfile, fetchRestaurants, selectedRestaurant, prefetchBanners]);

  // Предзагрузка баннеров при переключении на главную страницу
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const handleRouteChangeStart = (url: string) => {
      // Если переходим на главную страницу, предзагружаем баннеры
      if (url === '/' || url === '/index') {
        const restaurantId = selectedRestaurant?.id;
        prefetchBanners(restaurantId);
      }
    };

    // Предзагружаем баннеры при изменении выбранного ресторана
    const restaurantId = selectedRestaurant?.id;
    if (restaurantId) {
      prefetchBanners(restaurantId);
    }

    router.events.on('routeChangeStart', handleRouteChangeStart);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
    };
  }, [mounted, router, selectedRestaurant, prefetchBanners]);

  return (
    <>
      {mounted && <TelegramAuth />}
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
