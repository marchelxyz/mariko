import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';

const baseNavItems = [
    { 
      path: '/', 
      label: 'Главная', 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      path: '/franchise', 
      label: 'Франшиза', 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 21H21M4 21V7L12 3L20 7V21M4 21H20M9 9V21M15 9V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      path: '/profile', 
      label: 'Профиль', 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
];

const adminNavItem = {
  path: '/admin',
  label: 'Админ',
  icon: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 15C15.866 15 19 11.866 19 8C19 4.13401 15.866 1 12 1C8.13401 1 5 4.13401 5 8C5 11.866 8.13401 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.21 13.89L7 23L12 20L17 23L15.79 13.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
};

export default function BottomNavigation() {
  const router = useRouter();
  const { user, selectedRestaurant, prefetchBanners } = useStore();
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 30 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [enableTransition, setEnableTransition] = useState(false);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const isInitializedRef = useRef(false);
  const previousIndexRef = useRef<number>(-1);
  const currentLeftRef = useRef<number>(0);

  // Формируем список пунктов меню в зависимости от роли пользователя
  const navItems = [
    ...baseNavItems,
    // Добавляем админский пункт меню, если пользователь админ
    ...(user && ['admin', 'ADMIN'].includes(user.role) ? [adminNavItem] : [])
  ];

  useEffect(() => {
    const updateIndicator = (attempt = 0) => {
      const activeIndex = navItems.findIndex(item => router.pathname === item.path);
      if (activeIndex !== -1 && buttonRefs.current[activeIndex]) {
        const button = buttonRefs.current[activeIndex];
        const container = button?.parentElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const buttonRect = button.getBoundingClientRect();
          
          // Проверяем, что кнопка действительно отрисована (имеет валидные размеры)
          if (buttonRect.width > 0 && containerRect.width > 0) {
            const newLeft = buttonRect.left - containerRect.left + (buttonRect.width / 2) - 15;
            
            if (!isInitializedRef.current) {
              // При первой инициализации устанавливаем позицию без анимации
              setIndicatorStyle({ left: newLeft, width: 30 });
              currentLeftRef.current = newLeft;
              setIsInitialized(true);
              isInitializedRef.current = true;
              previousIndexRef.current = activeIndex;
            } else {
              // При последующих изменениях применяем анимацию
              if (previousIndexRef.current !== activeIndex) {
                // Читаем текущую позицию индикатора из DOM перед анимацией
                // Это гарантирует, что анимация начинается от реальной текущей позиции
                let startLeft = currentLeftRef.current;
                if (indicatorRef.current) {
                  const indicatorRect = indicatorRef.current.getBoundingClientRect();
                  const containerRectCurrent = container.getBoundingClientRect();
                  const currentLeft = indicatorRect.left - containerRectCurrent.left;
                  // Используем текущую позицию из DOM, если она валидна
                  if (currentLeft >= 0) {
                    startLeft = currentLeft;
                    currentLeftRef.current = currentLeft;
                  }
                }
                
                // Отключаем transition и устанавливаем текущую позицию синхронно
                setEnableTransition(false);
                setIndicatorStyle({ left: startLeft, width: 30 });
                
                // Затем в следующем кадре включаем transition и устанавливаем новую позицию
                requestAnimationFrame(() => {
                  setEnableTransition(true);
                  requestAnimationFrame(() => {
                    setIndicatorStyle({ left: newLeft, width: 30 });
                    currentLeftRef.current = newLeft;
                  });
                });
                previousIndexRef.current = activeIndex;
              }
            }
            return true; // Успешно обновлено
          } else if (attempt < 5) {
            // Если элементы еще не готовы, повторяем попытку
            setTimeout(() => updateIndicator(attempt + 1), 10);
          }
        }
      } else if (attempt < 5) {
        // Если кнопка еще не найдена, повторяем попытку
        setTimeout(() => updateIndicator(attempt + 1), 10);
      }
      return false;
    };

    // Используем requestAnimationFrame для первого кадра, затем setTimeout для гарантии обновления DOM
    requestAnimationFrame(() => {
      setTimeout(() => {
        updateIndicator();
      }, 0);
    });
  }, [router.pathname, navItems, user]);

  return (
    <nav className="fixed bottom-[30px] left-0 right-0" style={{ backgroundColor: '#ffffff' }}>
      <div className="flex justify-center items-center h-16 relative gap-4 overflow-hidden">
        <div 
          ref={indicatorRef}
          className={`absolute top-0 h-1 rounded-sm ${enableTransition ? 'transition-all duration-700 ease-in-out' : ''}`}
          style={{ 
            backgroundColor: '#8E1A1A',
            width: `${indicatorStyle.width}px`,
            left: `${indicatorStyle.left}px`,
          }}
        />
        {navItems.map((item, index) => {
          const isActive = router.pathname === item.path;
          const isHomePage = item.path === '/';
          
          return (
            <button
              key={item.path}
              ref={(el) => { buttonRefs.current[index] = el; }}
              onClick={() => router.push(item.path)}
              onMouseEnter={() => {
                // Предзагружаем баннеры при наведении на главную страницу
                if (isHomePage) {
                  const restaurantId = selectedRestaurant?.id;
                  prefetchBanners(restaurantId);
                }
              }}
              className="flex flex-col items-center justify-center h-full relative px-4 transition-colors duration-300"
              style={{
                color: isActive ? '#8E1A1A' : '#8E8E93'
              }}
            >
              <span className="mb-1">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
