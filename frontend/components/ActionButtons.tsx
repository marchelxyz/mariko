import { useRouter } from 'next/router';

export default function ActionButtons() {
  const router = useRouter();

  const actions = [
    { label: 'Бронь столика', icon: '📅', action: () => alert('Бронь столика') },
    { label: 'Заказать доставку', icon: '🚚', action: () => alert('Заказать доставку') },
    { label: 'Оставить отзыв', icon: '⭐', action: () => alert('Оставить отзыв') },
    { label: 'Как нас найти', icon: '📍', action: () => alert('Как нас найти') },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={action.action}
          className="bg-white rounded-lg shadow-sm p-4 flex flex-col items-center justify-center space-y-2 hover:shadow-md transition-shadow"
        >
          <span className="text-3xl">{action.icon}</span>
          <span className="text-sm font-medium text-text-primary text-center">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
}
