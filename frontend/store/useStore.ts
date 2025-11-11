import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  _id: string;
  telegramId: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  role: string;
}

interface Restaurant {
  _id: string;
  id?: string;
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
    try {
      const response = await api.get('/restaurants');
      const restaurants = response.data.data.map((r: Restaurant) => ({
        ...r,
        id: r._id,
      }));
      set({ restaurants });
      
      // Автоматически выбираем первый ресторан, если не выбран
      if (!get().selectedRestaurant && restaurants.length > 0) {
        set({ selectedRestaurant: restaurants[0] });
      }
    } catch (error) {
      console.error('Failed to fetch restaurants:', error);
    }
  },

  setSelectedRestaurant: (restaurant) => set({ selectedRestaurant: restaurant }),

  fetchProfile: async () => {
    try {
      const response = await api.get('/profile');
      set({ user: response.data.data });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  },

  updateProfile: async (data) => {
    try {
      const response = await api.put('/profile', data);
      set({ user: response.data.data });
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  },
}));
