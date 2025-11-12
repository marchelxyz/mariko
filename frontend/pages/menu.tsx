import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import { useStore } from '@/store/useStore';
import api from '@/lib/api';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
}

const CATEGORIES = [
  'Закуски',
  'Салаты',
  'Горячее',
  'Шашлык',
  'Выпечка',
  'Напитки',
  'Бар',
  'Детское',
];

export default function Menu() {
  const router = useRouter();
  const { selectedRestaurant } = useStore();
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRestaurant?.id) {
      router.push('/');
      return;
    }

    const fetchMenu = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/menu/${selectedRestaurant.id}`);
        setMenuItems(response.data.data || {});
      } catch (error) {
        console.error('Failed to fetch menu:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [selectedRestaurant, router]);

  if (loading) {
    return (
      <Layout>
        <Header title="Меню" />
        <div className="px-4 py-6">
          <div className="text-center text-text-primary">Загрузка...</div>
        </div>
      </Layout>
    );
  }

  // Фильтруем категории, которые есть в меню
  const availableCategories = CATEGORIES.filter(
    (cat) => menuItems[cat] && menuItems[cat].length > 0
  );

  // Если выбрана категория, показываем только её, иначе показываем все
  const categoriesToShow = selectedCategory
    ? [selectedCategory]
    : availableCategories.length > 0
    ? availableCategories
    : Object.keys(menuItems).filter((cat) => menuItems[cat] && menuItems[cat].length > 0);

  return (
    <Layout>
      <Header title="Меню" />
      <div className="px-4 py-6 space-y-6">
        {/* Фильтр категорий */}
        {availableCategories.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === null
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-text-primary hover:bg-gray-200'
                }`}
              >
                Все
              </button>
              {availableCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-text-primary hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Меню */}
        {categoriesToShow.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-text-primary">Меню пока пусто</p>
          </div>
        ) : (
          categoriesToShow.map((category) => {
            const items = menuItems[category] || [];
            if (items.length === 0) return null;

            return (
              <div key={category} className="bg-white rounded-lg shadow-sm p-4">
                <h2 className="text-xl font-bold text-text-primary mb-4">{category}</h2>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start space-x-4 pb-4 border-b last:border-0"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-3xl">🍽️</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-text-primary text-lg mb-1">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        <p className="text-primary font-bold text-lg">{item.price} ₽</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Layout>
  );
}
