import { useRouter } from 'next/router';

export default function ActionButtons() {
  const router = useRouter();

  // SVG иконки залитые цветом #8E1A1A, более округлые и крупные
  const BellIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" fill="#8E1A1A" strokeLinejoin="round" strokeLinecap="round"/>
      <ellipse cx="12" cy="21" rx="2" ry="1.5" fill="#8E1A1A"/>
    </svg>
  );

  const CarIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="13" width="14" height="4" rx="2" fill="#8E1A1A"/>
      <rect x="3" y="13" width="2" height="4" rx="1" fill="#8E1A1A"/>
      <rect x="19" y="13" width="2" height="4" rx="1" fill="#8E1A1A"/>
      <path d="M7 13L5.5 9H18.5L17 13" fill="#8E1A1A" strokeLinejoin="round"/>
      <circle cx="7.5" cy="17.5" r="1.8" fill="#FFFFFF"/>
      <circle cx="16.5" cy="17.5" r="1.8" fill="#FFFFFF"/>
    </svg>
  );

  const StarIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.5L14.2 7.2L19.2 7.8L15.5 11.2L16.5 16.2L12 13.8L7.5 16.2L8.5 11.2L4.8 7.8L9.8 7.2L12 2.5Z" fill="#8E1A1A" stroke="#8E1A1A" strokeWidth="0.2" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );

  const MapPinIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.03 7.03 1 12 1C16.97 1 21 5.03 21 10Z" fill="#8E1A1A"/>
      <circle cx="12" cy="10" r="3.5" fill="#FFFFFF"/>
    </svg>
  );

  const actions = [
    { label: 'Бронь столика', icon: <BellIcon />, action: () => alert('Бронь столика') },
    { label: 'Заказать доставку', icon: <CarIcon />, action: () => alert('Заказать доставку') },
    { label: 'Оставить отзыв', icon: <StarIcon />, action: () => alert('Оставить отзыв') },
    { label: 'Как нас найти', icon: <MapPinIcon />, action: () => alert('Как нас найти') },
  ];

  return (
    <div className="bg-white px-4 py-4">
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action, index) => (
          <div key={index} className="flex flex-col items-center">
            <button
              onClick={action.action}
              className="bg-[#F7F7F7] rounded-[10px] p-3 flex items-center justify-center hover:opacity-90 transition-opacity aspect-square w-full"
            >
              <div className="flex items-center justify-center">
                {action.icon}
              </div>
            </button>
            <span className="text-xs font-medium text-[#000000] text-center leading-tight mt-2">
              {action.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
