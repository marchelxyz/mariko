import { useEffect } from 'react';
import Image from 'next/image';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  calories?: number;
  ingredients?: string;
}

interface DishCardProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DishCard({ item, isOpen, onClose }: DishCardProps) {
  // Закрытие по нажатию Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Блокировка скролла при открытом модальном окне
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Кнопка закрытия */}
        <div className="sticky top-0 bg-white z-10 flex justify-end p-4 pb-2">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Закрыть"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Изображение блюда */}
        <div className="px-4 pb-4">
          {item.imageUrl ? (
            <div
              className="w-full rounded-xl overflow-hidden mb-4"
              style={{
                aspectRatio: '16/9',
                position: 'relative',
              }}
            >
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 512px"
              />
            </div>
          ) : (
            <div
              className="w-full rounded-xl bg-[#E5E5E5] flex items-center justify-center mb-4"
              style={{
                aspectRatio: '16/9',
              }}
            >
              <span className="text-6xl">🍽️</span>
            </div>
          )}
        </div>

        {/* Информация о блюде */}
        <div className="px-4 pb-6 space-y-4">
          {/* Название и цена */}
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl font-bold text-black flex-1">{item.name}</h2>
            <div className="text-2xl font-bold text-black whitespace-nowrap">
              {item.price} ₽
            </div>
          </div>

          {/* Категория */}
          {item.category && (
            <div className="inline-block px-3 py-1 bg-gray-100 rounded-full">
              <span className="text-sm font-medium text-gray-700">{item.category}</span>
            </div>
          )}

          {/* Описание */}
          {item.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Описание</h3>
              <p className="text-base text-gray-800 leading-relaxed">{item.description}</p>
            </div>
          )}

          {/* Состав блюда */}
          {item.ingredients && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Состав</h3>
              <p className="text-base text-gray-800 leading-relaxed">{item.ingredients}</p>
            </div>
          )}

          {/* Калорийность */}
          {item.calories && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-700">Калорийность:</span>
              <span className="text-base text-gray-800">{item.calories} ккал</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
