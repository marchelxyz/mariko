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
  const { selectedRestaurant, restaurants, setSelectedRestaurant, isLoading } = useStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/');
    }
  };

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
            className="w-full bg-accent text-text-secondary py-2 px-4 rounded-[10px] text-left hover:opacity-90 transition-opacity"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] opacity-75 whitespace-nowrap">Адрес ресторана</span>
              <span className="text-sm">{selectedRestaurant ? `${selectedRestaurant.city}, ${selectedRestaurant.address}` : 'Выбрать ресторан'}</span>
            </div>
          </button>
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[10px] shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
              <div className="py-1">
                {isLoading ? (
                  <div className="px-4 py-2 text-text-primary text-center">Загрузка ресторанов...</div>
                ) : restaurants.length === 0 ? (
                  <div className="px-4 py-2 text-text-primary text-center">Рестораны не найдены</div>
                ) : (
                  restaurants.map((restaurant) => (
                    <button
                      key={restaurant.id}
                      onClick={() => {
                        setSelectedRestaurant(restaurant);
                        setIsDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-text-primary hover:bg-gray-100 transition-colors"
                    >
                      <div className="font-medium">{restaurant.city}</div>
                      <div className="text-sm text-gray-600">{restaurant.address}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
