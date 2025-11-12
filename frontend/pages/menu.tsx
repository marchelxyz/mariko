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
  calories?: number;
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

  // Получаем все блюда для отображения в сетке
  const allItemsToShow: MenuItem[] = [];
  categoriesToShow.forEach((category) => {
    const items = menuItems[category] || [];
    allItemsToShow.push(...items);
  });

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

        {/* Меню в виде сетки карточек */}
        {allItemsToShow.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-text-primary">Меню пока пусто</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {allItemsToShow.map((item) => (
              <div
                key={item.id}
                className="bg-[#F7F7F7] rounded-xl p-3 flex flex-col"
              >
                {/* Фото блюда */}
                {item.imageUrl ? (
                  <div
                    className="w-full rounded-lg overflow-hidden mb-3"
                    style={{
                      aspectRatio: '4/3',
                    }}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="w-full rounded-lg bg-[#E5E5E5] flex items-center justify-center mb-3"
                    style={{
                      aspectRatio: '4/3',
                    }}
                  >
                    <span className="text-3xl">🍽️</span>
                  </div>
                )}

                {/* Цена */}
                <div className="text-sm font-bold text-black mb-1">
                  {item.price} ₽
                </div>

                {/* Название блюда */}
                <div className="text-sm font-medium text-black mb-1 line-clamp-2">
                  {item.name}
                </div>

                {/* Калорийность */}
                {item.calories && (
                  <div className="text-xs font-normal text-[rgba(27,31,59,0.4)] mt-auto">
                    {item.calories} ккал
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
