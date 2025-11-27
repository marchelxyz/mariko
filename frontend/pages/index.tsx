import { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import ActionButtons from '@/components/ActionButtons';
import Banners from '@/components/Banners';
import MenuBlock from '@/components/MenuBlock';
import RestaurantSelector from '@/components/RestaurantSelector';
import { MenuItem } from '@/types/menu';

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

// Используем общий тип MenuItem из types/menu.ts

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
  const router = useRouter();
  const {
    selectedRestaurant,
    setBannersForRestaurant,
    setRestaurants,
    setSelectedRestaurant,
    setFavoriteRestaurant,
    setMenuItems,
  } = useStore();
  const [showRestaurantSelector, setShowRestaurantSelector] = useState(false);

  // Инициализируем store с предзагруженными данными при первом рендере
  useEffect(() => {
    // Инициализируем баннеры
    if (initialBanners && initialBanners.length > 0) {
      const key = restaurantId ? `horizontal_${restaurantId}` : 'horizontal_default';
      setBannersForRestaurant(key, initialBanners);
    }

    // Инициализируем рестораны
    if (initialRestaurants && initialRestaurants.length > 0) {
      setRestaurants(initialRestaurants);
    }

    // Инициализируем любимый ресторан
    // Важно: вызываем setFavoriteRestaurant всегда, даже если null, чтобы очистить старое значение из хранилища
    setFavoriteRestaurant(initialFavoriteRestaurant).catch(console.error);

    // Инициализируем выбранный ресторан
    // Приоритет всегда у избранного ресторана или явно указанного в URL
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
    } else if (restaurantId && initialRestaurants) {
      // Если restaurantId указан в URL, это явный выбор - используем его
      const restaurant = initialRestaurants.find((r) => r.id === restaurantId);
      if (restaurant) {
        setSelectedRestaurant(restaurant);
      }
    } else if (initialSelectedRestaurantId && initialRestaurants) {
      // Если есть явно выбранный ресторан (из сервера), используем его
      const restaurant = initialRestaurants.find((r) => r.id === initialSelectedRestaurantId);
      if (restaurant) {
        setSelectedRestaurant(restaurant);
      }
    }
    // НЕ выбираем ресторан автоматически, если нет избранного - покажем popup

    // Инициализируем меню
    if (initialMenuItems && initialMenuItems.length > 0) {
      // Используем restaurantId только если он явно указан (избранный или из URL)
      // Если ресторан не выбран, бэкенд вернет меню первого ресторана по умолчанию
      const targetRestaurantId = initialSelectedRestaurantId || restaurantId || (initialRestaurants?.[0]?.id) || undefined;
      setMenuItems(initialMenuItems, targetRestaurantId);
    }

    // Показываем селектор ресторана, если нет выбранного ресторана и нет избранного
    // Проверяем состояние после небольшой задержки, чтобы убедиться, что все инициализации завершены
    const timer = setTimeout(() => {
      const currentSelectedRestaurant = useStore.getState().selectedRestaurant;
      const currentFavoriteRestaurant = useStore.getState().favoriteRestaurant;
      
      // Показываем поп-ап только если:
      // 1. Нет избранного ресторана
      // 2. Нет restaurantId в URL
      // 3. Нет initialSelectedRestaurantId (явного выбора с сервера)
      // 4. Нет выбранного ресторана в store (после всех инициализаций)
      // 5. Есть рестораны для выбора
      if (
        !currentFavoriteRestaurant &&
        !restaurantId &&
        !initialSelectedRestaurantId &&
        !currentSelectedRestaurant &&
        initialRestaurants &&
        initialRestaurants.length > 0
      ) {
        setShowRestaurantSelector(true);
      }
    }, 500);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestaurantConfirm = (restaurantId: string) => {
    setShowRestaurantSelector(false);
    // Ресторан уже выбран в компоненте RestaurantSelector
    // Обновляем URL без перезагрузки страницы
    router.replace(`/?restaurantId=${restaurantId}`, undefined, { shallow: true });
  };

  return (
    <Layout>
      <Header />
      {/* Компонент выбора ресторана - показывается только если нет выбранного ресторана и нет избранного */}
      {showRestaurantSelector && !selectedRestaurant && !restaurantId && (
        <RestaurantSelector onConfirm={handleRestaurantConfirm} />
      )}
      
      {/* Мобильная версия */}
      <div className="md:hidden">
        <ActionButtons />
        <div className="py-6 space-y-6">
          <div className="px-4">
            <Banners restaurantId={selectedRestaurant?.id || restaurantId} initialBanners={initialBanners} />
          </div>
          <MenuBlock 
            restaurantId={selectedRestaurant?.id || restaurantId} 
            initialMenuItems={initialMenuItems}
          />
        </div>
      </div>

      {/* Десктопная версия */}
      <div className="hidden md:block py-6 px-4">
        <div className="flex gap-6 max-w-7xl mx-auto">
          {/* Левая колонка - кнопки, заголовок и блюда */}
          <div className="flex-1 flex flex-col">
            <ActionButtons />
            <MenuBlock 
              restaurantId={selectedRestaurant?.id || restaurantId} 
              initialMenuItems={initialMenuItems}
            />
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
