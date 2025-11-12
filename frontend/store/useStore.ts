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

interface Restaurant {
  id: string;
  _id?: string;
  name: string;
  city: string;
  address: string;
  phoneNumber: string;
}

interface Store {
  user: User | null;
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  fetchRestaurants: () => Promise<void>;
  setSelectedRestaurant: (restaurant: Restaurant | null) => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export const useStore = create<Store>((set, get) => ({
  user: null,
  restaurants: [],
  selectedRestaurant: null,
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
      const restaurants = response.data.data.map((r: Restaurant) => ({
        ...r,
        id: r.id || r._id,
      }));
      set({ restaurants, isLoading: false });
      
      // Автоматически выбираем первый ресторан, если не выбран
      if (!get().selectedRestaurant && restaurants.length > 0) {
        set({ selectedRestaurant: restaurants[0] });
      }
    } catch (error: any) {
      console.error('Failed to fetch restaurants:', error);
      set({ 
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
}));
