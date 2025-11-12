import { useRouter } from 'next/router';

export default function BottomNavigation() {
  const router = useRouter();

  const navItems = [
    { path: '/', label: 'Главная', icon: '🏡' },
    { path: '/franchise', label: 'Франшиза', icon: '💼' },
    { path: '/profile', label: 'Профиль', icon: '👤' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              router.pathname === item.path
                ? 'text-primary'
                : 'text-gray-500'
            }`}
          >
            <span className="text-2xl mb-1">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
