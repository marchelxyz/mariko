import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

export default function BottomNavigation() {
  const router = useRouter();
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 30 });
  const [isInitialized, setIsInitialized] = useState(false);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isInitializedRef = useRef(false);
  const previousIndexRef = useRef<number>(-1);

  const navItems = [
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

  useEffect(() => {
    const updateIndicator = () => {
      const activeIndex = navItems.findIndex(item => router.pathname === item.path);
      if (activeIndex !== -1 && buttonRefs.current[activeIndex]) {
        const button = buttonRefs.current[activeIndex];
        const container = button?.parentElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const buttonRect = button.getBoundingClientRect();
          const newLeft = buttonRect.left - containerRect.left + (buttonRect.width / 2) - 15;
          
          if (!isInitializedRef.current) {
            // При первой инициализации устанавливаем позицию без анимации
            setIndicatorStyle({ left: newLeft, width: 30 });
            setIsInitialized(true);
            isInitializedRef.current = true;
            previousIndexRef.current = activeIndex;
          } else {
            // При последующих изменениях применяем анимацию
            // Убеждаемся, что текущая позиция установлена перед анимацией
            if (previousIndexRef.current !== activeIndex) {
              // Небольшая задержка для обеспечения плавной анимации от текущей позиции
              requestAnimationFrame(() => {
                setIndicatorStyle({ left: newLeft, width: 30 });
              });
              previousIndexRef.current = activeIndex;
            }
          }
        }
      }
    };

    // Небольшая задержка для первого рендера, чтобы элементы успели отрисоваться
    if (!isInitializedRef.current) {
      setTimeout(updateIndicator, 0);
    } else {
      updateIndicator();
    }
  }, [router.pathname]);

  return (
    <nav className="fixed bottom-[30px] left-0 right-0" style={{ backgroundColor: '#ffffff' }}>
      <div className="flex justify-center items-center h-16 relative gap-4">
        <div 
          className={`absolute top-0 h-1 rounded-sm ${isInitialized ? 'transition-all duration-300 ease-in-out' : ''}`}
          style={{ 
            backgroundColor: '#8E1A1A',
            width: `${indicatorStyle.width}px`,
            left: `${indicatorStyle.left}px`,
          }}
        />
        {navItems.map((item, index) => {
          const isActive = router.pathname === item.path;
          return (
            <button
              key={item.path}
              ref={(el) => { buttonRefs.current[index] = el; }}
              onClick={() => router.push(item.path)}
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
