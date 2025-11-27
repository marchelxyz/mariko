import { create } from 'zustand';
import api from '@/lib/api';
import { deviceStorage, secureStorage, STORAGE_KEYS } from '@/lib/storage';

interface User {
  id: string;
  _id?: string;
  telegramId: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  role: string;
}

interface DeliveryAggregator {
  name: string;
  url: string;
  imageUrl?: string;
}

interface SocialNetwork {
  name: string;
  url: string;
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
  deliveryAggregators?: DeliveryAggregator[];
  yandexMapsUrl?: string;
  twoGisUrl?: string;
  socialNetworks?: SocialNetwork[];
}

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
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

interface Store {
  user: User | null;
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  favoriteRestaurant: Restaurant | null;
  banners: Banner[];
  bannersByRestaurant: Record<string, Banner[]>;
  menuItems: MenuItem[];
  menuItemsByRestaurant: Record<string, MenuItem[]>;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setRestaurants: (restaurants: Restaurant[]) => void;
  fetchRestaurants: () => Promise<void>;
  setSelectedRestaurant: (restaurant: Restaurant | null) => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  setFavoriteRestaurant: (restaurant: Restaurant | null) => Promise<void>;
  fetchFavoriteRestaurant: () => Promise<void>;
  setFavoriteRestaurantById: (restaurantId: string) => Promise<void>;
  fetchBanners: (restaurantId?: string) => Promise<void>;
  prefetchBanners: (restaurantId?: string) => Promise<void>;
  setBannersForRestaurant: (restaurantId: string | null, banners: Banner[]) => void;
  setMenuItems: (menuItems: MenuItem[], restaurantId?: string) => void;
  findNearestRestaurant: (latitude: number, longitude: number) => Promise<Restaurant | null>;
  selectNearestRestaurantByLocation: () => Promise<boolean>;
}

// Инициализация токена из SecureStorage
const initializeToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  try {
    const { secureStorage, STORAGE_KEYS } = await import('@/lib/storage');
    return await secureStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch (error) {
    console.error('Failed to initialize token from SecureStorage:', error);
    // Fallback на localStorage для обратной совместимости
    return localStorage.getItem('token');
  }
};

