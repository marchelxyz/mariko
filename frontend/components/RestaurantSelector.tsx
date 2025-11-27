import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';

interface RestaurantSelectorProps {
  onConfirm: (restaurantId: string) => void;
}

export default function RestaurantSelector({ onConfirm }: RestaurantSelectorProps) {
  const { restaurants, setSelectedRestaurant } = useStore();
  const [defaultRestaurant, setDefaultRestaurant] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    // Выбираем первый ресторан по умолчанию
    if (restaurants.length > 0 && !defaultRestaurant) {
      setDefaultRestaurant(restaurants[0].id);
    }
  }, [restaurants, defaultRestaurant]);

  const handleConfirm = () => {
    if (defaultRestaurant) {
      const restaurant = restaurants.find(r => r.id === defaultRestaurant);
      if (restaurant) {
        setSelectedRestaurant(restaurant);
        onConfirm(defaultRestaurant);
      }
    }
  };

  const handleSelectOther = () => {
    setShowList(true);
  };

  const handleSelectRestaurant = (restaurantId: string) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    if (restaurant) {
      setSelectedRestaurant(restaurant);
      onConfirm(restaurantId);
    }
  };

  if (!defaultRestaurant || restaurants.length === 0) {
    return null;
  }

  const restaurant = restaurants.find(r => r.id === defaultRestaurant);

  if (!restaurant) {
    return null;
  }

  // Если показываем список ресторанов
  if (showList) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl max-h-[80vh] overflow-y-auto">
          <h3 className="text-xl font-semibold mb-4 text-center">
            Выберите ресторан
          </h3>
          <div className="space-y-2">
            {restaurants.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelectRestaurant(r.id)}
                className="w-full text-left p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-200"
              >
                <div className="text-lg font-medium text-gray-900 mb-1">
                  {r.name}
                </div>
                <div className="text-sm text-gray-600">
                  {r.city}, {r.address}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Основной popup с вопросом
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h3 className="text-xl font-semibold mb-4 text-center">
          Это ваш ресторан?
        </h3>
        <div className="mb-6">
          <div className="text-lg font-medium text-gray-900 mb-1">
            {restaurant.name}
          </div>
          <div className="text-sm text-gray-600">
            {restaurant.city}, {restaurant.address}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleConfirm}
            className="bg-primary text-white px-4 py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors"
          >
            Да, верно
          </button>
          <button
            onClick={handleSelectOther}
            className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Выбрать другой
          </button>
        </div>
      </div>
    </div>
  );
}
