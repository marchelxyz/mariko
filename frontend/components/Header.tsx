import { useState } from 'react';
import { useStore } from '@/store/useStore';
import Image from 'next/image';

interface HeaderProps {
  title?: string;
  showLogo?: boolean;
}

export default function Header({ title, showLogo = false }: HeaderProps) {
  const { selectedRestaurant, restaurants, setSelectedRestaurant } = useStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="bg-primary text-text-secondary rounded-b-[20px] pb-6 pt-4 px-4 sticky top-0 z-50">
      <div className="flex flex-col items-center">
        {/* Логотип по центру */}
        <div className="flex justify-center mb-5 mt-2">
          <Image
            src="/image/image 159.webp"
            alt="Logo"
            width={100}
            height={100}
            className="object-contain"
            unoptimized
          />
        </div>

        {/* Приветствие */}
        <h2 className="text-text-secondary text-lg mb-5">
          Привет, дорогой Гость!
        </h2>

        {/* Прямоугольник для выбора ресторана */}
        <div className="relative w-full max-w-md">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full bg-accent text-text-secondary py-3 px-4 rounded-[10px] text-left hover:opacity-90 transition-opacity"
          >
            {selectedRestaurant ? `${selectedRestaurant.name} - ${selectedRestaurant.city}` : 'Выбрать ресторан'}
          </button>
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[10px] shadow-lg z-50 overflow-hidden">
              <div className="py-1">
                {restaurants.map((restaurant) => (
                  <button
                    key={restaurant.id}
                    onClick={() => {
                      setSelectedRestaurant(restaurant);
                      setIsDropdownOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-text-primary hover:bg-gray-100"
                  >
                    {restaurant.name} - {restaurant.city}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
