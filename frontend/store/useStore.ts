import { create } from 'zustand';
import api from '@/lib/api';

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

export const useStore = create<Store>((set, get) => ({
  user: null,
  restaurants: [],
  selectedRestaurant: null,
  favoriteRestaurant: null,
  banners: [],
  bannersByRestaurant: {},
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isLoading: false,
  error: null,

  setToken: (token) => {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    }
    set({ token });
  },

  setUser: (user) => set({ user }),

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
      
      // Автоматически выбираем любимый ресторан или первый ресторан, если не выбран
      const currentSelected = get().selectedRestaurant;
      const favoriteRestaurant = get().favoriteRestaurant;
      
      if (!currentSelected && restaurants.length > 0) {
        if (favoriteRestaurant) {
          // Проверяем, что любимый ресторан все еще существует в списке
          const favoriteInList = restaurants.find(r => r.id === favoriteRestaurant.id);
          if (favoriteInList) {
            set({ selectedRestaurant: favoriteInList });
          } else {
            set({ selectedRestaurant: restaurants[0] });
          }
        } else {
          set({ selectedRestaurant: restaurants[0] });
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

  setSelectedRestaurant: (restaurant) => set({ selectedRestaurant: restaurant }),

  fetchProfile: async () => {
    if (typeof window === 'undefined') return;
    
    try {
      const response = await api.get('/profile');
      set({ user: response.data.data });
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      set({ error: error?.response?.data?.message || 'Не удалось загрузить профиль' });
    }
  },

  updateProfile: async (data) => {
    try {
      const response = await api.put('/profile', data);
      set({ user: response.data.data });
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  },

  fetchFavoriteRestaurant: async () => {
    if (typeof window === 'undefined') return;
    
    try {
      const response = await api.get('/profile/favorite-restaurant');
      const restaurant = response.data.data;
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
          }
        }
        // Если рестораны еще не загружены, просто сохраняем любимый ресторан
        // Он будет выбран автоматически после загрузки ресторанов в fetchRestaurants
      }
    } catch (error: any) {
      console.error('Failed to fetch favorite restaurant:', error);
      // Не критичная ошибка, просто не устанавливаем любимый ресторан
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
      set({ favoriteRestaurant: restaurant });
      
      // Если устанавливаем новый любимый ресторан, автоматически выбираем его
      if (restaurant) {
        set({ selectedRestaurant: restaurant });
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
    const cachedBanners = get().bannersByRestaurant[key];
    
    // Если баннеры уже загружены, не делаем повторный запрос
    if (cachedBanners && cachedBanners.length > 0) {
      set({ banners: cachedBanners });
      return;
    }

    try {
      const response = await api.get('/banners', {
        params: restaurantId ? { restaurantId } : {},
      });
      const banners = response.data.data || [];
      
      // Сохраняем в кэш
      set((state) => ({
        banners,
        bannersByRestaurant: {
          ...state.bannersByRestaurant,
          [key]: banners,
        },
      }));
    } catch (error: any) {
      console.error('Failed to fetch banners:', error);
      // Не показываем ошибку пользователю, просто не обновляем баннеры
    }
  },

  prefetchBanners: async (restaurantId?: string) => {
    // Пропускаем запрос на сервере
    if (typeof window === 'undefined') return;
    
    const key = restaurantId || 'default';
    const cachedBanners = get().bannersByRestaurant[key];
    
    // Если баннеры уже загружены, не делаем повторный запрос
    if (cachedBanners && cachedBanners.length > 0) {
      return;
    }

    try {
      const response = await api.get('/banners', {
        params: restaurantId ? { restaurantId } : {},
      });
      const banners = response.data.data || [];
      
      // Сохраняем в кэш без обновления текущих баннеров
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
