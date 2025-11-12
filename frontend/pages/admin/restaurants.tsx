import { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import { useStore } from '@/store/useStore';
import api from '@/lib/api';

interface Restaurant {
  id: string;
  name: string;
  city: string;
  address: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminRestaurants() {
  const { user } = useStore();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    address: '',
    phoneNumber: '',
    isActive: true,
  });

  const fetchRestaurants = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/admin/restaurants');
      setRestaurants(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch restaurants:', error);
      alert('Не удалось загрузить рестораны');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchRestaurants();
    }
  }, [user, fetchRestaurants]);

  // Проверка прав доступа
  if (typeof window !== 'undefined' && (!user || user.role !== 'admin')) {
    return (
      <Layout>
        <div className="px-4 py-6">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-text-primary">Доступ запрещен. Только для администраторов.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const handleCreate = () => {
    setEditingRestaurant(null);
    setFormData({
      name: '',
      city: '',
      address: '',
      phoneNumber: '',
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const handleEdit = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setFormData({
      name: restaurant.name,
      city: restaurant.city,
      address: restaurant.address,
      phoneNumber: restaurant.phoneNumber,
      isActive: restaurant.isActive,
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите деактивировать этот ресторан?')) {
      return;
    }

    try {
      await api.delete(`/admin/restaurants/${id}`);
      fetchRestaurants();
    } catch (error) {
      console.error('Failed to delete restaurant:', error);
      alert('Не удалось деактивировать ресторан');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingRestaurant) {
        await api.put(`/admin/restaurants/${editingRestaurant.id}`, formData);
      } else {
        await api.post('/admin/restaurants', formData);
      }
      setIsFormOpen(false);
      fetchRestaurants();
    } catch (error: any) {
      console.error('Failed to save restaurant:', error);
      const errorMessage = error?.response?.data?.message || 'Не удалось сохранить ресторан';
      alert(errorMessage);
    }
  };

  const handleToggleActive = async (restaurant: Restaurant) => {
    try {
      await api.put(`/admin/restaurants/${restaurant.id}`, {
        ...restaurant,
        isActive: !restaurant.isActive,
      });
      fetchRestaurants();
    } catch (error) {
      console.error('Failed to toggle restaurant:', error);
      alert('Не удалось изменить статус ресторана');
    }
  };

  return (
    <Layout>
      <Header title="Управление ресторанами" />
      <div className="px-4 py-6">
        <div className="mb-4 flex justify-between items-center">
          <p className="text-sm text-text-secondary">
            Управление ресторанами и их статусом активности
          </p>
          <button
            onClick={handleCreate}
            className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            + Добавить ресторан
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-text-secondary">Загрузка...</p>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-text-secondary">Рестораны не найдены</p>
          </div>
        ) : (
          <div className="space-y-4">
            {restaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                className="bg-white rounded-lg shadow-sm p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-text-primary text-lg">
                        {restaurant.name}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        restaurant.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {restaurant.isActive ? 'Активен' : 'Неактивен'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-text-secondary">
                      <p>
                        <span className="font-medium">Город:</span> {restaurant.city}
                      </p>
                      <p>
                        <span className="font-medium">Адрес:</span> {restaurant.address}
                      </p>
                      <p>
                        <span className="font-medium">Телефон:</span> {restaurant.phoneNumber}
                      </p>
                    </div>
                  </div>

                  {/* Кнопки управления */}
                  <div className="ml-4 flex flex-col gap-2">
                    <button
                      onClick={() => handleEdit(restaurant)}
                      className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors whitespace-nowrap"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleToggleActive(restaurant)}
                      className={`px-3 py-1.5 rounded text-sm transition-colors whitespace-nowrap ${
                        restaurant.isActive
                          ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {restaurant.isActive ? 'Деактивировать' : 'Активировать'}
                    </button>
                    <button
                      onClick={() => handleDelete(restaurant.id)}
                      className="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors whitespace-nowrap"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Модальное окно формы */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-text-primary">
                    {editingRestaurant ? 'Редактировать ресторан' : 'Добавить ресторан'}
                  </h2>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="text-text-secondary hover:text-text-primary text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Название ресторана *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Например: Жуковский"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Город *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Например: Жуковский"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Адрес *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Например: Мяснищева, 1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Телефон *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Например: +7 (495) 123-45-67"
                    />
                  </div>

                  <div className="flex items-center pt-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-text-primary">Активен (ресторан будет отображаться в меню выбора)</span>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      {editingRestaurant ? 'Сохранить изменения' : 'Добавить ресторан'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="flex-1 bg-gray-200 text-text-primary py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
