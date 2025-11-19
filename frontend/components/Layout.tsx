import { ReactNode } from 'react';
import BottomNavigation from './BottomNavigation';
import SideNavigation from './SideNavigation';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-0 sm:pl-32">
      <SideNavigation />
      {children}
      <BottomNavigation />
    </div>
  );
}
