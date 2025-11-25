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
  const { selectedRestaurant, prefetchBanners, fetchRestaurants } = useStore();

  useEffect(() => {
    setMounted(true);
    // Инициализация WebApp только на клиенте
    if (typeof window !== 'undefined') {
      import('@twa-dev/sdk').then(({ default: WebApp }) => {
        WebApp.ready();
        
        // Функция для запроса полноэкранного режима
        const requestFullscreenMode = () => {
          try {
            const webApp = WebApp || (window as any).Telegram?.WebApp;
            
            if (!webApp) return;
            
            // Проверяем версию API (Bot API 8.0+ для полноэкранного режима)
            const isVersionSupported = webApp.isVersionAtLeast 
              ? webApp.isVersionAtLeast('8.0')
              : false;
            
            if (isVersionSupported && typeof webApp.requestFullscreen === 'function') {
              // Запрашиваем полноэкранный режим
              if (!webApp.isFullscreen) {
                webApp.requestFullscreen();
              }
              
              // Устанавливаем цвет заголовка для контраста (рекомендация Telegram)
              if (typeof webApp.setHeaderColor === 'function') {
                webApp.setHeaderColor('#FFFFFF'); // Белый цвет для контраста
              }
            } else {
              // Fallback на expand() для старых версий
              if (typeof webApp.expand === 'function' && !webApp.isExpanded) {
                webApp.expand();
              }
            }
            
            // Устанавливаем viewportHeight для корректного отображения
            if (webApp.viewportHeight) {
              document.documentElement.style.setProperty('--tg-viewport-height', `${webApp.viewportHeight}px`);
            }
            
            // Устанавливаем viewportStableHeight если доступен
            if (webApp.viewportStableHeight) {
              document.documentElement.style.setProperty('--tg-viewport-stable-height', `${webApp.viewportStableHeight}px`);
            }
          } catch (error) {
            console.warn('Error requesting fullscreen:', error);
            // Fallback на expand()
            try {
              const webApp = WebApp || (window as any).Telegram?.WebApp;
              if (webApp && typeof webApp.expand === 'function' && !webApp.isExpanded) {
                webApp.expand();
              }
            } catch (e) {
              // Игнорируем ошибку
            }
          }
        };

        // Запрашиваем полноэкранный режим при старте
        // Используем несколько попыток для гарантии, что WebApp полностью готов
        requestFullscreenMode();
        setTimeout(requestFullscreenMode, 100);
        setTimeout(requestFullscreenMode, 500);

        // Слушаем изменения viewport и полноэкранного режима
        if (WebApp.onEvent) {
          WebApp.onEvent('viewportChanged', () => {
            const webApp = WebApp || (window as any).Telegram?.WebApp;
            if (webApp?.viewportHeight) {
              document.documentElement.style.setProperty('--tg-viewport-height', `${webApp.viewportHeight}px`);
            }
            if (webApp?.viewportStableHeight) {
              document.documentElement.style.setProperty('--tg-viewport-stable-height', `${webApp.viewportStableHeight}px`);
            }
          });
          
          // Слушаем изменения полноэкранного режима и автоматически возвращаем в полноэкранный режим
          WebApp.onEvent('fullscreenChanged', () => {
            const webApp = WebApp || (window as any).Telegram?.WebApp;
            console.log('Fullscreen changed:', webApp?.isFullscreen);
            // Если вышли из полноэкранного режима, автоматически возвращаемся
            if (!webApp?.isFullscreen) {
              const isVersionSupported = webApp?.isVersionAtLeast 
                ? webApp.isVersionAtLeast('8.0')
                : false;
              if (isVersionSupported && typeof webApp?.requestFullscreen === 'function') {
                setTimeout(() => {
                  webApp.requestFullscreen();
                }, 100);
              } else if (typeof webApp?.expand === 'function' && !webApp.isExpanded) {
                setTimeout(() => {
                  webApp.expand();
                }, 100);
              }
            }
          });
          
          // Обрабатываем ошибки полноэкранного режима
          WebApp.onEvent('fullscreenFailed', () => {
            console.warn('Fullscreen request failed, falling back to expand');
            const webApp = WebApp || (window as any).Telegram?.WebApp;
            if (webApp && typeof webApp.expand === 'function' && !webApp.isExpanded) {
              webApp.expand();
            }
          });
        }
      }).catch((error) => {
        console.warn('Telegram WebApp SDK not available:', error);
        // Пробуем альтернативный способ через window.Telegram
        try {
          if ((window as any).Telegram?.WebApp) {
            (window as any).Telegram.WebApp.ready();
            const webApp = (window as any).Telegram.WebApp;
            
            // Проверяем версию и запрашиваем полноэкранный режим
            if (webApp.isVersionAtLeast && webApp.isVersionAtLeast('8.0') && typeof webApp.requestFullscreen === 'function') {
              if (!webApp.isFullscreen) {
                webApp.requestFullscreen();
              }
            } else if (typeof webApp.expand === 'function' && !webApp.isExpanded) {
              webApp.expand();
            }
          }
        } catch (e) {
          // Игнорируем ошибку
        }
      });
    }
  }, []);

  // Инициализация данных из кэша при загрузке
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const initializeFromCache = async () => {
      try {
        const { deviceStorage, secureStorage, STORAGE_KEYS, storageHelpers } = await import('@/lib/storage');
        const { useStore } = await import('@/store/useStore');
        
        // Инициализация токена из SecureStorage
        const token = await secureStorage.getItem(STORAGE_KEYS.TOKEN);
        const { token: storeToken } = useStore.getState();
        
        if (token && !storeToken) {
          await useStore.getState().setToken(token);
        }
        
        // Восстановление выбранного ресторана из кэша
        const selectedRestaurantId = await deviceStorage.getItem(STORAGE_KEYS.SELECTED_RESTAURANT_ID);
        const { selectedRestaurant, restaurants } = useStore.getState();
        
        if (selectedRestaurantId && !selectedRestaurant && restaurants.length > 0) {
          const restaurant = restaurants.find(r => r.id === selectedRestaurantId);
          if (restaurant) {
            useStore.getState().setSelectedRestaurant(restaurant);
          }
        }
      } catch (error) {
        console.debug('Failed to initialize from cache:', error);
      }
    };

    initializeFromCache();
  }, [mounted]);

  // Предзагрузка баннеров при инициализации приложения
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    // Загружаем рестораны, если они еще не загружены
    fetchRestaurants().then(() => {
      // После загрузки ресторанов предзагружаем баннеры для выбранного ресторана
      const restaurantId = selectedRestaurant?.id;
      prefetchBanners(restaurantId);
    });
  }, [mounted, fetchRestaurants, selectedRestaurant, prefetchBanners]);

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
