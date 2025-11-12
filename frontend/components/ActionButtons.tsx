import { useRouter } from 'next/router';

export default function ActionButtons() {
  const router = useRouter();

  // SVG иконки цветом #8E1A1A
  const BellIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="#8E1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="#8E1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CarIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 17H19L18 9H6L5 17ZM5 17H3C2.45 17 2 16.55 2 16V14C2 13.45 2.45 13 3 13H5M19 17H21C21.55 17 22 16.55 22 16V14C22 13.45 21.55 13 21 13H19" stroke="#8E1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 13L5 8H19L17 13" stroke="#8E1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="7.5" cy="17.5" r="1.5" fill="#8E1A1A"/>
      <circle cx="16.5" cy="17.5" r="1.5" fill="#8E1A1A"/>
    </svg>
  );

  const StarIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#8E1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const MapPinIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.03 7.03 1 12 1C16.97 1 21 5.03 21 10Z" stroke="#8E1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="10" r="3" stroke="#8E1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
          <button
            key={index}
            onClick={action.action}
            className="bg-[#F7F7F7] rounded-[10px] p-3 flex flex-col items-center justify-center space-y-2 hover:opacity-90 transition-opacity aspect-square"
          >
            <div className="flex items-center justify-center">
              {action.icon}
            </div>
            <span className="text-xs font-medium text-[#000000] text-center leading-tight">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