export const useStore = create<Store>((set, get) => {
  // Инициализируем токен синхронно для первого рендера
  let initialToken: string | null = null;
  if (typeof window !== 'undefined') {
    // Пробуем загрузить из SecureStorage синхронно (если возможно)
    try {
      const WebApp = (window as any).Telegram?.WebApp;
      if (WebApp?.SecureStorage) {
        // Не можем вызвать асинхронно здесь, поэтому используем fallback
        initialToken = localStorage.getItem('token');
      } else {
        initialToken = localStorage.getItem('token');
      }
    } catch (e) {
      initialToken = localStorage.getItem('token');
    }
  }

  return {
    user: null,
    restaurants: [],
    selectedRestaurant: null,
    favoriteRestaurant: null,
    banners: [],
    bannersByRestaurant: {},
    menuItems: [],
    menuItemsByRestaurant: {},
    token: initialToken,
    isLoading: false,
    error: null,

    setToken: async (token) => {
      if (token) {
        await secureStorage.setItem(STORAGE_KEYS.TOKEN, token);
      } else {
        await secureStorage.removeItem(STORAGE_KEYS.TOKEN);
      }
      set({ token });
    },

    setUser: (user) => set({ user }),

    setRestaurants: (restaurants) => {
      set({ restaurants });
      // Автоматически выбираем ресторан
      // Приоритет всегда у избранного ресторана
      const currentSelected = get().selectedRestaurant;
      const favoriteRestaurant = get().favoriteRestaurant;
      
      if (restaurants.length > 0) {
        // Если есть избранный ресторан, всегда выбираем его (даже если уже есть выбранный)
        if (favoriteRestaurant) {
          const favoriteInList = restaurants.find(r => r.id === favoriteRestaurant.id);
          if (favoriteInList) {
            // Выбираем избранный, если его еще нет или если текущий выбранный не избранный
            if (!currentSelected || currentSelected.id !== favoriteInList.id) {
              set({ selectedRestaurant: favoriteInList });
              deviceStorage.setItem(STORAGE_KEYS.SELECTED_RESTAURANT_ID, favoriteInList.id).catch(console.error);
            }
            return;
          }
        }
        
        // Если нет избранного ресторана и нет текущего выбранного,
        // проверяем, есть ли рестораны с координатами для автоматического выбора
        if (!currentSelected) {
          // Координаты могут приходить как строки из БД (decimal), преобразуем в числа
          const restaurantsWithCoords = restaurants.filter(r => {
            const lat = typeof r.latitude === 'string' ? parseFloat(r.latitude) : r.latitude;
            const lon = typeof r.longitude === 'string' ? parseFloat(r.longitude) : r.longitude;
            return lat != null && !isNaN(lat) && lon != null && !isNaN(lon);
          });
          
          // Если есть рестораны с координатами, не выбираем первый сразу
          // Дадим возможность выбрать ближайший по местоположению
          // (это будет сделано в fetchRestaurants или в компоненте)
          if (restaurantsWithCoords.length === 0) {
            // Если нет ресторанов с координатами, выбираем первый
            set({ selectedRestaurant: restaurants[0] });
            deviceStorage.setItem(STORAGE_KEYS.SELECTED_RESTAURANT_ID, restaurants[0].id).catch(console.error);
          }
          // Если есть рестораны с координатами, не выбираем ничего здесь
          // Выбор будет сделан через selectNearestRestaurantByLocation
        }
      }
    },

    fetchRestaurants: async () => {
      // Пропускаем запрос на сервере
      if (typeof window === 'undefined') return;
      
      set({ isLoading: true, error: null });
      
      try {
        const response = await api.get('/restaurants');
        console.log('Restaurants API response:', response.data);
        
        // Проверяем структуру ответа
        const restaurantsData = response.data?.data || response.data || [];
        if (!Array.isArray(restaurantsData)) {
          console.error('Invalid restaurants data format:', restaurantsData);
          set({ 
            restaurants: [], 
            isLoading: false,
            error: 'Неверный формат данных ресторанов'
          });
          return;
        }
        
        const restaurants = restaurantsData
          .map((r: any) => ({
            ...r,
            id: r.id || r._id,
          }))
          .filter((r: any): r is Restaurant => typeof r.id === 'string' && r.id.length > 0);
        
        console.log('Processed restaurants:', restaurants);
        
        set({ restaurants, isLoading: false });
        
        // Автоматически выбираем ресторан
        // Приоритет: избранный ресторан > ближайший по местоположению > первый в списке
        const currentSelected = get().selectedRestaurant;
        const favoriteRestaurant = get().favoriteRestaurant;
        
        if (restaurants.length > 0) {
          // Если есть избранный ресторан, всегда выбираем его (даже если уже есть выбранный)
          if (favoriteRestaurant) {
            // Проверяем, что любимый ресторан все еще существует в списке
            const favoriteInList = restaurants.find(r => r.id === favoriteRestaurant.id);
            if (favoriteInList) {
              // Выбираем избранный, если его еще нет или если текущий выбранный не избранный
              if (!currentSelected || currentSelected.id !== favoriteInList.id) {
                set({ selectedRestaurant: favoriteInList });
                await deviceStorage.setItem(STORAGE_KEYS.SELECTED_RESTAURANT_ID, favoriteInList.id);
              }
              return;
            }
          }
          
            // Если нет избранного ресторана и нет текущего выбранного, пробуем выбрать ближайший
            if (!currentSelected) {
              // Проверяем, есть ли рестораны с координатами
              // Координаты могут приходить как строки из БД (decimal), преобразуем в числа
              const restaurantsWithCoords = restaurants.filter(r => {
                const lat = typeof r.latitude === 'string' ? parseFloat(r.latitude) : r.latitude;
                const lon = typeof r.longitude === 'string' ? parseFloat(r.longitude) : r.longitude;
                return lat != null && !isNaN(lat) && lon != null && !isNaN(lon);
              });
            
            if (restaurantsWithCoords.length > 0) {
              // Пробуем выбрать ближайший ресторан по местоположению
              try {
                console.log('[Store] Пытаемся выбрать ближайший ресторан из', restaurantsWithCoords.length, 'ресторанов с координатами');
                await get().selectNearestRestaurantByLocation();
                // Если ближайший ресторан был выбран, выходим
                if (get().selectedRestaurant) {
                  return;
                }
              } catch (error) {
                console.log('[Store] Не удалось выбрать ближайший ресторан, используем первый');
              }
            } else {
              console.log('[Store] Нет ресторанов с координатами, пропускаем выбор по местоположению');
            }
            
            // Если не удалось выбрать ближайший, выбираем первый
            set({ selectedRestaurant: restaurants[0] });
            await deviceStorage.setItem(STORAGE_KEYS.SELECTED_RESTAURANT_ID, restaurants[0].id);
          }
        }
      } catch (error: any) {
        console.error('Failed to fetch restaurants:', error);
        set({ 
          restaurants: [],
          error: error?.response?.data?.message || 'Не удалось загрузить рестораны',
          isLoading: false 
        });
      }
    },

    setSelectedRestaurant: async (restaurant) => {
      set({ selectedRestaurant: restaurant });
      if (restaurant) {
        await deviceStorage.setItem(STORAGE_KEYS.SELECTED_RESTAURANT_ID, restaurant.id);
      } else {
        await deviceStorage.removeItem(STORAGE_KEYS.SELECTED_RESTAURANT_ID);
      }
    },

    fetchProfile: async () => {
      if (typeof window === 'undefined') return;
      
      try {
        const response = await api.get('/profile');
        const userData = response.data.data;
        
        set({ user: userData });
      } catch (error: any) {
        console.error('Failed to fetch profile:', error);
        set({ error: error?.response?.data?.message || 'Не удалось загрузить профиль' });
      }
    },

    updateProfile: async (data) => {
      try {
        const response = await api.put('/profile', data);
        const userData = response.data.data;
        
        set({ user: userData });
      } catch (error: any) {
        console.error('Failed to update profile:', error);
        throw error;
      }
    },

    setFavoriteRestaurant: async (restaurant) => {
      set({ favoriteRestaurant: restaurant });
      // Обновляем локальное хранилище
      if (restaurant) {
        await deviceStorage.setItem(STORAGE_KEYS.FAVORITE_RESTAURANT_ID, restaurant.id);
      } else {
        await deviceStorage.removeItem(STORAGE_KEYS.FAVORITE_RESTAURANT_ID);
      }
    },

    fetchFavoriteRestaurant: async () => {
      if (typeof window === 'undefined') return;
      
      try {
        const response = await api.get('/profile/favorite-restaurant');
        const restaurant = response.data.data;
        
        set({ favoriteRestaurant: restaurant });
        
        // Обновляем локальное хранилище: сохраняем или удаляем в зависимости от значения
        if (restaurant) {
          await deviceStorage.setItem(STORAGE_KEYS.FAVORITE_RESTAURANT_ID, restaurant.id);
          
          // Если есть любимый ресторан, всегда выбираем его (приоритет избранному)
          const restaurants = get().restaurants;
          const currentSelected = get().selectedRestaurant;
          
          if (restaurants.length > 0) {
            const favoriteInList = restaurants.find(r => r.id === restaurant.id);
            // Выбираем любимый ресторан всегда, если он отличается от текущего выбранного
            if (favoriteInList && (!currentSelected || currentSelected.id !== favoriteInList.id)) {
              set({ selectedRestaurant: favoriteInList });
              await deviceStorage.setItem(STORAGE_KEYS.SELECTED_RESTAURANT_ID, favoriteInList.id);
            }
          }
          // Если рестораны еще не загружены, просто сохраняем любимый ресторан
          // Он будет выбран автоматически после загрузки ресторанов в fetchRestaurants
        } else {
          // Если сервер вернул null, очищаем локальное хранилище
          await deviceStorage.removeItem(STORAGE_KEYS.FAVORITE_RESTAURANT_ID);
        }
      } catch (error: any) {
        console.error('Failed to fetch favorite restaurant:', error);
      }
    },

    setFavoriteRestaurantById: async (restaurantId) => {
      try {
        const currentFavorite = get().favoriteRestaurant;
        const isRemoving = currentFavorite?.id === restaurantId;
        
        const response = await api.put('/profile/favorite-restaurant', { 
          restaurantId: isRemoving ? null : restaurantId 
        });
        const restaurant = response.data.data;
        
        set({ favoriteRestaurant: restaurant });
        
        // Обновляем локальное хранилище
        if (restaurant) {
          await deviceStorage.setItem(STORAGE_KEYS.FAVORITE_RESTAURANT_ID, restaurant.id);
        } else {
          await deviceStorage.removeItem(STORAGE_KEYS.FAVORITE_RESTAURANT_ID);
        }
        
        // Если устанавливаем новый любимый ресторан, автоматически выбираем его
        if (restaurant) {
          set({ selectedRestaurant: restaurant });
          await deviceStorage.setItem(STORAGE_KEYS.SELECTED_RESTAURANT_ID, restaurant.id);
        }
        // Если убираем из избранного, не меняем выбранный ресторан
      } catch (error: any) {
        console.error('Failed to set favorite restaurant:', error);
        throw error;
      }
    },

    setMenuItems: (menuItems, restaurantId) => {
      if (restaurantId) {
        set((state) => ({
          menuItemsByRestaurant: {
            ...state.menuItemsByRestaurant,
            [restaurantId]: menuItems,
          },
          // Если это меню для текущего ресторана, обновляем и текущее меню
          menuItems: menuItems,
        }));
      } else {
        set({ menuItems });
      }
    },

    fetchBanners: async (restaurantId?: string) => {
      // Пропускаем запрос на сервере
      if (typeof window === 'undefined') return;
      
      const key = restaurantId || 'default';
      
      // Проверяем, есть ли баннеры в памяти
      const memoryBanners = get().bannersByRestaurant[key];
      if (memoryBanners && memoryBanners.length > 0) {
        set({ banners: memoryBanners });
        return;
      }

      try {
        const response = await api.get('/banners', {
          params: restaurantId ? { restaurantId } : {},
        });
        const banners = response.data.data || [];
        
        // Сохраняем в память
        set((state) => ({
          banners,
          bannersByRestaurant: {
            ...state.bannersByRestaurant,
            [key]: banners,
          },
        }));
      } catch (error: any) {
        console.error('Failed to fetch banners:', error);
      }
    },

    prefetchBanners: async (restaurantId?: string) => {
      // Пропускаем запрос на сервере
      if (typeof window === 'undefined') return;
      
      const key = restaurantId || 'default';
      const memoryBanners = get().bannersByRestaurant[key];
      
      // Если баннеры уже загружены в памяти, не делаем повторный запрос
      if (memoryBanners && memoryBanners.length > 0) {
        return;
      }

      try {
        const response = await api.get('/banners', {
          params: restaurantId ? { restaurantId } : {},
        });
        const banners = response.data.data || [];
        
        // Сохраняем в память без обновления текущих баннеров
        set((state) => ({
          bannersByRestaurant: {
            ...state.bannersByRestaurant,
            [key]: banners,
          },
        }));
      } catch (error: any) {
        // Тихая ошибка при предзагрузке
        console.debug('Failed to prefetch banners:', error);
      }
    },

    setBannersForRestaurant: (restaurantId, banners) => {
      const key = restaurantId || 'default';
      set((state) => ({
        bannersByRestaurant: {
          ...state.bannersByRestaurant,
          [key]: banners,
        },
        // Если это баннеры для текущего ресторана, обновляем и текущие баннеры
        banners: banners,
      }));
    },

    findNearestRestaurant: async (latitude, longitude) => {
      if (typeof window === 'undefined') return null;
      
      try {
        console.log(`[Store] Поиск ближайшего ресторана для координат: ${latitude}, ${longitude}`);
        
        const response = await api.get('/restaurants/nearest', {
          params: { latitude, longitude },
        });
        
        console.log('[Store] Ответ API /restaurants/nearest:', response.data);
        
        if (response.data.success && response.data.data?.restaurant) {
          const restaurant = response.data.data.restaurant;
          const distance = response.data.data.distance;
          console.log(`[Store] ✅ Найден ближайший ресторан: ${restaurant.name} (${restaurant.city}), расстояние: ${distance} км`);
          console.log('[Store] Координаты ресторана:', { latitude: restaurant.latitude, longitude: restaurant.longitude });
          return restaurant;
        }
        
        console.log('[Store] Ближайший ресторан не найден в ответе API');
        return null;
      } catch (error: any) {
        console.error('[Store] Ошибка при поиске ближайшего ресторана:', error);
        if (error.response) {
          console.error('[Store] Статус ответа:', error.response.status);
          console.error('[Store] Данные ответа:', error.response.data);
        }
        return null;
      }
    },

    selectNearestRestaurantByLocation: async () => {
      if (typeof window === 'undefined') return;
      
      try {
        const { requestLocation, getStoredLocation, storeLocation } = await import('@/lib/location');
        
        // Проверяем, что есть рестораны для выбора
        const restaurants = get().restaurants;
        if (!restaurants || restaurants.length === 0) {
          console.log('[Store] Нет ресторанов для выбора ближайшего');
          return false;
        }

        // Проверяем, есть ли рестораны с координатами
        // Координаты могут приходить как строки из БД (decimal), преобразуем в числа
        const restaurantsWithCoords = restaurants.filter(r => {
          const lat = typeof r.latitude === 'string' ? parseFloat(r.latitude) : r.latitude;
          const lon = typeof r.longitude === 'string' ? parseFloat(r.longitude) : r.longitude;
          return lat != null && !isNaN(lat) && lon != null && !isNaN(lon);
        });
        
        if (restaurantsWithCoords.length === 0) {
          console.log('[Store] Нет ресторанов с координатами для выбора ближайшего');
          console.log('[Store] Все рестораны:', restaurants.map(r => ({
            name: r.name,
            latitude: r.latitude,
            longitude: r.longitude,
            latType: typeof r.latitude,
            lonType: typeof r.longitude
          })));
          return false;
        }
        
        console.log(`[Store] Найдено ${restaurantsWithCoords.length} ресторанов с координатами`);

        // Пробуем получить сохраненное местоположение
        let location = getStoredLocation();
        
        // Если нет сохраненного, запрашиваем у пользователя
        if (!location) {
          console.log('[Store] Запрашиваем местоположение у пользователя...');
          location = await requestLocation();
          
          if (location) {
            storeLocation(location);
            console.log('[Store] Местоположение сохранено:', location);
          } else {
            console.log('[Store] Пользователь не предоставил местоположение или произошла ошибка');
            return false;
          }
        } else {
          console.log('[Store] Используем сохраненное местоположение:', location);
        }

        // Ищем ближайший ресторан
        console.log('[Store] Ищем ближайший ресторан по координатам:', location);
        const nearestRestaurant = await get().findNearestRestaurant(location.latitude, location.longitude);
        
        if (nearestRestaurant) {
          const favoriteRestaurant = get().favoriteRestaurant;
          const currentSelected = get().selectedRestaurant;
          
          // Если нет избранного ресторана и нет текущего выбранного, выбираем ближайший
          if (!favoriteRestaurant && !currentSelected) {
            await get().setSelectedRestaurant(nearestRestaurant);
            console.log(`[Store] ✅ Выбран ближайший ресторан: ${nearestRestaurant.name} (${nearestRestaurant.city})`);
            return true;
          } else if (favoriteRestaurant) {
            console.log(`[Store] Избранный ресторан имеет приоритет над ближайшим`);
            return false;
          } else {
            console.log(`[Store] Ресторан уже выбран, не перезаписываем`);
            return false;
          }
        } else {
          console.log('[Store] Ближайший ресторан не найден');
          return false;
        }
      } catch (error) {
        console.error('[Store] Ошибка при выборе ближайшего ресторана:', error);
        return false;
      }
    },
  };
});
