import { useState } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import Image from 'next/image';

interface HeaderProps {
  title?: string;
  showLogo?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function Header({ title, showLogo = false, showBackButton = false, onBack }: HeaderProps) {
  const { selectedRestaurant, restaurants, setSelectedRestaurant, isLoading, favoriteRestaurant, setFavoriteRestaurant, token } = useStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingFavorite, setIsSettingFavorite] = useState(false);
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/');
    }
  };

  const handleSetFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedRestaurant || !token) return;
    
    try {
      setIsSettingFavorite(true);
      // Переключаем состояние: если уже избранный, убираем, если нет - добавляем
      await setFavoriteRestaurant(selectedRestaurant.id);
    } catch (error) {
      console.error('Failed to set favorite restaurant:', error);
      alert('Не удалось установить любимый ресторан');
    } finally {
      setIsSettingFavorite(false);
    }
  };

  const isFavorite = selectedRestaurant && favoriteRestaurant?.id === selectedRestaurant.id;

  return (
    <header className="bg-primary text-text-secondary rounded-b-[20px] pb-6 pt-4 px-4 sticky top-0 z-50">
      <div className="flex flex-col items-center">
        {/* Кнопка назад и логотип */}
        <div className="flex items-center justify-between w-full max-w-md mb-5 mt-4 relative">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="absolute left-0 p-2 hover:opacity-80 transition-opacity"
              aria-label="Назад"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-white"
              >
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          {/* Логотип по центру */}
          <div className="flex justify-center flex-1">
            <Image
              src="/image/image 159.webp"
              alt="Logo"
              width={100}
              height={100}
              className="object-contain"
              unoptimized
            />
          </div>
          {/* Пустой элемент для балансировки, если есть кнопка назад */}
          {showBackButton && <div className="w-10" />}
        </div>

        {/* Приветствие */}
        <div className="w-full max-w-md mb-3">
          <h2 className="text-text-secondary text-lg font-medium text-left">
            Привет, дорогой Гость!
          </h2>
        </div>

        {/* Прямоугольник для выбора ресторана */}
        <div className="relative w-full max-w-md">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full bg-accent text-text-secondary py-2 px-4 rounded-[10px] text-left hover:opacity-90 transition-opacity relative pr-10"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] opacity-75 whitespace-nowrap">Адрес ресторана</span>
              <span className="text-sm">{selectedRestaurant ? `${selectedRestaurant.city}, ${selectedRestaurant.address}` : 'Выбрать ресторан'}</span>
            </div>
            {/* Кнопка избранного */}
            {token && selectedRestaurant && (
              <button
                onClick={handleSetFavorite}
                disabled={isSettingFavorite}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:opacity-80 transition-opacity disabled:opacity-50"
                aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                title={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill={isFavorite ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isFavorite ? 'text-yellow-400' : 'text-text-secondary'}
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            )}
          </button>
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[10px] shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
              <div className="py-1">
                {isLoading ? (
                  <div className="px-4 py-2 text-text-primary text-center">Загрузка ресторанов...</div>
                ) : restaurants.length === 0 ? (
                  <div className="px-4 py-2 text-text-primary text-center">Рестораны не найдены</div>
                ) : (
                  restaurants.map((restaurant) => {
                    const isRestaurantFavorite = favoriteRestaurant?.id === restaurant.id;
                    return (
                      <button
                        key={restaurant.id}
                        onClick={() => {
                          setSelectedRestaurant(restaurant);
                          setIsDropdownOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-text-primary hover:bg-gray-100 transition-colors relative pr-10"
                      >
                        <div className="font-medium">{restaurant.city}</div>
                        <div className="text-sm text-gray-600">{restaurant.address}</div>
                        {isRestaurantFavorite && (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
