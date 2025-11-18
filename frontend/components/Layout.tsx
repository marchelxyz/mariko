import { ReactNode } from 'react';
import BottomNavigation from './BottomNavigation';
import SideNavigation from './SideNavigation';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0 md:pl-20">
      <SideNavigation />
      {children}
      <BottomNavigation />
    </div>
  );
}
