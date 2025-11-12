import { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import { useStore } from '@/store/useStore';
import api from '@/lib/api';

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  isActive: boolean;
  order: number;
  restaurantId?: string;
}

export default function AdminBanners() {
  const { user } = useStore();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    linkUrl: '',
    isActive: true,
    order: 0,
  });

  const fetchBanners = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/admin/banners');
      setBanners(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch banners:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchBanners();
    }
  }, [user, fetchBanners]);

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
    setEditingBanner(null);
    setFormData({
      title: '',
      imageUrl: '',
      linkUrl: '',
      isActive: true,
      order: banners.length,
    });
    setIsFormOpen(true);
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || '',
      isActive: banner.isActive,
      order: banner.order,
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот баннер?')) {
      return;
    }

    try {
      await api.delete(`/banners/${id}`);
      fetchBanners();
    } catch (error) {
      console.error('Failed to delete banner:', error);
      alert('Не удалось удалить баннер');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingBanner) {
        await api.put(`/banners/${editingBanner.id}`, formData);
      } else {
        await api.post('/banners', formData);
      }
      setIsFormOpen(false);
      fetchBanners();
    } catch (error) {
      console.error('Failed to save banner:', error);
      alert('Не удалось сохранить баннер');
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      await api.put(`/banners/${banner.id}`, {
        ...banner,
        isActive: !banner.isActive,
      });
      fetchBanners();
    } catch (error) {
      console.error('Failed to toggle banner:', error);
    }
  };

  return (
    <Layout>
      <Header title="Управление баннерами" />
      <div className="px-4 py-6">
        <div className="mb-4 flex justify-between items-center">
          <p className="text-sm text-text-secondary">
            Баннеры отображаются на главной странице в формате 16:9 (горизонтальный)
          </p>
          <button
            onClick={handleCreate}
            className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            + Создать баннер
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-text-secondary">Загрузка...</p>
          </div>
        ) : banners.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-text-secondary">Баннеры не найдены</p>
          </div>
        ) : (
          <div className="space-y-4">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                <div className="flex">
                  {/* Превью баннера 16:9 */}
                  <div className="w-32 flex-shrink-0 bg-gray-100 relative">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{
                        backgroundImage: banner.imageUrl ? `url(${banner.imageUrl})` : 'none',
                        aspectRatio: '16/9',
                      }}
                    >
                      {!banner.imageUrl && (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="text-2xl">🖼️</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Информация о баннере */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-text-primary mb-1">
                          {banner.title || 'Без названия'}
                        </h3>
                        {banner.linkUrl && (
                          <p className="text-sm text-text-secondary mb-2">
                            Ссылка: {banner.linkUrl}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <span className={`px-2 py-1 rounded ${
                            banner.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {banner.isActive ? 'Активен' : 'Неактивен'}
                          </span>
                          <span className="text-text-secondary">
                            Порядок: {banner.order}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Кнопки управления */}
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleEdit(banner)}
                        className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleToggleActive(banner)}
                        className={`px-3 py-1.5 rounded text-sm transition-colors ${
                          banner.isActive
                            ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        {banner.isActive ? 'Деактивировать' : 'Активировать'}
                      </button>
                      <button
                        onClick={() => handleDelete(banner.id)}
                        className="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                      >
                        Удалить
                      </button>
                    </div>
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
                    {editingBanner ? 'Редактировать баннер' : 'Создать баннер'}
                  </h2>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="text-text-secondary hover:text-text-primary"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Название *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Введите название баннера"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      URL изображения * (формат 16:9)
                    </label>
                    <input
                      type="url"
                      required
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="https://example.com/image.jpg"
                    />
                    {formData.imageUrl && (
                      <div className="mt-2">
                        <p className="text-xs text-text-secondary mb-2">Превью (16:9):</p>
                        <div className="w-32 bg-gray-100 rounded overflow-hidden">
                          <div
                            className="bg-cover bg-center"
                            style={{
                              backgroundImage: `url(${formData.imageUrl})`,
                              aspectRatio: '16/9',
                              width: '100%',
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Ссылка (опционально)
                    </label>
                    <input
                      type="url"
                      value={formData.linkUrl}
                      onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">
                        Порядок отображения
                      </label>
                      <input
                        type="number"
                        value={formData.order}
                        onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        min="0"
                      />
                    </div>

                    <div className="flex items-center pt-6">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="ml-2 text-sm text-text-primary">Активен</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      {editingBanner ? 'Сохранить изменения' : 'Создать баннер'}
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
