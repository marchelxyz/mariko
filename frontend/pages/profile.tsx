import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import { useStore } from '@/store/useStore';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '@/lib/api';

interface Restaurant {
  id: string;
  name: string;
  city: string;
  address: string;
  phoneNumber: string;
}

export default function Profile() {
  const { user, fetchProfile, updateProfile, searchRestaurants } = useStore();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    favoriteRestaurantId: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [restaurantSearchTerm, setRestaurantSearchTerm] = useState('');
  const [restaurantSuggestions, setRestaurantSuggestions] = useState<Restaurant[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || '',
        dateOfBirth: user.dateOfBirth ? format(new Date(user.dateOfBirth), 'yyyy-MM-dd') : '',
        gender: user.gender || '',
        favoriteRestaurantId: user.favoriteRestaurantId || '',
      });
      if (user.favoriteRestaurant) {
        setRestaurantSearchTerm(`${user.favoriteRestaurant.city}, ${user.favoriteRestaurant.address}`);
      }
    }
  }, [user]);

  // Обработка поиска ресторанов с debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (restaurantSearchTerm.trim().length >= 2 && isEditing) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        const results = await searchRestaurants(restaurantSearchTerm);
        setRestaurantSuggestions(results);
        setIsSearching(false);
        setShowSuggestions(true);
      }, 300);
    } else {
      setRestaurantSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [restaurantSearchTerm, isEditing, searchRestaurants]);

  // Закрытие подсказок при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleRestaurantSelect = (restaurant: Restaurant) => {
    setFormData({ ...formData, favoriteRestaurantId: restaurant.id });
    setRestaurantSearchTerm(`${restaurant.city}, ${restaurant.address}`);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile(formData);
    setIsEditing(false);
  };

  return (
    <Layout>
      <Header title="Профиль" showLogo />
      <div className="px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
              {user?.photoUrl ? (
                <Image 
                  src={user.photoUrl} 
                  alt={`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Пользователь'}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">👤</span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                {user?.firstName || 'Пользователь'} {user?.lastName || ''}
              </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                ФИО
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  placeholder="Имя"
                />
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  placeholder="Фамилия"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Дата рождения
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Пол
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
              >
                <option value="">Не указан</option>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
                <option value="other">Другой</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Номер телефона
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                placeholder="+7 (999) 999-99-99"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Любимый ресторан
              </label>
              <div className="relative" ref={suggestionsRef}>
                <input
                  type="text"
                  value={restaurantSearchTerm}
                  onChange={(e) => {
                    setRestaurantSearchTerm(e.target.value);
                    if (!e.target.value) {
                      setFormData({ ...formData, favoriteRestaurantId: '' });
                    }
                  }}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  placeholder="Введите адрес или город"
                />
                {isSearching && (
                  <div className="absolute right-3 top-2.5">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  </div>
                )}
                {showSuggestions && restaurantSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {restaurantSuggestions.map((restaurant) => (
                      <button
                        key={restaurant.id}
                        type="button"
                        onClick={() => handleRestaurantSelect(restaurant)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
                      >
                        <div className="font-medium text-text-primary">{restaurant.city}</div>
                        <div className="text-sm text-gray-600">{restaurant.address}</div>
                      </button>
                    ))}
                  </div>
                )}
                {showSuggestions && !isSearching && restaurantSearchTerm.length >= 2 && restaurantSuggestions.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg px-4 py-2 text-text-primary">
                    Рестораны не найдены
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-text-secondary px-4 py-2 rounded-md font-medium"
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      if (user) {
                        setFormData({
                          firstName: user.firstName || '',
                          lastName: user.lastName || '',
                          phoneNumber: user.phoneNumber || '',
                          dateOfBirth: user.dateOfBirth ? format(new Date(user.dateOfBirth), 'yyyy-MM-dd') : '',
                          gender: user.gender || '',
                          favoriteRestaurantId: user.favoriteRestaurantId || '',
                        });
                        if (user.favoriteRestaurant) {
                          setRestaurantSearchTerm(`${user.favoriteRestaurant.city}, ${user.favoriteRestaurant.address}`);
                        } else {
                          setRestaurantSearchTerm('');
                        }
                      }
                    }}
                    className="flex-1 bg-gray-300 text-text-primary px-4 py-2 rounded-md font-medium"
                  >
                    Отмена
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full bg-primary text-text-secondary px-4 py-2 rounded-md font-medium"
                >
                  Редактировать
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
