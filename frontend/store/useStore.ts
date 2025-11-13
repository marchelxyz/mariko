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
  favoriteRestaurantId?: string;
  favoriteRestaurant?: Restaurant;
}

interface Restaurant {
  id: string;
  _id?: string;
  name: string;
  city: string;
  address: string;
  phoneNumber: string;
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
  banners: Banner[];
  bannersByRestaurant: Record<string, Banner[]>;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  fetchRestaurants: () => Promise<void>;
  searchRestaurants: (searchTerm: string) => Promise<Restaurant[]>;
  setSelectedRestaurant: (restaurant: Restaurant | null) => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  fetchBanners: (restaurantId?: string) => Promise<void>;
  prefetchBanners: (restaurantId?: string) => Promise<void>;
  setBannersForRestaurant: (restaurantId: string | null, banners: Banner[]) => void;
}

// Инициализация из кэша при загрузке store
const getInitialRestaurant = (): Restaurant | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cachedRestaurantStr = localStorage.getItem('cachedRestaurant');
    if (cachedRestaurantStr) {
      return JSON.parse(cachedRestaurantStr);
    }
  } catch (error) {
    console.error('Failed to parse cached restaurant:', error);
  }
  
  return null;
};

export const useStore = create<Store>((set, get) => ({
  user: null,
  restaurants: [],
  selectedRestaurant: getInitialRestaurant(),
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
      
      // Проверяем кэш любимого ресторана
      const cachedRestaurantId = typeof window !== 'undefined' 
        ? localStorage.getItem('favoriteRestaurantId') 
        : null;
      
      // Проверяем любимый ресторан из профиля пользователя
      const favoriteRestaurantId = get().user?.favoriteRestaurantId || cachedRestaurantId;
      
      if (favoriteRestaurantId) {
        const favoriteRestaurant = restaurants.find(r => r.id === favoriteRestaurantId);
        if (favoriteRestaurant) {
          set({ selectedRestaurant: favoriteRestaurant });
          // Кэшируем полную информацию о ресторане
          if (typeof window !== 'undefined') {
            localStorage.setItem('cachedRestaurant', JSON.stringify(favoriteRestaurant));
            localStorage.setItem('favoriteRestaurantId', favoriteRestaurantId);
          }
          return;
        }
      }
      
      // Автоматически выбираем первый ресторан, если не выбран
      if (!get().selectedRestaurant && restaurants.length > 0) {
        set({ selectedRestaurant: restaurants[0] });
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

  searchRestaurants: async (searchTerm: string) => {
    if (typeof window === 'undefined' || !searchTerm.trim()) return [];
    
    try {
      const response = await api.get('/restaurants', {
        params: { search: searchTerm },
      });
      const restaurantsData = response.data?.data || [];
      return restaurantsData.map((r: any) => ({
        ...r,
        id: r.id || r._id,
      })).filter((r: any): r is Restaurant => typeof r.id === 'string' && r.id.length > 0);
    } catch (error: any) {
      console.error('Failed to search restaurants:', error);
      return [];
    }
  },

  setSelectedRestaurant: (restaurant) => {
    if (restaurant && typeof window !== 'undefined') {
      // Кэшируем выбранный ресторан
      localStorage.setItem('cachedRestaurant', JSON.stringify(restaurant));
      localStorage.setItem('favoriteRestaurantId', restaurant.id);
    }
    set({ selectedRestaurant: restaurant });
  },

  fetchProfile: async () => {
    if (typeof window === 'undefined') return;
    
    try {
      const response = await api.get('/profile');
      const userData = response.data.data;
      set({ user: userData });
      
      // Если у пользователя есть любимый ресторан, кэшируем его
      if (userData.favoriteRestaurant) {
        const favoriteRestaurant = userData.favoriteRestaurant;
        localStorage.setItem('cachedRestaurant', JSON.stringify(favoriteRestaurant));
        localStorage.setItem('favoriteRestaurantId', favoriteRestaurant.id);
        
        // Автоматически выбираем любимый ресторан, если он еще не выбран
        if (!get().selectedRestaurant || get().selectedRestaurant?.id !== favoriteRestaurant.id) {
          set({ selectedRestaurant: favoriteRestaurant });
        }
      }
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
      
      // Если обновлен любимый ресторан, кэшируем его и выбираем
      if (userData.favoriteRestaurant) {
        const favoriteRestaurant = userData.favoriteRestaurant;
        if (typeof window !== 'undefined') {
          localStorage.setItem('cachedRestaurant', JSON.stringify(favoriteRestaurant));
          localStorage.setItem('favoriteRestaurantId', favoriteRestaurant.id);
        }
        set({ selectedRestaurant: favoriteRestaurant });
      } else if (data.favoriteRestaurantId === null || data.favoriteRestaurantId === '') {
        // Если любимый ресторан удален, очищаем кэш
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cachedRestaurant');
          localStorage.removeItem('favoriteRestaurantId');
        }
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error);
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
