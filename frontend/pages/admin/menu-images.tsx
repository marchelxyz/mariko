import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import { useStore } from '@/store/useStore';
import api from '@/lib/api';

interface DishImage {
  id: string;
  imageUrl: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminMenuImages() {
  const { user } = useStore();
  const [images, setImages] = useState<DishImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<DishImage | null>(null);
  const [formData, setFormData] = useState({
    imageUrl: '',
    name: '',
  });
  const [bulkUrls, setBulkUrls] = useState('');
  const [isBulkMode, setIsBulkMode] = useState(false);

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/dish-images');
      setImages(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch dish images:', error);
      alert('Не удалось загрузить изображения');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'manager')) {
      fetchImages();
    }
  }, [user, fetchImages]);

  // Проверка прав доступа
  if (typeof window !== 'undefined' && (!user || !['admin', 'manager'].includes(user.role))) {
    return (
      <Layout>
        <div className="px-4 py-6">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-text-primary">Доступ запрещен. Только для администраторов и менеджеров.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const handleCreate = () => {
    setEditingImage(null);
    setFormData({
      imageUrl: '',
      name: '',
    });
    setIsBulkMode(false);
    setBulkUrls('');
    setIsFormOpen(true);
  };

  const handleBulkCreate = () => {
    setEditingImage(null);
    setFormData({
      imageUrl: '',
      name: '',
    });
    setIsBulkMode(true);
    setBulkUrls('');
    setIsFormOpen(true);
  };

  const handleEdit = (image: DishImage) => {
    setEditingImage(image);
    setFormData({
      imageUrl: image.imageUrl,
      name: image.name || '',
    });
    setIsBulkMode(false);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить это изображение?')) {
      return;
    }

    try {
      await api.delete(`/dish-images/${id}`);
      fetchImages();
    } catch (error) {
      console.error('Failed to delete image:', error);
      alert('Не удалось удалить изображение');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isBulkMode) {
        // Массовая загрузка
        const urls = bulkUrls
          .split('\n')
          .map(url => url.trim())
          .filter(url => url.length > 0);
        
        if (urls.length === 0) {
          alert('Введите хотя бы одну ссылку');
          return;
        }

        const imagesData = urls.map(url => ({ imageUrl: url }));
        await api.post('/dish-images/bulk', { images: imagesData });
      } else if (editingImage) {
        // Редактирование (но API не поддерживает редактирование, только создание/удаление)
        alert('Редактирование изображений пока не поддерживается. Удалите и создайте заново.');
        return;
      } else {
        // Создание одного изображения
        await api.post('/dish-images', formData);
      }
      setIsFormOpen(false);
      fetchImages();
    } catch (error: any) {
      console.error('Failed to save image:', error);
      const errorMessage = error?.response?.data?.message || 'Не удалось сохранить изображение';
      alert(errorMessage);
    }
  };

  return (
    <Layout>
      <Header title="Изображения блюд" />
      <div className="px-4 py-6">
        <div className="mb-4">
          <p className="text-sm text-text-secondary mb-4">
            Управление изображениями блюд. Изображения добавляются по ссылкам (URL). 
            После добавления изображения можно связать с конкретными блюдами в меню.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              + Добавить изображение
            </button>
            <button
              onClick={handleBulkCreate}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              + Массовая загрузка
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-text-secondary">Загрузка...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-text-secondary">Изображения не найдены</p>
            <p className="text-xs text-text-secondary mt-2">
              Добавьте изображения по ссылкам (URL)
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                {/* Превью изображения */}
                <div className="w-full bg-gray-100 relative" style={{ aspectRatio: '1/1' }}>
                  <Image
                    src={image.imageUrl}
                    alt={image.name || 'Изображение блюда'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    unoptimized
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><span class="text-2xl">🖼️</span></div>';
                      }
                    }}
                  />
                </div>

                {/* Информация об изображении */}
                <div className="p-4">
                  {image.name && (
                    <h3 className="font-semibold text-text-primary mb-2 truncate">
                      {image.name}
                    </h3>
                  )}
                  <p className="text-xs text-text-secondary mb-3 break-all">
                    {image.imageUrl}
                  </p>
                  <div className="text-xs text-text-secondary mb-3">
                    Добавлено: {new Date(image.createdAt).toLocaleDateString('ru-RU')}
                  </div>

                  {/* Кнопки управления */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(image.id);
                        alert('ID изображения скопирован в буфер обмена');
                      }}
                      className="flex-1 px-3 py-1.5 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
                      title="Скопировать ID"
                    >
                      ID
                    </button>
                    <button
                      onClick={() => handleDelete(image.id)}
                      className="flex-1 px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
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
                    {isBulkMode 
                      ? 'Массовая загрузка изображений' 
                      : editingImage 
                        ? 'Редактировать изображение' 
                        : 'Добавить изображение'}
                  </h2>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="text-text-secondary hover:text-text-primary text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {isBulkMode ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          Ссылки на изображения (по одной на строку) *
                        </label>
                        <textarea
                          required
                          value={bulkUrls}
                          onChange={(e) => setBulkUrls(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg&#10;https://example.com/image3.jpg"
                          rows={8}
                        />
                        <p className="text-xs text-text-secondary mt-1">
                          Введите ссылки на изображения, каждую с новой строки
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          URL изображения *
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
                            <p className="text-xs text-text-secondary mb-2">Превью:</p>
                            <div className="w-32 h-32 bg-gray-100 rounded overflow-hidden relative">
                              <Image
                                src={formData.imageUrl}
                                alt="Preview"
                                fill
                                className="object-cover"
                                sizes="128px"
                                unoptimized
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          Название (опционально)
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Например: Салат Цезарь"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      {isBulkMode 
                        ? 'Загрузить изображения' 
                        : editingImage 
                          ? 'Сохранить изменения' 
                          : 'Добавить изображение'}
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
