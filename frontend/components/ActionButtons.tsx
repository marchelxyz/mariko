import { useRouter } from 'next/router';
import Image from 'next/image';

export default function ActionButtons() {
  const router = useRouter();

  const MapPinIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.03 7.03 1 12 1C16.97 1 21 5.03 21 10Z" fill="#8E1A1A"/>
      <circle cx="12" cy="10" r="3.5" fill="#FFFFFF"/>
    </svg>
  );

  const actions = [
    { label: 'Бронь столика', icon: <Image src="/image/iconBittom/Frame-2.svg" alt="Бронь столика" width={28} height={28} />, action: () => alert('Бронь столика') },
    { label: 'Заказать доставку', icon: <Image src="/image/iconBittom/Frame-1.svg" alt="Заказать доставку" width={28} height={28} />, action: () => alert('Заказать доставку') },
    { label: 'Оставить отзыв', icon: <Image src="/image/iconBittom/Frame.svg" alt="Оставить отзыв" width={28} height={28} />, action: () => alert('Оставить отзыв') },
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
