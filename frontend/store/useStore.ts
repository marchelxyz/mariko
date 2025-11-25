import { create } from 'zustand';
import api from '@/lib/api';
import { deviceStorage, secureStorage, STORAGE_KEYS, storageHelpers } from '@/lib/storage';

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

interface Store {
  user: User | null;
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  favoriteRestaurant: Restaurant | null;
  banners: Banner[];
  bannersByRestaurant: Record<string, Banner[]>;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  fetchRestaurants: () => Promise<void>;
  setSelectedRestaurant: (restaurant: Restaurant | null) => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  fetchFavoriteRestaurant: () => Promise<void>;
  setFavoriteRestaurant: (restaurantId: string) => Promise<void>;
  fetchBanners: (restaurantId?: string) => Promise<void>;
  prefetchBanners: (restaurantId?: string) => Promise<void>;
  setBannersForRestaurant: (restaurantId: string | null, banners: Banner[]) => void;
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

    fetchRestaurants: async () => {
      // Пропускаем запрос на сервере
      if (typeof window === 'undefined') return;
      
      set({ isLoading: true, error: null });
      
      // Сначала пытаемся загрузить из кэша
      const cachedRestaurants = await storageHelpers.getJSON<Restaurant[]>(
        deviceStorage,
        STORAGE_KEYS.RESTAURANTS
      );
      const cachedTimestamp = await deviceStorage.getItem(STORAGE_KEYS.RESTAURANTS_TIMESTAMP);
      const cacheAge = cachedTimestamp ? Date.now() - parseInt(cachedTimestamp, 10) : Infinity;
      const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа
      
      // Если есть свежий кэш (менее 24 часов), показываем его сразу
      if (cachedRestaurants && cachedRestaurants.length > 0 && cacheAge < CACHE_TTL) {
        set({ restaurants: cachedRestaurants, isLoading: false });
        
        // Восстанавливаем выбранный ресторан из кэша
        const selectedRestaurantId = await deviceStorage.getItem(STORAGE_KEYS.SELECTED_RESTAURANT_ID);
        if (selectedRestaurantId) {
          const selected = cachedRestaurants.find(r => r.id === selectedRestaurantId);
          if (selected) {
            set({ selectedRestaurant: selected });
          }
        }
        
        // Обновляем данные в фоне
        try {
          const response = await api.get('/restaurants');
          const restaurantsData = response.data?.data || response.data || [];
          if (Array.isArray(restaurantsData)) {
            const restaurants = restaurantsData
              .map((r: any) => ({
                ...r,
                id: r.id || r._id,
              }))
              .filter((r: any): r is Restaurant => typeof r.id === 'string' && r.id.length > 0);
            
            // Сохраняем в кэш
            await storageHelpers.setJSON(deviceStorage, STORAGE_KEYS.RESTAURANTS, restaurants);
            await deviceStorage.setItem(STORAGE_KEYS.RESTAURANTS_TIMESTAMP, Date.now().toString());
            
            set({ restaurants });
          }
        } catch (error) {
          // Игнорируем ошибки фонового обновления
          console.debug('Background restaurants update failed:', error);
        }
        return;
      }
      
      // Если кэша нет или он устарел, загружаем с сервера
      try {
        const response = await api.get('/restaurants');
        console.log('Restaurants API response:', response.data);
        
        // Проверяем структуру ответа
        const restaurantsData = response.data?.data || response.data || [];
        if (!Array.isArray(restaurantsData)) {
          console.error('Invalid restaurants data format:', restaurantsData);
          // Если есть старый кэш, используем его
          if (cachedRestaurants && cachedRestaurants.length > 0) {
            set({ restaurants: cachedRestaurants, isLoading: false });
            return;
          }
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
        
        // Сохраняем в кэш
        await storageHelpers.setJSON(deviceStorage, STORAGE_KEYS.RESTAURANTS, restaurants);
        await deviceStorage.setItem(STORAGE_KEYS.RESTAURANTS_TIMESTAMP, Date.now().toString());
        
        set({ restaurants, isLoading: false });
        
        // Автоматически выбираем любимый ресторан или первый ресторан, если не выбран
        const currentSelected = get().selectedRestaurant;
        const favoriteRestaurant = get().favoriteRestaurant;
        
        if (!currentSelected && restaurants.length > 0) {
          if (favoriteRestaurant) {
            // Проверяем, что любимый ресторан все еще существует в списке
            const favoriteInList = restaurants.find(r => r.id === favoriteRestaurant.id);
            if (favoriteInList) {
              set({ selectedRestaurant: favoriteInList });
              await deviceStorage.setItem(STORAGE_KEYS.SELECTED_RESTAURANT_ID, favoriteInList.id);
            } else {
              set({ selectedRestaurant: restaurants[0] });
              await deviceStorage.setItem(STORAGE_KEYS.SELECTED_RESTAURANT_ID, restaurants[0].id);
            }
          } else {
            set({ selectedRestaurant: restaurants[0] });
            await deviceStorage.setItem(STORAGE_KEYS.SELECTED_RESTAURANT_ID, restaurants[0].id);
          }
        }
      } catch (error: any) {
        console.error('Failed to fetch restaurants:', error);
        // Если есть кэш, используем его даже если он устарел
        if (cachedRestaurants && cachedRestaurants.length > 0) {
          set({ restaurants: cachedRestaurants, isLoading: false });
          return;
        }
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
      
      // Сначала пытаемся загрузить из кэша
      const cachedProfile = await storageHelpers.getJSON<User>(
        deviceStorage,
        STORAGE_KEYS.USER_PROFILE
      );
      const cachedTimestamp = await deviceStorage.getItem(STORAGE_KEYS.USER_PROFILE_TIMESTAMP);
      const cacheAge = cachedTimestamp ? Date.now() - parseInt(cachedTimestamp, 10) : Infinity;
      const CACHE_TTL = 60 * 60 * 1000; // 1 час
      
      // Если есть свежий кэш, показываем его сразу
      if (cachedProfile && cacheAge < CACHE_TTL) {
        set({ user: cachedProfile });
        
        // Обновляем в фоне
        try {
          const response = await api.get('/profile');
          const userData = response.data.data;
          await storageHelpers.setJSON(deviceStorage, STORAGE_KEYS.USER_PROFILE, userData);
          await deviceStorage.setItem(STORAGE_KEYS.USER_PROFILE_TIMESTAMP, Date.now().toString());
          set({ user: userData });
        } catch (error) {
          // Игнорируем ошибки фонового обновления
          console.debug('Background profile update failed:', error);
        }
        return;
      }
      
      try {
        const response = await api.get('/profile');
        const userData = response.data.data;
        
        // Сохраняем в кэш
        await storageHelpers.setJSON(deviceStorage, STORAGE_KEYS.USER_PROFILE, userData);
        await deviceStorage.setItem(STORAGE_KEYS.USER_PROFILE_TIMESTAMP, Date.now().toString());
        
        set({ user: userData });
      } catch (error: any) {
        console.error('Failed to fetch profile:', error);
        // Если есть старый кэш, используем его
        if (cachedProfile) {
          set({ user: cachedProfile });
          return;
        }
        set({ error: error?.response?.data?.message || 'Не удалось загрузить профиль' });
      }
    },

    updateProfile: async (data) => {
      try {
        const response = await api.put('/profile', data);
        const userData = response.data.data;
        
        // Обновляем кэш
        await storageHelpers.setJSON(deviceStorage, STORAGE_KEYS.USER_PROFILE, userData);
        await deviceStorage.setItem(STORAGE_KEYS.USER_PROFILE_TIMESTAMP, Date.now().toString());
        
        set({ user: userData });
      } catch (error: any) {
        console.error('Failed to update profile:', error);
        throw error;
      }
    },

    fetchFavoriteRestaurant: async () => {
      if (typeof window === 'undefined') return;
      
      // Сначала пытаемся загрузить из кэша
      const cachedFavoriteId = await deviceStorage.getItem(STORAGE_KEYS.FAVORITE_RESTAURANT_ID);
      
      try {
        const response = await api.get('/profile/favorite-restaurant');
        const restaurant = response.data.data;
        
        // Сохраняем в кэш
        if (restaurant) {
          await deviceStorage.setItem(STORAGE_KEYS.FAVORITE_RESTAURANT_ID, restaurant.id);
        } else {
          await deviceStorage.removeItem(STORAGE_KEYS.FAVORITE_RESTAURANT_ID);
        }
        
        set({ favoriteRestaurant: restaurant });
        
        // Если есть любимый ресторан, выбираем его (если он есть в списке ресторанов)
        if (restaurant) {
          const restaurants = get().restaurants;
          const currentSelected = get().selectedRestaurant;
          
          if (restaurants.length > 0) {
            const favoriteInList = restaurants.find(r => r.id === restaurant.id);
            // Выбираем любимый ресторан только если еще ничего не выбрано
            // Это происходит при первой загрузке приложения или после авторизации
            if (favoriteInList && !currentSelected) {
              set({ selectedRestaurant: favoriteInList });
              await deviceStorage.setItem(STORAGE_KEYS.SELECTED_RESTAURANT_ID, favoriteInList.id);
            }
          }
          // Если рестораны еще не загружены, просто сохраняем любимый ресторан
          // Он будет выбран автоматически после загрузки ресторанов в fetchRestaurants
        }
      } catch (error: any) {
        console.error('Failed to fetch favorite restaurant:', error);
        // Если есть кэш, используем его
        if (cachedFavoriteId) {
          const restaurants = get().restaurants;
          const favorite = restaurants.find(r => r.id === cachedFavoriteId);
          if (favorite) {
            set({ favoriteRestaurant: favorite });
          }
        }
      }
    },

    setFavoriteRestaurant: async (restaurantId) => {
      try {
        const currentFavorite = get().favoriteRestaurant;
        const isRemoving = currentFavorite?.id === restaurantId;
        
        const response = await api.put('/profile/favorite-restaurant', { 
          restaurantId: isRemoving ? null : restaurantId 
        });
        const restaurant = response.data.data;
        
        // Обновляем кэш
        if (restaurant) {
          await deviceStorage.setItem(STORAGE_KEYS.FAVORITE_RESTAURANT_ID, restaurant.id);
        } else {
          await deviceStorage.removeItem(STORAGE_KEYS.FAVORITE_RESTAURANT_ID);
        }
        
        set({ favoriteRestaurant: restaurant });
        
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

    fetchBanners: async (restaurantId?: string) => {
      // Пропускаем запрос на сервере
      if (typeof window === 'undefined') return;
      
      const key = restaurantId || 'default';
      const cacheKey = `${STORAGE_KEYS.BANNERS_PREFIX}${key}`;
      const timestampKey = `${STORAGE_KEYS.BANNERS_TIMESTAMP_PREFIX}${key}`;
      
      // Сначала пытаемся загрузить из кэша
      const cachedBanners = await storageHelpers.getJSON<Banner[]>(deviceStorage, cacheKey);
      const cachedTimestamp = await deviceStorage.getItem(timestampKey);
      const cacheAge = cachedTimestamp ? Date.now() - parseInt(cachedTimestamp, 10) : Infinity;
      const CACHE_TTL = 60 * 60 * 1000; // 1 час
      
      // Если есть свежий кэш, показываем его сразу
      if (cachedBanners && cachedBanners.length > 0 && cacheAge < CACHE_TTL) {
        set((state) => ({
          banners: cachedBanners,
          bannersByRestaurant: {
            ...state.bannersByRestaurant,
            [key]: cachedBanners,
          },
        }));
        
        // Обновляем в фоне
        try {
          const response = await api.get('/banners', {
            params: restaurantId ? { restaurantId } : {},
          });
          const banners = response.data.data || [];
          
          // Сохраняем в кэш
          await storageHelpers.setJSON(deviceStorage, cacheKey, banners);
          await deviceStorage.setItem(timestampKey, Date.now().toString());
          
          set((state) => ({
            banners,
            bannersByRestaurant: {
              ...state.bannersByRestaurant,
              [key]: banners,
            },
          }));
        } catch (error) {
          // Игнорируем ошибки фонового обновления
          console.debug('Background banners update failed:', error);
        }
        return;
      }
      
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
        
        // Сохраняем в кэш
        await storageHelpers.setJSON(deviceStorage, cacheKey, banners);
        await deviceStorage.setItem(timestampKey, Date.now().toString());
        
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
        // Если есть кэш, используем его даже если он устарел
        if (cachedBanners && cachedBanners.length > 0) {
          set((state) => ({
            banners: cachedBanners,
            bannersByRestaurant: {
              ...state.bannersByRestaurant,
              [key]: cachedBanners,
            },
          }));
          return;
        }
      }
    },

    prefetchBanners: async (restaurantId?: string) => {
      // Пропускаем запрос на сервере
      if (typeof window === 'undefined') return;
      
      const key = restaurantId || 'default';
      const cacheKey = `${STORAGE_KEYS.BANNERS_PREFIX}${key}`;
      
      // Проверяем кэш
      const cachedBanners = await storageHelpers.getJSON<Banner[]>(deviceStorage, cacheKey);
      const memoryBanners = get().bannersByRestaurant[key];
      
      // Если баннеры уже загружены в памяти или кэше, не делаем повторный запрос
      if ((memoryBanners && memoryBanners.length > 0) || (cachedBanners && cachedBanners.length > 0)) {
        return;
      }

      try {
        const response = await api.get('/banners', {
          params: restaurantId ? { restaurantId } : {},
        });
        const banners = response.data.data || [];
        
        const timestampKey = `${STORAGE_KEYS.BANNERS_TIMESTAMP_PREFIX}${key}`;
        await storageHelpers.setJSON(deviceStorage, cacheKey, banners);
        await deviceStorage.setItem(timestampKey, Date.now().toString());
        
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
}));
