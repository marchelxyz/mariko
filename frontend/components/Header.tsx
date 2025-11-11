import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';

interface HeaderProps {
  title?: string;
  showLogo?: boolean;
}

export default function Header({ title, showLogo = false }: HeaderProps) {
  const { selectedRestaurant, restaurants, setSelectedRestaurant } = useStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="bg-primary text-text-secondary px-4 py-3 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        {showLogo && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-primary text-lg font-bold">M</span>
            </div>
          </div>
        )}
        <h1 className="text-lg font-bold flex-1 text-center">
          {title || 'Марико'}
        </h1>
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="text-sm bg-white/20 px-3 py-1 rounded-md hover:bg-white/30"
          >
            {selectedRestaurant?.city || 'Выбрать'}
          </button>
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50">
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
