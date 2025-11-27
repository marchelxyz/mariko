import { useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import ActionButtons from '@/components/ActionButtons';
import Banners from '@/components/Banners';
import MenuBlock from '@/components/MenuBlock';

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
}

interface Restaurant {
  id: string;
  _id?: string;
  name: string;
  city: string;
  address: string;
  phoneNumber: string;
  latitude?: number;
  longitude?: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  calories?: number;
}

interface HomeProps {
  initialBanners: Banner[];
  initialRestaurants: Restaurant[];
  initialMenuItems: MenuItem[];
  initialSelectedRestaurantId: string | null;
  initialFavoriteRestaurant: Restaurant | null;
  restaurantId?: string;
}

export default function Home({
  initialBanners,
  initialRestaurants,
  initialMenuItems,
  initialSelectedRestaurantId,
  initialFavoriteRestaurant,
  restaurantId,
}: HomeProps) {
  const {
    selectedRestaurant,
    setBannersForRestaurant,
    setRestaurants,
    setSelectedRestaurant,
    setFavoriteRestaurant,
    setMenuItems,
    selectNearestRestaurantByLocation,
  } = useStore();

  // Инициализируем store с предзагруженными данными при первом рендере
  useEffect(() => {
    // Инициализируем баннеры
    if (initialBanners && initialBanners.length > 0) {
      const key = restaurantId ? `horizontal_${restaurantId}` : 'horizontal_default';
      setBannersForRestaurant(key, initialBanners);
    }

    // Инициализируем рестораны
    if (initialRestaurants && initialRestaurants.length > 0) {
      // Логируем рестораны с координатами для отладки
      const restaurantsWithCoords = initialRestaurants.filter(r => r.latitude != null && r.longitude != null);
      console.log('[Home] Загружено ресторанов:', initialRestaurants.length);
      console.log('[Home] Ресторанов с координатами:', restaurantsWithCoords.length);
      if (restaurantsWithCoords.length > 0) {
        console.log('[Home] Рестораны с координатами:', restaurantsWithCoords.map(r => ({
          name: r.name,
          city: r.city,
          latitude: r.latitude,
          longitude: r.longitude
        })));
      }
      setRestaurants(initialRestaurants);
    }

    // Инициализируем любимый ресторан
    // Важно: вызываем setFavoriteRestaurant всегда, даже если null, чтобы очистить старое значение из хранилища
    setFavoriteRestaurant(initialFavoriteRestaurant).catch(console.error);

    // Инициализируем выбранный ресторан
    // Приоритет всегда у избранного ресторана
    if (initialFavoriteRestaurant && initialRestaurants) {
      const favoriteInList = initialRestaurants.find((r) => r.id === initialFavoriteRestaurant.id);
      if (favoriteInList) {
        setSelectedRestaurant(favoriteInList);
      } else if (initialSelectedRestaurantId) {
        // Если избранный ресторан не найден в списке, но есть явно выбранный, используем его
        const restaurant = initialRestaurants.find((r) => r.id === initialSelectedRestaurantId);
        if (restaurant) {
          setSelectedRestaurant(restaurant);
        }
      }
      // Не выбираем первый ресторан автоматически, если нет избранного и явно выбранного
    } else if (initialSelectedRestaurantId && initialRestaurants) {
      // Если есть явно выбранный ресторан (из URL или сервера), используем его
      const restaurant = initialRestaurants.find((r) => r.id === initialSelectedRestaurantId);
      if (restaurant) {
        setSelectedRestaurant(restaurant);
      }
    }
    // Если нет избранного и нет явно выбранного ресторана, 
    // не выбираем первый сразу - попробуем выбрать ближайший по местоположению
    // (см. код ниже)

    // Инициализируем меню
    if (initialMenuItems && initialMenuItems.length > 0) {
      const targetRestaurantId = initialSelectedRestaurantId || restaurantId || initialRestaurants?.[0]?.id;
      setMenuItems(initialMenuItems, targetRestaurantId || undefined);
    }

    // Автоматически определяем ближайший ресторан, если нет избранного ресторана
    // и нет явно выбранного ресторана из URL или сервера
    if (!initialFavoriteRestaurant && !initialSelectedRestaurantId && initialRestaurants && initialRestaurants.length > 0) {
      // Проверяем, есть ли рестораны с координатами
      // Координаты могут приходить как строки из БД (decimal), преобразуем в числа
      const restaurantsWithCoords = initialRestaurants.filter(r => {
        const lat = typeof r.latitude === 'string' ? parseFloat(r.latitude) : r.latitude;
        const lon = typeof r.longitude === 'string' ? parseFloat(r.longitude) : r.longitude;
        return lat != null && !isNaN(lat) && lon != null && !isNaN(lon);
      });
      
      if (restaurantsWithCoords.length > 0) {
        // Небольшая задержка, чтобы дать время для инициализации store и Telegram WebApp SDK
        setTimeout(async () => {
          try {
            console.log('[Home] 🎯 Начинаем процесс выбора ближайшего ресторана');
            console.log('[Home] Найдено ресторанов с координатами:', restaurantsWithCoords.length);
            console.log('[Home] Условия: нет избранного ресторана, нет явно выбранного ресторана');
            
            // Принудительно запрашиваем местоположение при первой загрузке страницы
            // чтобы пользователь явно видел запрос на доступ к геолокации
            console.log('[Home] ⚠️ Запрашиваем местоположение у пользователя (forceRequest=true)...');
            const success = await selectNearestRestaurantByLocation(true);
            
            // Если ближайший ресторан не был выбран (пользователь отказал или ошибка),
            // выбираем первый ресторан как fallback
            if (!success && initialRestaurants.length > 0) {
              console.log('[Home] Ближайший ресторан не выбран, используем первый ресторан как fallback');
              setSelectedRestaurant(initialRestaurants[0]);
            } else if (success) {
              console.log('[Home] ✅ Ближайший ресторан успешно выбран');
            }
          } catch (error) {
            console.error('[Home] ❌ Не удалось выбрать ближайший ресторан:', error);
            // В случае ошибки выбираем первый ресторан
            if (initialRestaurants.length > 0) {
              setSelectedRestaurant(initialRestaurants[0]);
            }
          }
        }, 1000); // Увеличиваем задержку до 1 секунды для гарантии готовности Telegram WebApp SDK
      } else {
        console.log('[Home] Нет ресторанов с координатами, выбираем первый ресторан');
        // Если нет ресторанов с координатами, выбираем первый
        setSelectedRestaurant(initialRestaurants[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <Header />
      {/* Мобильная версия */}
      <div className="md:hidden">
        <ActionButtons />
        <div className="py-6 space-y-6">
          <div className="px-4">
            <Banners restaurantId={selectedRestaurant?.id || restaurantId} initialBanners={initialBanners} />
          </div>
          <MenuBlock restaurantId={selectedRestaurant?.id || restaurantId} initialMenuItems={initialMenuItems} />
        </div>
      </div>

      {/* Десктопная версия */}
      <div className="hidden md:block py-6 px-4">
        <div className="flex gap-6 max-w-7xl mx-auto">
          {/* Левая колонка - кнопки, заголовок и блюда */}
          <div className="flex-1 flex flex-col">
            <ActionButtons />
            <MenuBlock restaurantId={selectedRestaurant?.id || restaurantId} initialMenuItems={initialMenuItems} />
          </div>

          {/* Правая колонка - баннер */}
          <div className="flex-shrink-0 w-1/3">
            <Banners restaurantId={selectedRestaurant?.id || restaurantId} initialBanners={initialBanners} />
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    // Получаем токен из cookies, если он есть
    const token = context.req.cookies.token || context.req.headers.authorization?.replace('Bearer ', '');
    
    // Создаем экземпляр axios для серверного запроса
    const getBaseURL = () => {
      const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      return url.endsWith('/api') ? url : `${url.replace(/\/$/, '')}/api`;
    };

    // Используем динамический импорт для axios на сервере
    const axios = (await import('axios')).default;
    const serverApi = axios.create({
      baseURL: getBaseURL(),
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      timeout: 10000,
    });

    // Используем эндпоинт для получения полных данных главной страницы
    const { restaurantId } = context.query;
    const pageResponse = await serverApi.get('/pages/home', {
      params: restaurantId ? { restaurantId } : {},
    });

    const pageData = pageResponse.data.data || {};
    const banners = pageData.banners || [];
    const restaurants = pageData.restaurants || [];
    const menuItems = pageData.menuItems || [];
    const selectedRestaurantId = pageData.selectedRestaurantId || null;
    const favoriteRestaurant = pageData.favoriteRestaurant || null;

    return {
      props: {
        initialBanners: banners,
        initialRestaurants: restaurants,
        initialMenuItems: menuItems,
        initialSelectedRestaurantId: selectedRestaurantId,
        initialFavoriteRestaurant: favoriteRestaurant,
        restaurantId: restaurantId as string || null,
      },
    };
  } catch (error) {
    console.error('Error fetching home page data on server:', error);
    // В случае ошибки возвращаем пустые данные
    return {
      props: {
        initialBanners: [],
        initialRestaurants: [],
        initialMenuItems: [],
        initialSelectedRestaurantId: null,
        initialFavoriteRestaurant: null,
        restaurantId: null,
      },
    };
  }
};
